import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { guardOwnerRoute } from '@/lib/apiGuard'
import { handleApiError, MENSAGEM_ERRO_GENERICA } from '@/lib/apiError'
import { normalizePhone } from '@/lib/phone'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/engenheiros — lista os engenheiros do chatbot. Owner only.
 */
export async function GET() {
  const guard = await guardOwnerRoute()
  if (!guard.ok) return guard.response

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('engenheiros')
      .select('eng_id, nome, telefone, exclusivo, ativo')
      .order('nome', { ascending: true })

    if (error) {
      const { status, message } = handleApiError('GET /admin/engenheiros', error)
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({ engenheiros: data ?? [] })
  } catch (error) {
    const { status, message } = handleApiError('GET /admin/engenheiros', error)
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * POST /api/admin/engenheiros — cadastra um engenheiro do chatbot.
 * Body: { nome, telefone, exclusivo? }
 */
export async function POST(request: Request) {
  const guard = await guardOwnerRoute()
  if (!guard.ok) return guard.response

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

  try {
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
      // 23505 = unique_violation (telefone já cadastrado). Mensagem própria,
      // mais útil que a genérica do toApiError para este caso.
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe um engenheiro com esse telefone.' },
          { status: 409 }
        )
      }
      const { status, message } = handleApiError(
        'POST /admin/engenheiros',
        error,
        'Não foi possível cadastrar o engenheiro. Tente novamente.'
      )
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({ engenheiro: data }, { status: 201 })
  } catch (error) {
    const { status, message } = handleApiError(
      'POST /admin/engenheiros',
      error,
      MENSAGEM_ERRO_GENERICA
    )
    return NextResponse.json({ error: message }, { status })
  }
}
