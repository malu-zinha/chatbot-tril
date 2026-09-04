import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { guardOwnerRoute } from '@/lib/apiGuard'
import { handleApiError } from '@/lib/apiError'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/users
 * Lista todos os perfis da plataforma. Só o owner ativo pode chamar.
 */
export async function GET() {
  const guard = await guardOwnerRoute()
  if (!guard.ok) return guard.response

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('user_profiles')
      .select('user_id, email, display_name, role, status, created_at')
      .order('created_at', { ascending: true })

    if (error) {
      const { status, message } = handleApiError('GET /admin/users', error)
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({ users: data ?? [] })
  } catch (error) {
    const { status, message } = handleApiError('GET /admin/users', error)
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * POST /api/admin/users
 * Cria um novo login de engenheiro (cria o usuário no Auth e o perfil).
 * Body: { email, password, display_name? }
 */
export async function POST(request: Request) {
  const guard = await guardOwnerRoute()
  if (!guard.ok) return guard.response

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

  try {
    const admin = createAdminClient()

    // 1. Cria o usuário no Auth (já confirmado, pra entrar sem verificar email).
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError || !created.user) {
      // O teste de "já existe" continua olhando a mensagem do GoTrue — mas
      // agora só como classificação interna. Quando não casa, o browser recebe
      // texto genérico em vez da mensagem crua do serviço de autenticação.
      const alreadyExists = /already|exist|registered/i.test(createError?.message ?? '')
      if (alreadyExists) {
        return NextResponse.json(
          { error: 'Já existe um usuário com esse email.' },
          { status: 409 }
        )
      }
      const { status, message } = handleApiError(
        'POST /admin/users/createUser',
        createError,
        'Não foi possível criar o login. Tente novamente.'
      )
      return NextResponse.json({ error: message }, { status })
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
        created_by: guard.owner.id,
      })
      .select('user_id, email, display_name, role, status, created_at')
      .single()

    if (profileError) {
      // Rollback: remove o usuário do Auth para não deixar órfão sem perfil.
      await admin.auth.admin.deleteUser(created.user.id)
      const { status, message } = handleApiError(
        'POST /admin/users/profile',
        profileError,
        'Não foi possível criar o login. Tente novamente.'
      )
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({ user: profile }, { status: 201 })
  } catch (error) {
    const { status, message } = handleApiError(
      'POST /admin/users',
      error,
      'Não foi possível criar o login. Tente novamente.'
    )
    return NextResponse.json({ error: message }, { status })
  }
}
