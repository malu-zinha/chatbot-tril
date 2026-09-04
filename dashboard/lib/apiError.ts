import { redactSecrets } from '@/lib/secrets'

// =====================================================
// Tradução de erro do Supabase -> resposta HTTP segura
// =====================================================
// Regra única: o browser nunca recebe `error.message` do Supabase.
//
// Durante o incidente, `NextResponse.json({ error: error.message })` levou até
// a tela do usuário a exceção
//   TypeError: Headers.set: "sb_secret_..." is an invalid header value
// ou seja, a Secret Key. O detalhe técnico agora fica só no log do servidor,
// e mesmo lá passa por redactSecrets.
//
// Funções puras, sem dependência do Next — mesmo formato de
// lib/adminAtribuicoes.ts, para permanecerem testáveis isoladamente.
// =====================================================

export interface ApiError {
  status: number
  message: string
}

export const MENSAGEM_ERRO_GENERICA = 'Não foi possível carregar os dados. Tente novamente.'
export const MENSAGEM_BANCO_INDISPONIVEL = 'Não foi possível conectar ao banco de dados.'

function errorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return ''
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : ''
}

/**
 * Mapeia um erro do Supabase/PostgREST para status + mensagem exibível.
 *
 * Só códigos conhecidos viram mensagem específica; qualquer outro cai no
 * fallback genérico. Nunca repassa texto vindo do banco.
 */
export function toApiError(error: unknown, fallback: string = MENSAGEM_ERRO_GENERICA): ApiError {
  switch (errorCode(error)) {
    case 'PGRST116':
      return { status: 404, message: 'Registro não encontrado.' }
    case '23505':
      return { status: 409, message: 'Já existe um registro com esses dados.' }
    case '23503':
      return { status: 409, message: 'Não foi possível concluir: existem registros vinculados.' }
    case '22P02':
      return { status: 400, message: 'Dados inválidos.' }
    default:
      return { status: 500, message: fallback }
  }
}

/**
 * Registra a falha no servidor com o detalhe necessário para depurar — e
 * apenas ele: escopo, código, status e mensagem já redigida.
 *
 * Antes destas rotas não logarem nada, o erro existia só no corpo da resposta.
 * Tirar o vazamento sem colocar log no lugar deixaria a falha invisível.
 */
export function logServerError(scope: string, error: unknown): void {
  const parts = [`[api] ${scope}`]

  if (error && typeof error === 'object') {
    const { code, status } = error as { code?: unknown; status?: unknown }
    if (code !== undefined && code !== null) parts.push(`code=${redactSecrets(code)}`)
    if (status !== undefined && status !== null) parts.push(`status=${redactSecrets(status)}`)
  }

  const message = redactSecrets(
    error && typeof error === 'object' && 'message' in error
      ? (error as { message?: unknown }).message
      : error
  )
  if (message) parts.push(message)

  console.error(parts.join(' | '))
}

/**
 * Atalho para os route handlers: loga e devolve `{ status, message }` seguro.
 */
export function handleApiError(
  scope: string,
  error: unknown,
  fallback: string = MENSAGEM_ERRO_GENERICA
): ApiError {
  logServerError(scope, error)
  return toApiError(error, fallback)
}
