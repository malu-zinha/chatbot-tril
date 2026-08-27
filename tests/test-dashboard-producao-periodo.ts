import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const fetchSource = readFileSync(resolve('dashboard/lib/supabase.ts'), 'utf8')
const cardSource = readFileSync(resolve('dashboard/components/ProducaoPeriodoCard.tsx'), 'utf8')
const dashboardSource = readFileSync(resolve('dashboard/components/DashboardClient.tsx'), 'utf8')

assert.match(fetchSource, /export async function fetchProducaoEngenheiroPeriodo/)
assert.match(fetchSource, /from\('retrabalho_projetos'\)/)
assert.match(fetchSource, /gte\('data_retrabalho'/)
assert.match(fetchSource, /lte\('data_retrabalho'/)
assert.match(fetchSource, /horas_trabalhadas_total/)
assert.match(fetchSource, /horas_retrabalho/)

assert.match(cardSource, /fetchProducaoEngenheiroPeriodo/)
assert.match(cardSource, /Valor da hora/)
assert.match(cardSource, /horas_trabalhadas_total \* taxa/)
assert.doesNotMatch(
  cardSource,
  /\.from\('engenheiros'\)[\s\S]*\.(insert|update|upsert)/,
  'UI must not persist hourly rate on engenheiros'
)
assert.doesNotMatch(
  fetchSource,
  /valor_hora/,
  'fetch must not persist valor_hora on engenheiros'
)

assert.match(dashboardSource, /ProducaoPeriodoCard/)
assert.match(dashboardSource, /isOwner &&/)
assert.match(
  dashboardSource,
  /profile\?\.role === 'owner'/,
  'production block must be owner-only'
)

console.log('test-dashboard-producao-periodo: OK')
