import { NextResponse } from 'next/server'
import { getOwnerOrNull } from '@/lib/supabaseServer'
import { createAdminClient, isAdminConfigured } from '@/lib/supabaseAdmin'
import { normalizePhone } from '@/lib/phone'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/engenheiros — lista os engenheiros do chatbot. Owner only.
 */
export async function GET() {
  const owner = await getOwnerOrNull()
  if (!owner) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.' },
      { status: 500 }
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('engenheiros')
    .select('eng_id, nome, telefone, exclusivo, ativo')
    .order('nome', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ engenheiros: data ?? [] })
}

/**
 * POST /api/admin/engenheiros — cadastra um engenheiro do chatbot.
 * Body: { nome, telefone, exclusivo? }
 */
export async function POST(request: Request) {
  const owner = await getOwnerOrNull()
  if (!owner) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.' },
      { status: 500 }
    )
  }

  let body: { nome?: string; telefone?: string; exclusivo?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const nome = body.nome?.trim() ?? ''
  if (!nome) {
    return NextResponse.json({ error: 'Informe o nome do engenheiro.' }, { status: 400 })
  }

  const telefone = normalizePhone(body.telefone ?? '')
  if (!telefone) {
    return NextResponse.json(
      { error: 'Telefone inválido. Use o formato +55DDDNÚMERO (ex.: +5583991234567).' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('engenheiros')
    .insert({
      nome,
      telefone,
      exclusivo: Boolean(body.exclusivo),
      ativo: true,
    })
    .select('eng_id, nome, telefone, exclusivo, ativo')
    .single()

  if (error) {
    // 23505 = unique_violation (telefone já cadastrado)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Já existe um engenheiro com esse telefone.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ engenheiro: data }, { status: 201 })
}
