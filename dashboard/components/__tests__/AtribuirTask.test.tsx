import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AtribuirTask from '@/components/AtribuirTask'

describe('AtribuirTask', () => {
  it('não quebra quando lista de engenheiros está vazia', () => {
    expect(() =>
      render(
        <AtribuirTask
          isOpen
          onClose={() => {}}
          engenheiros={[]}
          areas={[]}
          onAtribuir={() => {}}
        />
      )
    ).not.toThrow()
    expect(screen.getByText(/Selecione um engenheiro/i)).toBeInTheDocument()
  })
})
