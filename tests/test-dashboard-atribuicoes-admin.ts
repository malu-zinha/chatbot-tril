import assert from 'node:assert/strict'

const adminAtribuicoes = await import('../dashboard/lib/adminAtribuicoes.ts')

assert.equal(adminAtribuicoes.isUuid('3f078c01-04bb-4bb8-a3fa-b381f772be20'), true)
assert.equal(adminAtribuicoes.isUuid('not-a-uuid'), false)
assert.equal(adminAtribuicoes.isUuid(''), false)

assert.deepEqual(adminAtribuicoes.validateTransferirResponsavelBody({ novo_eng_id: '3f078c01-04bb-4bb8-a3fa-b381f772be20' }), {
  ok: true,
  novoEngId: '3f078c01-04bb-4bb8-a3fa-b381f772be20',
})

assert.deepEqual(adminAtribuicoes.validateTransferirResponsavelBody({ novo_eng_id: 'not-a-uuid' }), {
  ok: false,
  error: 'Engenheiro destino invalido.',
})

assert.equal(adminAtribuicoes.getAtribuicaoActionStatus({ ok: true }), 200)
assert.equal(adminAtribuicoes.getAtribuicaoActionStatus({ ok: false, codigo: 'nao_encontrada' }), 404)
assert.equal(adminAtribuicoes.getAtribuicaoActionStatus({ ok: false, codigo: 'duplicata' }), 409)
assert.equal(adminAtribuicoes.getAtribuicaoActionStatus({ ok: false, codigo: 'ultima_area' }), 409)
assert.equal(adminAtribuicoes.getAtribuicaoActionStatus({ ok: false, codigo: 'destino_invalido' }), 400)
assert.equal(adminAtribuicoes.getAtribuicaoActionStatus({ ok: false, codigo: 'erro_interno' }), 500)

assert.equal(
  adminAtribuicoes.getAtribuicaoActionMessage({
    ok: false,
    codigo: 'duplicata',
    mensagem: 'O engenheiro destino ja possui essa tarefa.',
  }),
  'O engenheiro destino ja possui essa tarefa.'
)

assert.equal(
  adminAtribuicoes.getAtribuicaoActionMessage({ ok: false, codigo: 'erro_interno' }),
  'Nao foi possivel concluir a acao.'
)

console.log('test-dashboard-atribuicoes-admin: OK')
