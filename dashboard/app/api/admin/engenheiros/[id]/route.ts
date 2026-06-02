import { NextResponse } from 'next/server'
import { getOwnerOrNull } from '@/lib/supabaseServer'
import { createAdminClient, isAdminConfigured } from '@/lib/supabaseAdmin'
import { normalizePhone } from '@/lib/phone'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PATCH /api/admin/engenheiros/[id] — edita ou ativa/desativa um engenheiro
 * do chatbot. Owner only. Desativar (ativo:false) NÃO apaga.
 * Body: { nome?, telefone?, exclusivo?, ativo? }
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const owner = await getOwnerOrNull()
  if (!owner) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.' },
      { status: 500 }
    )
  }

  let body: { nome?: string; telefone?: string; exclusivo?: boolean; ativo?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}

  if (body.nome !== undefined) {
    const nome = body.nome.trim()
    if (!nome) return NextResponse.json({ error: 'Nome não pode ficar vazio.' }, { status: 400 })
    patch.nome = nome
  }

  if (body.telefone !== undefined) {
    const telefone = normalizePhone(body.telefone)
    if (!telefone) {
      return NextResponse.json(
        { error: 'Telefone inválido. Use o formato +55DDDNÚMERO (ex.: +5583991234567).' },
        { status: 400 }
      )
    }
    patch.telefone = telefone
  }

  if (body.exclusivo !== undefined) patch.exclusivo = Boolean(body.exclusivo)
  if (body.ativo !== undefined) patch.ativo = Boolean(body.ativo)

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('engenheiros')
    .update(patch)
    .eq('eng_id', params.id)
    .select('eng_id, nome, telefone, exclusivo, ativo')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Já existe um engenheiro com esse telefone.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Engenheiro não encontrado.' }, { status: 404 })
  }

  return NextResponse.json({ engenheiro: data })
}
