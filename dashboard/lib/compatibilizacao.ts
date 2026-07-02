export interface ProjetoAreaLike {
  area_codigo?: string | null
  area_descricao: string
  instancia_label?: string | null
  engenheiro_nome?: string | null
}

export const COMPATIBILIZACAO_CODIGO = 'COMPATIBILIZACAO'
const COMPATIBILIZACAO_LABEL = 'Compatibilização'

export function isCompatibilizacaoArea(area?: {
  codigo?: string | null
  descricao?: string | null
}) {
  const codigo = area?.codigo?.trim().toUpperCase()
  const descricao = area?.descricao?.trim().toLowerCase()

  return codigo === COMPATIBILIZACAO_CODIGO || descricao === 'compatibilização'
}

export function normalizarInstanciaCompatibilizacao(
  label: string | null | undefined,
  fallbackNumero: number
) {
  const normalizado = label?.trim().replace(/\s+/g, ' ')

  if (!normalizado) return `${COMPATIBILIZACAO_LABEL} ${fallbackNumero}`
  if (normalizado.toLowerCase().startsWith(COMPATIBILIZACAO_LABEL.toLowerCase())) {
    return normalizado
  }

  return `${COMPATIBILIZACAO_LABEL} ${normalizado}`
}

export function getProjetoAreaDisplayName(item: ProjetoAreaLike) {
  const isCompatibilizacao =
    item.area_codigo?.trim().toUpperCase() === COMPATIBILIZACAO_CODIGO ||
    item.area_descricao.trim().toLowerCase() === 'compatibilização'

  if (!isCompatibilizacao) return item.area_descricao

  return item.instancia_label?.trim() || item.area_descricao
}

export function buildCompletedDisciplineKey(item: ProjetoAreaLike) {
  return `${getProjetoAreaDisplayName(item)}|${item.engenheiro_nome || ''}`
}
