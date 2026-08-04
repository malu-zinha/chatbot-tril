import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve('supabase/migrations/20260729_complemento_etapas_instancias.sql')
assert.ok(existsSync(migrationPath), 'migration de etapas por instancia deve existir')

const sql = readFileSync(migrationPath, 'utf8')
const zeroUuid = '00000000-0000-0000-0000-000000000000'

function functionBody(name: string): string {
  const match = sql.match(new RegExp(`CREATE OR REPLACE FUNCTION ${name}\\([\\s\\S]*?\\$\\$ LANGUAGE plpgsql;`, 'i'))
  assert.ok(match, `funcao ${name} deve existir na migration`)
  return match[0]
}

function coalesceFilterFor(identifier: string): RegExp {
  const escapedIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(
    `COALESCE\\(${escapedIdentifier},\\s*'${zeroUuid}'::UUID\\)\\s*=\\s*COALESCE\\(p_eng_projeto_id,\\s*'${zeroUuid}'::UUID\\)`,
    'i'
  )
}

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

const ajustarResiduoPesos = functionBody('ajustar_residuo_pesos')
const calcularProgressoArea = functionBody('calcular_progresso_area')
const configurarPavimentosCustomizadosArea = functionBody('configurar_pavimentos_customizados_area')
const instanceAwareFunctions = [
  ajustarResiduoPesos,
  calcularProgressoArea,
  configurarPavimentosCustomizadosArea,
].join('\n')

assert.doesNotMatch(
  instanceAwareFunctions,
  /p_eng_projeto_id\s+IS\s+NULL\s+OR\s+(?:pp\.|peg\.)?eng_projeto_id\s*=\s*p_eng_projeto_id/i,
  'filtros por instancia nao devem tratar p_eng_projeto_id NULL como coringa'
)

assert.match(
  configurarPavimentosCustomizadosArea,
  /DELETE FROM projeto_pavimentos[\s\S]*AND COALESCE\(eng_projeto_id,\s*'00000000-0000-0000-0000-000000000000'::UUID\)\s*=\s*COALESCE\(p_eng_projeto_id,\s*'00000000-0000-0000-0000-000000000000'::UUID\)/i,
  'DELETE de pavimentos customizados deve limitar pela instancia, tratando NULL como legado'
)

assert.match(
  configurarPavimentosCustomizadosArea,
  /UPDATE projeto_etapas_globais[\s\S]*SET peso = v_peso_n1[\s\S]*AND COALESCE\(eng_projeto_id,\s*'00000000-0000-0000-0000-000000000000'::UUID\)\s*=\s*COALESCE\(p_eng_projeto_id,\s*'00000000-0000-0000-0000-000000000000'::UUID\)/i,
  'UPDATE de etapas globais customizadas deve limitar pela instancia, tratando NULL como legado'
)

assert.match(
  configurarPavimentosCustomizadosArea,
  coalesceFilterFor('pp.eng_projeto_id'),
  'checagem de progresso em pavimentos deve limitar pela instancia'
)

assert.match(
  configurarPavimentosCustomizadosArea,
  coalesceFilterFor('peg.eng_projeto_id'),
  'checagem de progresso em etapas globais deve limitar pela instancia'
)

assert.match(
  ajustarResiduoPesos,
  coalesceFilterFor('pp.eng_projeto_id'),
  'calculo do residuo deve somar pavimentos somente da instancia alvo'
)

assert.match(
  ajustarResiduoPesos,
  coalesceFilterFor('peg.eng_projeto_id'),
  'calculo do residuo deve somar etapas globais somente da instancia alvo'
)

assert.match(
  calcularProgressoArea,
  coalesceFilterFor('eng_projeto_id'),
  'calculo de progresso deve limitar estruturas pela instancia'
)

console.log('test-dashboard-complemento-etapas-instancia: OK')
