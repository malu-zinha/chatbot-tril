import { NextResponse } from 'next/server'
import { getOwnerOrNull } from '@/lib/supabaseServer'
import { createAdminClient, isAdminConfigured } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ~100 anos: efetivamente bloqueia o login enquanto o usuário está inativo.
const BAN_DURATION = '876000h'

/**
 * PATCH /api/admin/users/[id]
 * Ativa/desativa um login. Desativar NÃO apaga: marca status inactive e
 * bane no Auth (não consegue mais logar). Reativar limpa o ban.
 * Body: { status: 'active' | 'inactive' }
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  const targetId = params.id
  if (targetId === owner.id) {
    return NextResponse.json(
      { error: 'Você não pode desativar a própria conta de owner.' },
      { status: 400 }
    )
  }

  let body: { status?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const status = body.status
  if (status !== 'active' && status !== 'inactive') {
    return NextResponse.json(
      { error: "status deve ser 'active' ou 'inactive'." },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  // Garante que o alvo existe e não é outro owner (não mexer em owners).
  const { data: target, error: targetError } = await admin
    .from('user_profiles')
    .select('user_id, role')
    .eq('user_id', targetId)
    .single()

  if (targetError || !target) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
  }
  if (target.role === 'owner') {
    return NextResponse.json(
      { error: 'Não é possível alterar o status de um owner.' },
      { status: 400 }
    )
  }

  // 1. Banir / desbanir no Auth.
  const { error: banError } = await admin.auth.admin.updateUserById(targetId, {
    ban_duration: status === 'inactive' ? BAN_DURATION : 'none',
  })
  if (banError) {
    return NextResponse.json({ error: banError.message }, { status: 500 })
  }

  // 2. Atualizar o perfil.
  const { data: profile, error: updateError } = await admin
    .from('user_profiles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('user_id', targetId)
    .select('user_id, email, display_name, role, status, created_at')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ user: profile })
}
