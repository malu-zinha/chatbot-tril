export type ProjetoStatusFilter = 'all' | 'concluido' | 'em_execucao' | 'atrasado'

export interface ProjetoFilterLike {
  data_conclusao?: string | null
  percentual_andamento: number
  dias_atraso: number
}

export function isProjetoConcluido(item: ProjetoFilterLike) {
  return Boolean(item.data_conclusao) || item.percentual_andamento >= 100
}

export function projetoMatchesStatusFilter(
  item: ProjetoFilterLike,
  filterStatus: ProjetoStatusFilter
) {
  if (filterStatus === 'all') return true

  if (filterStatus === 'concluido') {
    return isProjetoConcluido(item)
  }

  if (filterStatus === 'em_execucao') {
    return !isProjetoConcluido(item)
  }

  if (filterStatus === 'atrasado') {
    return item.dias_atraso > 0
  }

  return false
}
