import { describe, it, expect } from 'vitest'
import { aggregateRetrabalhoPorProjeto } from '@/lib/supabase'

describe('aggregateRetrabalhoPorProjeto', () => {
  it('inclui engenheiros desligados na divisão', () => {
    const out = aggregateRetrabalhoPorProjeto(
      [{ projeto_id: 'p1' }, { projeto_id: 'p1' }],
      [{ projeto_id: 'p1', codigo_projeto: 'P1', cliente: 'C' }],
      [
        { projeto_id: 'p1', eng_id: 'e1' },
        { projeto_id: 'p1', eng_id: 'e2' }, // inclui inativo
      ],
    )
    expect(out).toHaveLength(1)
    expect(out[0].total_engenheiros_projeto).toBe(2)
    expect(out[0].percentual_retrabalho_projeto).toBeCloseTo(100, 1)
  })

  it('preserva projeto encerrado que teve retrabalho', () => {
    const out = aggregateRetrabalhoPorProjeto(
      [{ projeto_id: 'p2' }],
      [{ projeto_id: 'p2', codigo_projeto: 'P2', cliente: 'C' }], // projeto inativo no banco
      [{ projeto_id: 'p2', eng_id: 'e1' }],
    )
    expect(out).toHaveLength(1)
    expect(out[0].codigo_projeto).toBe('P2')
  })
})
