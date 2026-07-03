import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(
  'supabase/migrations/20260703_dashboard_retrabalho_por_engenheiro.sql'
)
const sql = readFileSync(migrationPath, 'utf8')

const viewSql = sql.match(
  /CREATE OR REPLACE VIEW vw_bloco5_retrabalho_engenheiro AS[\s\S]*?;/
)?.[0]

assert.ok(viewSql, 'migration must recreate vw_bloco5_retrabalho_engenheiro')
assert.ok(
  !viewSql.includes('vw_percentual_retrabalho_geral'),
  'per-engineer view must not reuse the global retrabalho percentage'
)
assert.match(viewSql, /COUNT\(r\.id\) FILTER \(WHERE r\.necessitou_retrabalho = true\)/)
assert.match(viewSql, /NULLIF\(COUNT\(DISTINCT ep\.projeto_id\), 0\)/)
assert.match(viewSql, /AS retrabalho_medio_percentual/)

console.log('test-dashboard-retrabalho-engenheiro-view: OK')
