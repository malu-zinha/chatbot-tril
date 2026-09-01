import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const supabaseSource = readFileSync(resolve('dashboard/lib/supabase.ts'), 'utf8')
const producaoSource = readFileSync(resolve('dashboard/lib/producaoPeriodo.ts'), 'utf8')
const cardSource = readFileSync(resolve('dashboard/components/ProducaoPeriodoCard.tsx'), 'utf8')
const migrationPath = resolve('supabase/migrations/20260901_fix_dashboard_producao_apontamentos_assignment_join.sql')

function extractInterface(source: string, name: string): string {
  const match = source.match(new RegExp(`export interface ${name} \\{[\\s\\S]*?\\n\\}`))
  assert.ok(match, `interface ${name} must exist`)
  return match[0]
}

const supabaseProducaoInterface = extractInterface(supabaseSource, 'ProducaoApontamentoPeriodo')
const producaoInterface = extractInterface(producaoSource, 'ProducaoApontamentoPeriodo')

assert.doesNotMatch(
  supabaseProducaoInterface,
  /horas_trabalhadas_total:\s*number\s*\|\s*null/,
  'supabase contract must expose coalesced worked hours as non-null number'
)
assert.doesNotMatch(
  supabaseProducaoInterface,
  /horas_retrabalho:\s*number\s*\|\s*null/,
  'supabase contract must expose coalesced rework hours as non-null number'
)
assert.doesNotMatch(
  producaoInterface,
  /horas_trabalhadas_total:\s*number\s*\|\s*null/,
  'production aggregation input must expose coalesced worked hours as non-null number'
)
assert.doesNotMatch(
  producaoInterface,
  /horas_retrabalho:\s*number\s*\|\s*null/,
  'production aggregation input must expose coalesced rework hours as non-null number'
)

assert.match(cardSource, /periodoConsultado/, 'card must keep the last consulted period separately from live inputs')
assert.match(
  cardSource,
  /const periodo = \{\s*dataInicio,\s*dataFim\s*\}/,
  'consult action must create a snapshot of the current inputs'
)
assert.match(
  cardSource,
  /setPeriodoConsultado\(periodo\)/,
  'consult action must snapshot the period used for the query'
)
assert.match(
  cardSource,
  /\{periodoConsultado\.dataInicio\}\s*a\s*\{periodoConsultado\.dataFim\}/,
  'details card must render the consulted period snapshot'
)
assert.doesNotMatch(
  cardSource,
  /\{dataInicio\}\s*a\s*\{dataFim\}/,
  'details card must not render mutable input dates after a query'
)

assert.ok(existsSync(migrationPath), 'assignment join fix migration must exist')
const migration = readFileSync(migrationPath, 'utf8')

assert.match(migration, /CREATE OR REPLACE VIEW vw_dashboard_producao_apontamentos AS/i)
assert.match(migration, /ep\.eng_id AS eng_id/)
assert.match(migration, /ep\.projeto_id AS projeto_id/)
assert.match(migration, /JOIN engenheiros e ON e\.eng_id = ep\.eng_id/)
assert.match(migration, /JOIN projetos p ON p\.projeto_id = ep\.projeto_id/)
assert.doesNotMatch(migration, /JOIN engenheiros e ON e\.eng_id = r\.eng_id/)
assert.doesNotMatch(migration, /JOIN projetos p ON p\.projeto_id = r\.projeto_id/)

console.log('test-dashboard-producao-review-feedback: OK')
