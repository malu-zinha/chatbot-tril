import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(
  'supabase/migrations/20260703_dashboard_atribuicoes_transferir_excluir.sql'
)
const sql = readFileSync(migrationPath, 'utf8')

assert.match(sql, /CREATE OR REPLACE FUNCTION transferir_atribuicao\(/)
assert.match(sql, /CREATE OR REPLACE FUNCTION desativar_atribuicao\(/)
assert.match(sql, /UPDATE engenheiros_projetos/)
assert.match(sql, /UPDATE evandro_distribuicao_tasks/)
assert.match(sql, /ep\.eng_id/)
assert.match(sql, /ep\.area_id/)
assert.match(sql, /CREATE VIEW vw_projetos_detalhado AS/)

console.log('test-dashboard-atribuicoes-migration: OK')
