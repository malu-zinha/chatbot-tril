import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProjetosTable from '@/components/ProjetosTable'

const mk = (over: any) => ({
  projeto_id: 'x', codigo_projeto: 'X', cliente: 'C',
  engenheiro_nome: 'E', area_descricao: 'A', status_descricao: '',
  percentual_andamento: 0, dias_atraso: 0, data_conclusao: null, ...over,
})

const data = [
  mk({ projeto_id: 'a', codigo_projeto: 'AAA', percentual_andamento: 100, data_conclusao: '2025-01-01' }),
  mk({ projeto_id: 'b', codigo_projeto: 'BBB', percentual_andamento: 50 }),
  mk({ projeto_id: 'c', codigo_projeto: 'CCC', percentual_andamento: 20, dias_atraso: 5 }),
]

describe('ProjetosTable filtros mutuamente exclusivos', () => {
  it('concluido inclui apenas AAA', () => {
    render(<ProjetosTable isOpen onClose={() => {}} data={data} initialFilter="concluido" />)
    expect(screen.getByText('AAA')).toBeInTheDocument()
    expect(screen.queryByText('BBB')).not.toBeInTheDocument()
    expect(screen.queryByText('CCC')).not.toBeInTheDocument()
  })
  it('em_execucao inclui apenas BBB', () => {
    render(<ProjetosTable isOpen onClose={() => {}} data={data} initialFilter="em_execucao" />)
    expect(screen.queryByText('AAA')).not.toBeInTheDocument()
    expect(screen.getByText('BBB')).toBeInTheDocument()
    expect(screen.queryByText('CCC')).not.toBeInTheDocument()
  })
  it('atrasado inclui apenas CCC', () => {
    render(<ProjetosTable isOpen onClose={() => {}} data={data} initialFilter="atrasado" />)
    expect(screen.queryByText('AAA')).not.toBeInTheDocument()
    expect(screen.queryByText('BBB')).not.toBeInTheDocument()
    expect(screen.getByText('CCC')).toBeInTheDocument()
  })
})
