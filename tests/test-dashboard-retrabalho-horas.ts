import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dashboardFiles = [
  'dashboard/lib/supabase.ts',
  'dashboard/lib/mockData.ts',
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

const mockData = readFileSync(resolve('dashboard/lib/mockData.ts'), 'utf8')
assert.match(mockData, /mockRetrabalhos[\s\S]*horas_trabalhadas_total/)
assert.match(mockData, /mockRetrabalhos[\s\S]*horas_retrabalho_total/)

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

const chart = readFileSync(resolve('dashboard/components/RetrabalhoTaxaAreaChart.tsx'), 'utf8')
assert.match(
  chart,
  /label:\s*formatEdificioDisciplina\(d,\s*true\)/,
  'chart axis label must include building name via formatEdificioDisciplina'
)
assert.match(chart, /d\.cliente/, 'chart must use cliente as building name')
assert.doesNotMatch(
  chart,
  /label:\s*`\$\{d\.codigo_projeto\} \/ \$\{d\.area_codigo\}`/,
  'chart must not use codigo/area only for the axis label'
)

console.log('test-dashboard-retrabalho-horas: OK')
