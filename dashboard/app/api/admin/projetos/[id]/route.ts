import { NextResponse } from 'next/server'
import { getOwnerOrNull } from '@/lib/supabaseServer'
import { createAdminClient, isAdminConfigured } from '@/lib/supabaseAdmin'
import {
  getAtribuicaoActionMessage,
  getAtribuicaoActionStatus,
  isAtribuicaoActionSuccess,
  isUuid,
  type AtribuicaoActionResult,
} from '@/lib/adminAtribuicoes'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * DELETE /api/admin/projetos/[id]
 * Deactivates a project and all its attributions/tasks
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const owner = await getOwnerOrNull()
  if (!owner) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY nao configurada no servidor.' },
      { status: 500 }
    )
  }

  if (!isUuid(params.id)) {
    return NextResponse.json({ error: 'Projeto invalido.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('desativar_projeto_completo', {
    p_projeto_id: params.id,
    p_origem: 'dashboard',
    p_actor_user_id: owner.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = data as AtribuicaoActionResult
  if (!isAtribuicaoActionSuccess(result)) {
    return NextResponse.json(
      { error: getAtribuicaoActionMessage(result), result },
      { status: getAtribuicaoActionStatus(result) }
    )
  }

  return NextResponse.json({ result })
}
