/**
 * Normaliza texto para busca: remove acentos, baixa caixa e apara espaços.
 * Ex.: "Elétrico" -> "eletrico", para que "eletrico" também encontre.
 */
export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // remove os acentos (marcas diacríticas)
    .toLowerCase()
    .trim()
}

/**
 * Casa um termo de busca contra vários campos, tolerante a acento e a
 * múltiplas palavras: cada palavra digitada precisa aparecer em algum
 * dos campos. Termo vazio casa com tudo.
 */
export function searchMatches(term: string, fields: unknown[]): boolean {
  const tokens = normalizeText(term).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true
  const haystack = fields.map(normalizeText).join(' ')
  return tokens.every((token) => haystack.includes(token))
}
