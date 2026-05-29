import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RetrabalhoDetalhesModal from '@/components/RetrabalhoDetalhesModal'

const areaUuid = 'a1b2c3d4-0000-0000-0000-000000000001'

describe('RetrabalhoDetalhesModal', () => {
  it('expande área quando area_id é UUID string', () => {
    render(
      <RetrabalhoDetalhesModal
        isOpen
        onClose={() => {}}
        projetoCodigo="PRJ-X"
        cliente="ACME"
        detalhes={[
          { retrabalho_id: 'r1', projeto_id: 'p', codigo_projeto: 'PRJ-X', cliente: 'ACME',
            data_retrabalho: '2025-01-01', eng_id: 'e', engenheiro_nome: 'Eng',
            motivo_retrabalho: 'Mudou requisito', area_id: areaUuid, area_codigo: 'EL', area_descricao: 'Elétrico' }
        ]}
        areasProjeto={[{ projeto_id: 'p', codigo_projeto: 'PRJ-X', cliente: 'ACME',
          area_id: areaUuid, area_codigo: 'EL', area: 'Elétrico', total_retrabalhos_area: 1 }]}
        motivosProjeto={[]}
      />
    )
    const btn = screen.getByRole('button', { name: /Elétrico/ })
    fireEvent.click(btn)
    expect(screen.getByText('Mudou requisito')).toBeInTheDocument()
  })
})
