/**
 * Normaliza o telefone pro formato que o chatbot espera (+55DDDNUMERO).
 * Aceita com/sem +, com espaços/traços/parênteses/pontos.
 * Retorna null se não der pra formar um número válido.
 */
export function normalizePhone(raw: string): string | null {
  let s = (raw || '').trim().replace(/[\s()\-.]/g, '')
  if (!s) return null
  if (!s.startsWith('+')) {
    s = '+55' + s.replace(/^0+/, '')
  }
  // +55 + DDD(2) + numero(8 ou 9) => 12 ou 13 dígitos no total.
  if (!/^\+\d{12,13}$/.test(s)) return null
  return s
}
