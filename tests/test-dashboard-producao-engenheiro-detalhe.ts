import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type { ProducaoApontamentoPeriodo } from '../dashboard/lib/producaoPeriodo.ts'

const {
  buildProducaoPeriodo,
  getProducaoDetalheEngenheiro,
} = await import('../dashboard/lib/producaoPeriodo.ts')

const rows: ProducaoApontamentoPeriodo[] = [
  {
    eng_id: 'eng-ana',
    engenheiro: 'Ana',
    projeto_id: 'proj-a',
    codigo_projeto: 'PRJ-001',
    cliente: 'Cliente A',
    area_id: 'area-ele',
    area_codigo: 'ELE',
    area_descricao: 'Eletrico',
    instancia_label: null,
    data_retrabalho: '2026-08-01',
    horas_trabalhadas_total: 5,
    horas_retrabalho: 0,
  },
  {
    eng_id: 'eng-ana',
    engenheiro: 'Ana',
    projeto_id: 'proj-a',
    codigo_projeto: 'PRJ-001',
    cliente: 'Cliente A',
    area_id: 'area-ele',
    area_codigo: 'ELE',
    area_descricao: 'Eletrico',
    instancia_label: null,
    data_retrabalho: '2026-08-02',
    horas_trabalhadas_total: 3,
    horas_retrabalho: 1,
  },
  {
    eng_id: 'eng-ana',
    engenheiro: 'Ana',
    projeto_id: 'proj-b',
    codigo_projeto: 'PRJ-002',
    cliente: 'Cliente B',
    area_id: 'area-comp',
    area_codigo: 'COMPLEMENTO',
    area_descricao: 'Complemento',
    instancia_label: 'Complemento de Eletrico 1',
    data_retrabalho: '2026-08-03',
    horas_trabalhadas_total: 2,
    horas_retrabalho: 0.5,
  },
  {
    eng_id: 'eng-bruno',
    engenheiro: 'Bruno',
    projeto_id: 'proj-c',
    codigo_projeto: 'PRJ-003',
    cliente: 'Cliente C',
    area_id: 'area-hid',
    area_codigo: 'HID',
    area_descricao: 'Hidrossanitario',
    instancia_label: null,
    data_retrabalho: '2026-08-04',
    horas_trabalhadas_total: 4,
    horas_retrabalho: 0,
  },
]

const producao = buildProducaoPeriodo(rows)

assert.deepEqual(
  producao.resumo.map((row) => ({
    eng_id: row.eng_id,
    engenheiro: row.engenheiro,
    horas_trabalhadas_total: row.horas_trabalhadas_total,
    horas_retrabalho_total: row.horas_retrabalho_total,
  })),
  [
    {
      eng_id: 'eng-ana',
      engenheiro: 'Ana',
      horas_trabalhadas_total: 10,
      horas_retrabalho_total: 1.5,
    },
    {
      eng_id: 'eng-bruno',
      engenheiro: 'Bruno',
      horas_trabalhadas_total: 4,
      horas_retrabalho_total: 0,
    },
  ],
  'resume must include all daily hours, even when there is no rework'
)

const detalheAna = getProducaoDetalheEngenheiro(producao, 'eng-ana')

assert.ok(detalheAna, 'must return selected engineer detail')
assert.equal(detalheAna.engenheiro, 'Ana')
assert.equal(detalheAna.horas_trabalhadas_total, 10)
assert.equal(detalheAna.horas_retrabalho_total, 1.5)
assert.deepEqual(
  detalheAna.projetos.map((projeto) => projeto.codigo_projeto),
  ['PRJ-001', 'PRJ-002'],
  'projects must be ordered by worked hours descending'
)
assert.deepEqual(
  detalheAna.projetos[0].disciplinas.map((disciplina) => ({
    disciplina: disciplina.disciplina,
    horas_trabalhadas_total: disciplina.horas_trabalhadas_total,
    horas_retrabalho_total: disciplina.horas_retrabalho_total,
  })),
  [
    {
      disciplina: 'Eletrico',
      horas_trabalhadas_total: 8,
      horas_retrabalho_total: 1,
    },
  ],
  'normal areas must use area description as discipline label'
)
assert.equal(
  detalheAna.projetos[1].disciplinas[0].disciplina,
  'Complemento de Eletrico 1',
  'multi-instance assignments must prefer instancia_label'
)
assert.equal(
  getProducaoDetalheEngenheiro(producao, 'eng-bruno')?.projetos.length,
  1,
  'selected detail must only include the selected engineer projects'
)

const producaoParcial = buildProducaoPeriodo([
  {
    eng_id: 'eng-ana',
    engenheiro: 'Ana',
    projeto_id: 'proj-longo',
    codigo_projeto: 'PRJ-010',
    cliente: 'Cliente Longo',
    area_id: 'area-adm',
    area_codigo: 'ADMINISTRATIVO',
    area_descricao: 'Administrativo',
    instancia_label: null,
    data_retrabalho: '2026-07-31',
    horas_trabalhadas_total: 7,
    horas_retrabalho: 1,
  },
  {
    eng_id: 'eng-ana',
    engenheiro: 'Ana',
    projeto_id: 'proj-longo',
    codigo_projeto: 'PRJ-010',
    cliente: 'Cliente Longo',
    area_id: 'area-adm',
    area_codigo: 'ADMINISTRATIVO',
    area_descricao: 'Administrativo',
    instancia_label: null,
    data_retrabalho: '2026-08-01',
    horas_trabalhadas_total: 4,
    horas_retrabalho: 0,
  },
  {
    eng_id: 'eng-ana',
    engenheiro: 'Ana',
    projeto_id: 'proj-longo',
    codigo_projeto: 'PRJ-010',
    cliente: 'Cliente Longo',
    area_id: 'area-adm',
    area_codigo: 'ADMINISTRATIVO',
    area_descricao: 'Administrativo',
    instancia_label: null,
    data_retrabalho: '2026-08-15',
    horas_trabalhadas_total: 2,
    horas_retrabalho: 0.5,
  },
  {
    eng_id: 'eng-ana',
    engenheiro: 'Ana',
    projeto_id: 'proj-longo',
    codigo_projeto: 'PRJ-010',
    cliente: 'Cliente Longo',
    area_id: 'area-adm',
    area_codigo: 'ADMINISTRATIVO',
    area_descricao: 'Administrativo',
    instancia_label: null,
    data_retrabalho: '2026-09-01',
    horas_trabalhadas_total: 8,
    horas_retrabalho: 0,
  },
] satisfies ProducaoApontamentoPeriodo[], {
  dataInicio: '2026-08-01',
  dataFim: '2026-08-31',
})

assert.equal(
  producaoParcial.resumo[0].horas_trabalhadas_total,
  6,
  'monthly productivity must include only hours pointed inside the selected period'
)
assert.equal(
  producaoParcial.resumo[0].horas_retrabalho_total,
  0.5,
  'monthly productivity must include only rework hours pointed inside the selected period'
)

const migrationPath = resolve(
  'supabase/migrations/20260831_dashboard_producao_apontamentos.sql'
)
assert.ok(existsSync(migrationPath), 'migration for production appointments view must exist')
const migration = readFileSync(migrationPath, 'utf8')

assert.match(migration, /CREATE OR REPLACE VIEW vw_dashboard_producao_apontamentos AS/i)
for (const expected of [
  'r.data_retrabalho',
  'ep.eng_id AS eng_id',
  'ep.projeto_id AS projeto_id',
  'r.horas_trabalhadas_total',
  'r.horas_retrabalho',
  'ep.instancia_label',
  'p.codigo_projeto',
  'a.descricao AS area_descricao',
]) {
  assert.ok(migration.includes(expected), `migration must select ${expected}`)
}

const supabaseSource = readFileSync(resolve('dashboard/lib/supabase.ts'), 'utf8')
assert.match(supabaseSource, /export interface ProducaoApontamentoPeriodo/)
assert.match(supabaseSource, /export async function fetchProducaoApontamentosPeriodo/)
assert.match(supabaseSource, /from\('vw_dashboard_producao_apontamentos'\)/)
assert.match(supabaseSource, /gte\('data_retrabalho', dataInicio\)/)
assert.match(supabaseSource, /lte\('data_retrabalho', dataFim\)/)

const cardSource = readFileSync(resolve('dashboard/components/ProducaoPeriodoCard.tsx'), 'utf8')
assert.match(cardSource, /fetchProducaoApontamentosPeriodo/)
assert.match(cardSource, /buildProducaoPeriodo/)
assert.match(cardSource, /selectedEngId/)
assert.match(cardSource, /setSelectedEngId\(null\)/)
assert.match(cardSource, /onClick=\{\(\) => setSelectedEngId\(row\.eng_id\)\}/)
assert.match(cardSource, /Projetos no periodo/)
assert.match(cardSource, /disciplinas\.map/)

console.log('test-dashboard-producao-engenheiro-detalhe: OK')
