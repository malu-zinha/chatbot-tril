import { NextResponse } from 'next/server'
import { getOwnerOrNull } from '@/lib/supabaseServer'
import { createAdminClient, isAdminConfigured } from '@/lib/supabaseAdmin'
import {
  getAtribuicaoActionMessage,
  getAtribuicaoActionStatus,
  isAtribuicaoActionSuccess,
  isUuid,
  validateTransferirResponsavelBody,
  type AtribuicaoActionResult,
} from '@/lib/adminAtribuicoes'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PATCH /api/admin/atribuicoes/[id]/responsavel
 * Body: { novo_eng_id }
 */
export async function PATCH(
  request: Request,
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
    return NextResponse.json({ error: 'Tarefa invalida.' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalido.' }, { status: 400 })
  }

  const validation = validateTransferirResponsavelBody(body)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('transferir_atribuicao', {
    p_atribuicao_id: params.id,
    p_novo_eng_id: validation.novoEngId,
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
