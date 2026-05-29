import { describe, it, expect } from 'vitest'
import { computeKpis } from '@/lib/kpis'
import { dedupeProjetos } from '@/lib/dedupe'

const mk = (over: any) => ({
  projeto_id: 'x', codigo_projeto: 'X', cliente: '',
  engenheiro_nome: 'x', area_descricao: 'x', status_descricao: '',
  percentual_andamento: 0, dias_atraso: 0, data_conclusao: null, ...over,
})

describe('computeKpis', () => {
  it('classifica concluído, em execução e atrasado em buckets mutuamente exclusivos', () => {
    const projetos = [
      mk({ projeto_id: 'a', percentual_andamento: 100, data_conclusao: '2025-01-01' }),
      mk({ projeto_id: 'b', percentual_andamento: 50 }),
      mk({ projeto_id: 'c', percentual_andamento: 30, dias_atraso: 5 }),
    ] as any
    const kpis = computeKpis(projetos)
    expect(kpis.total).toBe(3)
    expect(kpis.concluidos).toBe(1)
    expect(kpis.atrasados).toBe(1)
    expect(kpis.emExecucao).toBe(1)
  })

  it('não conta como atrasado um projeto que já atingiu 100% mesmo sem data_conclusao', () => {
    // Caso real: após dedupe, percentual_andamento é média; dias_atraso é máx.
    // Um projeto cuja média virou 100 antes de a data_conclusao ser registrada
    // não pode aparecer em "atrasados" — senão atrasados+concluidos > total.
    const projetos = [
      mk({ projeto_id: 'a', percentual_andamento: 100, dias_atraso: 3, data_conclusao: null }),
    ] as any
    const kpis = computeKpis(projetos)
    expect(kpis.concluidos).toBe(1)
    expect(kpis.atrasados).toBe(0)
    expect(kpis.emExecucao).toBe(0)
  })

  it('integra com dedupeProjetos sem quebrar a soma', () => {
    const rows = [
      mk({ projeto_id: 'a', engenheiro_nome: 'A', percentual_andamento: 100, data_conclusao: '2025-01-01' }),
      mk({ projeto_id: 'a', engenheiro_nome: 'B', percentual_andamento: 100, data_conclusao: '2025-01-02' }),
      mk({ projeto_id: 'b', percentual_andamento: 50 }),
      mk({ projeto_id: 'c', percentual_andamento: 30, dias_atraso: 5 }),
    ] as any
    const projetos = dedupeProjetos(rows)
    const kpis = computeKpis(projetos)
    expect(kpis.total).toBe(3)
    expect(kpis.concluidos + kpis.atrasados + kpis.emExecucao).toBe(kpis.total)
    expect(kpis.emExecucao).toBeGreaterThanOrEqual(0)
  })

  it('retorna zeros quando não há projetos', () => {
    expect(computeKpis([])).toEqual({ total: 0, concluidos: 0, atrasados: 0, emExecucao: 0, pctMedio: 0 })
  })

  it('calcula pctMedio como média simples de percentual_andamento', () => {
    const projetos = [
      mk({ projeto_id: 'a', percentual_andamento: 100 }),
      mk({ projeto_id: 'b', percentual_andamento: 50 }),
      mk({ projeto_id: 'c', percentual_andamento: 0 }),
    ] as any
    expect(computeKpis(projetos).pctMedio).toBeCloseTo(50, 5)
  })
})
