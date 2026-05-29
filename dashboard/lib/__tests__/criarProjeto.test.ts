import { describe, it, expect } from 'vitest'
import { translateCriarProjetoResponse } from '@/lib/supabase'

describe('translateCriarProjetoResponse', () => {
  it('traduz { sucesso: false } em { success: false, error }', () => {
    const r = translateCriarProjetoResponse(
      { sucesso: false, mensagem: 'Código de projeto já existe' },
      null,
    )
    expect(r.success).toBe(false)
    expect(r.error).toBe('Código de projeto já existe')
  })

  it('retorna success com data quando sucesso=true', () => {
    const r = translateCriarProjetoResponse(
      { sucesso: true, projeto_id: 'uuid-1', codigo: 'X', cliente: 'C' },
      null,
    )
    expect(r.success).toBe(true)
    expect(r.data?.projeto_id).toBe('uuid-1')
  })

  it('traduz erro do supabase em { success: false, error }', () => {
    const r = translateCriarProjetoResponse(null, { message: 'network down' })
    expect(r.success).toBe(false)
    expect(r.error).toBe('network down')
  })
})
