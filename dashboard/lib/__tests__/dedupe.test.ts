import { describe, it, expect } from 'vitest'
import { dedupeProjetos } from '@/lib/dedupe'
import type { Projeto } from '@/lib/supabase'

const base: Omit<Projeto, 'engenheiro_nome' | 'area_descricao' | 'status_descricao' | 'percentual_andamento' | 'dias_atraso' | 'data_conclusao'> = {
  projeto_id: 'p1',
  codigo_projeto: 'PRJ-001',
  cliente: 'ACME',
}

describe('dedupeProjetos', () => {
  it('agrupa linhas pelo projeto_id mantendo o pior status', () => {
    const rows: Projeto[] = [
      { ...base, engenheiro_nome: 'A', area_descricao: 'X', status_descricao: 'Concluído', percentual_andamento: 100, dias_atraso: 0, data_conclusao: '2025-01-01' },
      { ...base, engenheiro_nome: 'B', area_descricao: 'Y', status_descricao: 'Em Andamento', percentual_andamento: 50, dias_atraso: 0, data_conclusao: null },
      { ...base, engenheiro_nome: 'C', area_descricao: 'Z', status_descricao: 'Atrasado', percentual_andamento: 10, dias_atraso: 30, data_conclusao: null },
    ]
    const out = dedupeProjetos(rows)
    expect(out).toHaveLength(1)
    expect(out[0].projeto_id).toBe('p1')
    expect(out[0].dias_atraso).toBe(30)
    expect(out[0].percentual_andamento).toBeCloseTo(53.33, 1)
  })

  it('preserva projetos sem duplicatas', () => {
    const rows: Projeto[] = [
      { ...base, projeto_id: 'p1', engenheiro_nome: 'A', area_descricao: 'X', status_descricao: 'Em Andamento', percentual_andamento: 30, dias_atraso: 0, data_conclusao: null },
      { ...base, projeto_id: 'p2', engenheiro_nome: 'B', area_descricao: 'X', status_descricao: 'Concluído', percentual_andamento: 100, dias_atraso: 0, data_conclusao: '2025-01-01' },
    ]
    expect(dedupeProjetos(rows)).toHaveLength(2)
  })

  it('retorna array vazio quando entrada é vazia', () => {
    expect(dedupeProjetos([])).toEqual([])
  })

  it('classifica como Concluído apenas quando todas linhas têm data_conclusao', () => {
    const rows: Projeto[] = [
      { ...base, engenheiro_nome: 'A', area_descricao: 'X', status_descricao: 'Concluído', percentual_andamento: 100, dias_atraso: 0, data_conclusao: '2025-01-01' },
      { ...base, engenheiro_nome: 'B', area_descricao: 'Y', status_descricao: 'Concluído', percentual_andamento: 100, dias_atraso: 0, data_conclusao: '2025-01-02' },
    ]
    const out = dedupeProjetos(rows)
    expect(out[0].data_conclusao).not.toBeNull()
    expect(out[0].percentual_andamento).toBe(100)
  })
})
