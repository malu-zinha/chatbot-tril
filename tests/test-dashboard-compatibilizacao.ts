import assert from 'node:assert/strict'

const compatibilizacao = await import('../dashboard/lib/compatibilizacao.ts')

assert.equal(
  compatibilizacao.getProjetoAreaDisplayName({
    area_codigo: 'COMPATIBILIZACAO',
    area_descricao: 'Compatibilização',
    instancia_label: 'Compatibilização 2',
  }),
  'Compatibilização 2'
)

assert.equal(
  compatibilizacao.getProjetoAreaDisplayName({
    area_codigo: 'ELETRICO',
    area_descricao: 'Elétrico',
    instancia_label: 'Compatibilização 2',
  }),
  'Elétrico'
)

assert.equal(compatibilizacao.normalizarInstanciaCompatibilizacao('', 3), 'Compatibilização 3')
assert.equal(
  compatibilizacao.normalizarInstanciaCompatibilizacao('Revisão Cliente', 4),
  'Compatibilização Revisão Cliente'
)
assert.equal(
  compatibilizacao.normalizarInstanciaCompatibilizacao('Compatibilização Final', 5),
  'Compatibilização Final'
)

assert.equal(
  compatibilizacao.buildCompletedDisciplineKey({
    area_codigo: 'COMPATIBILIZACAO',
    area_descricao: 'Compatibilização',
    instancia_label: 'Compatibilização 1',
    engenheiro_nome: 'Aline Cristina Nóbrega',
  }),
  'Compatibilização 1|Aline Cristina Nóbrega'
)

assert.equal(
  compatibilizacao.buildCompletedDisciplineKey({
    area_codigo: 'COMPATIBILIZACAO',
    area_descricao: 'Compatibilização',
    instancia_label: 'Compatibilização 2',
    engenheiro_nome: 'Aline Cristina Nóbrega',
  }),
  'Compatibilização 2|Aline Cristina Nóbrega'
)

console.log('test-dashboard-compatibilizacao: OK')
