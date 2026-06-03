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
 * Pontua o quão bem um termo casa com um conjunto de campos. Quanto maior,
 * mais relevante. Retorna 0 quando NÃO casa (deve ser filtrado fora).
 *
 * Por campo, o melhor casamento vale:
 *   4 = igual exato      (campo === termo)
 *   3 = campo começa com o termo
 *   2 = alguma palavra do campo começa com o termo
 *   1 = contém em qualquer posição
 *
 * Tolerante a acento e a múltiplas palavras: cada palavra digitada precisa
 * casar em algum campo; a pontuação é a soma do melhor casamento de cada
 * palavra. Termo vazio retorna 1 (casa com tudo, sem reordenar).
 */
export function searchScore(term: string, fields: unknown[]): number {
  const tokens = normalizeText(term).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return 1

  const normFields = fields.map(normalizeText).filter(Boolean)
  let total = 0

  for (const token of tokens) {
    let best = 0
    for (const field of normFields) {
      let score = 0
      if (field === token) score = 4
      else if (field.startsWith(token)) score = 3
      else if ((' ' + field).includes(' ' + token)) score = 2
      else if (field.includes(token)) score = 1
      if (score > best) best = score
    }
    if (best === 0) return 0 // esta palavra não casou em nenhum campo
    total += best
  }

  return total
}

/** Casa (boolean) um termo contra vários campos — tolerante a acento. */
export function searchMatches(term: string, fields: unknown[]): boolean {
  return searchScore(term, fields) > 0
}

/**
 * Filtra e ORDENA por relevância: mantém só quem casa e coloca os melhores
 * casamentos no topo. Empates preservam a ordem original (sort estável).
 * `getFields` extrai os campos buscáveis de cada item.
 */
export function filterAndRank<T>(
  items: T[],
  term: string,
  getFields: (item: T) => unknown[]
): T[] {
  return items
    .map((item) => ({ item, score: searchScore(term, getFields(item)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item)
}
