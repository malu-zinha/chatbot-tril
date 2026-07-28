import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve('supabase/migrations/20260728_retrabalho_por_horas.sql')
const sql = readFileSync(migrationPath, 'utf8')

assert.match(sql, /ADD COLUMN IF NOT EXISTS horas_trabalhadas_total NUMERIC/i)
assert.match(sql, /ADD COLUMN IF NOT EXISTS horas_retrabalho NUMERIC/i)
assert.match(sql, /horas_retrabalho <= horas_trabalhadas_total/i)

for (const motivo of [
  'Falta de informação (Construtora)',
  'Alteração de projeto (Construtora)',
  'Erro de projeto (TecPred)',
  'Projeto Suspenso',
  'Erro de comunicação',
  'Outro',
]) {
  assert.ok(sql.includes(motivo), `migration must include reason: ${motivo}`)
}

const allowedReasonConstraint = sql.match(
  /ADD CONSTRAINT chk_retrabalho_motivo_padrao[\s\S]*?\) NOT VALID/i
)?.[0]

assert.ok(allowedReasonConstraint, 'migration must define allowed rework reasons constraint')

for (const motivoAntigo of [
  'Falta de informações',
  'Mudança de requisitos',
  'Erro de dimensionamento',
]) {
  assert.ok(
    !allowedReasonConstraint.includes(motivoAntigo),
    `old reason must not remain in allowed reason list: ${motivoAntigo}`
  )
}

assert.ok(sql.includes('SUM(COALESCE(horas_retrabalho, 0)) /'))
assert.ok(sql.includes('NULLIF(SUM(COALESCE(horas_trabalhadas_total, 0)), 0)'))
assert.match(sql, /CREATE OR REPLACE FUNCTION registrar_retrabalho_dia/i)
assert.match(sql, /p_horas_trabalhadas_total NUMERIC DEFAULT NULL/i)
assert.match(sql, /p_horas_retrabalho NUMERIC DEFAULT NULL/i)

const engenheiroView = sql.match(
  /CREATE OR REPLACE VIEW vw_bloco5_retrabalho_engenheiro AS[\s\S]*?;/
)?.[0]

assert.ok(engenheiroView, 'migration must recreate vw_bloco5_retrabalho_engenheiro')
assert.ok(
  engenheiroView.indexOf('AS retrabalho_medio_percentual') <
    engenheiroView.indexOf('AS projetos_com_retrabalho'),
  'vw_bloco5_retrabalho_engenheiro must preserve retrabalho_medio_percentual before projetos_com_retrabalho'
)
assert.ok(
  engenheiroView.indexOf('AS projetos_com_retrabalho') <
    engenheiroView.indexOf('AS horas_trabalhadas_total'),
  'vw_bloco5_retrabalho_engenheiro must append hour columns after legacy columns'
)

function assertColumnOrder(viewSql: string | undefined, viewName: string, columns: string[]) {
  assert.ok(viewSql, `migration must recreate ${viewName}`)

  let previousIndex = -1
  for (const column of columns) {
    const index = viewSql.indexOf(column, previousIndex + 1)
    assert.ok(index > previousIndex, `${viewName} must keep ${column} after previous legacy columns`)
    previousIndex = index
  }
}

assertColumnOrder(
  sql.match(/CREATE OR REPLACE VIEW vw_retrabalho_geral AS[\s\S]*?;/)?.[0],
  'vw_retrabalho_geral',
  [
    'AS total_retrabalhos_geral',
    'AS total_projetos_ativos',
    'AS percentual_geral_retrabalho',
    'AS horas_trabalhadas_total',
  ]
)

assertColumnOrder(
  sql.match(/CREATE OR REPLACE VIEW vw_retrabalho_por_projeto AS[\s\S]*?;/)?.[0],
  'vw_retrabalho_por_projeto',
  [
    'AS total_retrabalhos_projeto',
    'AS total_engenheiros_projeto',
    'AS percentual_retrabalho_projeto',
    'AS horas_trabalhadas_total',
  ]
)

assertColumnOrder(
  sql.match(/CREATE OR REPLACE VIEW vw_retrabalho_taxa_area_projeto AS[\s\S]*?;/)?.[0],
  'vw_retrabalho_taxa_area_projeto',
  [
    'total_retrabalhos_area',
    'AS dias_com_registro',
    'AS taxa_retrabalho_por_dia',
    'horas_trabalhadas_total',
  ]
)

assertColumnOrder(
  sql.match(/CREATE OR REPLACE VIEW vw_retrabalho_detalhes_projeto AS[\s\S]*?;/)?.[0],
  'vw_retrabalho_detalhes_projeto',
  [
    'r.motivo_retrabalho',
    'ep.area_id',
    'AS area_codigo',
    'AS area_descricao',
    'r.horas_trabalhadas_total',
  ]
)

assertColumnOrder(
  sql.match(/CREATE OR REPLACE VIEW vw_projetos_completo AS[\s\S]*?;/)?.[0],
  'vw_projetos_completo',
  [
    'AS percentual_retrabalhos',
    'AS ultima_previsao',
    'AS ultimo_feito',
    'AS dias_atraso',
    'p.descricao',
    'ep.instancia_label',
    'AS horas_trabalhadas_total',
  ]
)

console.log('test-retrabalho-horas-migration: OK')
