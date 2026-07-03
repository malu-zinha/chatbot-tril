export interface AtribuicaoActionResult {
  ok?: boolean
  sucesso?: boolean
  codigo?: string
  mensagem?: string
  [key: string]: unknown
}

export type TransferirResponsavelValidation =
  | { ok: true; novoEngId: string }
  | { ok: false; error: string }

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && uuidRegex.test(value)
}

export function validateTransferirResponsavelBody(
  body: unknown
): TransferirResponsavelValidation {
  if (!body || typeof body !== 'object' || !('novo_eng_id' in body)) {
    return { ok: false, error: 'Informe o engenheiro destino.' }
  }

  const novoEngId = (body as { novo_eng_id?: unknown }).novo_eng_id
  if (!isUuid(novoEngId)) {
    return { ok: false, error: 'Engenheiro destino invalido.' }
  }

  return { ok: true, novoEngId }
}

export function isAtribuicaoActionSuccess(result: AtribuicaoActionResult | null | undefined) {
  return Boolean(result?.ok === true || result?.sucesso === true)
}

export function getAtribuicaoActionStatus(
  result: AtribuicaoActionResult | null | undefined
): number {
  if (isAtribuicaoActionSuccess(result)) return 200

  switch (result?.codigo) {
    case 'nao_encontrada':
      return 404
    case 'duplicata':
    case 'ultima_area':
    case 'mesmo_engenheiro':
      return 409
    case 'destino_invalido':
    case 'parametro_invalido':
      return 400
    case 'erro_interno':
      return 500
    default:
      return 500
  }
}

export function getAtribuicaoActionMessage(
  result: AtribuicaoActionResult | null | undefined
): string {
  const mensagem = typeof result?.mensagem === 'string' ? result.mensagem.trim() : ''
  return mensagem || 'Nao foi possivel concluir a acao.'
}
