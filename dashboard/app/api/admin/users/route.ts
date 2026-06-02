import { NextResponse } from 'next/server'
import { getOwnerOrNull } from '@/lib/supabaseServer'
import { createAdminClient, isAdminConfigured } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/users
 * Lista todos os perfis da plataforma. Só o owner ativo pode chamar.
 */
export async function GET() {
  const owner = await getOwnerOrNull()
  if (!owner) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.' },
      { status: 500 }
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('user_profiles')
    .select('user_id, email, display_name, role, status, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ users: data ?? [] })
}

/**
 * POST /api/admin/users
 * Cria um novo login de engenheiro (cria o usuário no Auth e o perfil).
 * Body: { email, password, display_name? }
 */
export async function POST(request: Request) {
  const owner = await getOwnerOrNull()
  if (!owner) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.' },
      { status: 500 }
    )
  }

  let body: { email?: string; password?: string; display_name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase() ?? ''
  const password = body.password ?? ''
  const displayName = body.display_name?.trim() || email.split('@')[0]

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: 'A senha precisa ter ao menos 6 caracteres.' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  // 1. Cria o usuário no Auth (já confirmado, pra entrar sem verificar email).
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError || !created.user) {
    const msg = createError?.message || 'Erro ao criar usuário.'
    const alreadyExists = /already|exist|registered/i.test(msg)
    return NextResponse.json(
      { error: alreadyExists ? 'Já existe um usuário com esse email.' : msg },
      { status: alreadyExists ? 409 : 500 }
    )
  }

  // 2. Cria o perfil correspondente (papel engenheiro, ativo).
  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .insert({
      user_id: created.user.id,
      email,
      display_name: displayName,
      role: 'engenheiro',
      status: 'active',
      created_by: owner.id,
    })
    .select('user_id, email, display_name, role, status, created_at')
    .single()

  if (profileError) {
    // Rollback: remove o usuário do Auth para não deixar órfão sem perfil.
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ user: profile }, { status: 201 })
}
