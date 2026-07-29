import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve('supabase/migrations/20260729_complemento_etapas_instancias.sql')
assert.ok(existsSync(migrationPath), 'migration de etapas por instancia deve existir')

const sql = readFileSync(migrationPath, 'utf8')

assert.match(
  sql,
  /ALTER TABLE projeto_pavimentos[\s\S]*ADD COLUMN IF NOT EXISTS eng_projeto_id UUID REFERENCES engenheiros_projetos\(id\)/i,
  'projeto_pavimentos deve ganhar eng_projeto_id'
)

assert.match(
  sql,
  /ALTER TABLE projeto_etapas_globais[\s\S]*ADD COLUMN IF NOT EXISTS eng_projeto_id UUID REFERENCES engenheiros_projetos\(id\)/i,
  'projeto_etapas_globais deve ganhar eng_projeto_id'
)

assert.match(
  sql,
  /CREATE UNIQUE INDEX[\s\S]*projeto_pavimentos[\s\S]*projeto_id[\s\S]*area_id[\s\S]*eng_projeto_id[\s\S]*nome/i,
  'unicidade de pavimentos deve considerar eng_projeto_id'
)

assert.match(
  sql,
  /CREATE UNIQUE INDEX[\s\S]*projeto_etapas_globais[\s\S]*projeto_id[\s\S]*area_id[\s\S]*eng_projeto_id[\s\S]*nome/i,
  'unicidade de etapas globais deve considerar eng_projeto_id'
)

assert.match(
  sql,
  /CREATE OR REPLACE FUNCTION seed_pavimentos_etapas\(\s*p_projeto_id UUID,\s*p_area_id UUID,\s*p_eng_projeto_id UUID DEFAULT NULL\s*\)/i,
  'seed_pavimentos_etapas deve aceitar p_eng_projeto_id'
)

assert.match(
  sql,
  /IF EXISTS \([\s\S]*FROM projeto_pavimentos[\s\S]*\) OR EXISTS \([\s\S]*FROM projeto_etapas_globais/i,
  'seed deve ser idempotente considerando pavimentos e etapas globais'
)

assert.match(
  sql,
  /CREATE OR REPLACE FUNCTION configurar_pavimentos_customizados_area\(\s*p_projeto_id UUID,\s*p_area_id UUID,\s*p_pavimentos TEXT\[\],\s*p_eng_projeto_id UUID DEFAULT NULL\s*\)/i,
  'configurar_pavimentos_customizados_area deve aceitar p_eng_projeto_id'
)

assert.match(
  sql,
  /CREATE OR REPLACE FUNCTION calcular_progresso_area\(\s*p_projeto_id UUID,\s*p_area_id UUID,\s*p_eng_projeto_id UUID DEFAULT NULL\s*\)/i,
  'calcular_progresso_area deve aceitar p_eng_projeto_id'
)

assert.match(
  sql,
  /WHERE projeto_id = v_projeto_id[\s\S]*AND area_id = v_area_id[\s\S]*AND id = v_eng_projeto_id/i,
  'recalculo deve atualizar somente a atribuicao quando eng_projeto_id estiver disponivel'
)

assert.match(
  sql,
  /configurar_pavimentos_customizados_area\(v_projeto_id, p_area_id, p_pavimentos, v_eng_projeto_id\)/i,
  'RPC deve configurar etapas usando v_eng_projeto_id'
)

assert.match(
  sql,
  /PERFORM seed_pavimentos_etapas\(NEW\.projeto_id, NEW\.area_id, NEW\.id\)/i,
  'trigger de seed deve usar a instancia da atribuicao'
)

console.log('test-dashboard-complemento-etapas-instancia: OK')
