import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dashboardFiles = [
  'dashboard/lib/supabase.ts',
  'dashboard/components/RetrabalhoCard.tsx',
  'dashboard/components/RetrabalhoPorProjetoTable.tsx',
  'dashboard/components/RetrabalhoTaxaAreaChart.tsx',
]

const source = dashboardFiles
  .map((file) => readFileSync(resolve(file), 'utf8'))
  .join('\n')

assert.ok(source.includes('horas_retrabalho_total'))
assert.ok(source.includes('horas_trabalhadas_total'))
assert.ok(source.includes('percentual_retrabalho_disciplina'))

for (const textoAntigo of [
  'retrabalhos ÷ projetos',
  'retrabalhos ÷ profissionais',
  'retrabalhos ÷ engenheiros',
  'retrabalhos registrados ÷ dias',
  'retrabalhos / dia',
]) {
  assert.ok(!source.includes(textoAntigo), `dashboard must not use old formula text: ${textoAntigo}`)
}

assert.ok(source.includes('horas de retrabalho'))
assert.ok(source.includes('horas trabalhadas totais'))

console.log('test-dashboard-retrabalho-horas: OK')
