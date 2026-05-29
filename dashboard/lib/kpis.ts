import type { Projeto } from '@/lib/supabase'

export interface DashboardKpis {
  total: number
  concluidos: number
  atrasados: number
  emExecucao: number
  pctMedio: number
}

// Buckets mutuamente exclusivos com prioridade: concluido > atrasado > em execucao.
// Após dedupe, percentual_andamento é média e dias_atraso é máx; um projeto pode
// chegar a 100% antes de receber data_conclusao, então sem o guard < 100 abaixo
// a soma dos buckets ultrapassaria total.
export const isConcluido = (p: Projeto) =>
  p.data_conclusao != null || p.percentual_andamento >= 100

export const isAtrasado = (p: Projeto) =>
  p.dias_atraso > 0 && p.data_conclusao == null && p.percentual_andamento < 100

export const isEmExecucao = (p: Projeto) =>
  !isConcluido(p) && !isAtrasado(p)

export function computeKpis(projetos: Projeto[]): DashboardKpis {
  const total = projetos.length
  const concluidos = projetos.filter(isConcluido).length
  const atrasados = projetos.filter(isAtrasado).length
  const emExecucao = total - concluidos - atrasados
  const pctMedio = total > 0
    ? projetos.reduce((s, p) => s + (p.percentual_andamento ?? 0), 0) / total
    : 0
  return { total, concluidos, atrasados, emExecucao, pctMedio }
}
