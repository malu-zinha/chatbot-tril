import assert from 'node:assert/strict';
import {
  classifyAuditRow,
  DEFAULT_AUDIT_CODES,
  generateApprovalCsv,
  generateCorrectionSql,
  parseApprovalCsv,
  type ConclusionAuditRow,
  type ConclusionApproval,
} from '../logic/auditoria/conclusaoAudit.ts';

function row(overrides: Partial<ConclusionAuditRow>): ConclusionAuditRow {
  return {
    eng_projeto_id: 'ep-1',
    projeto_id: 'proj-1',
    codigo_projeto: 'PRJ-081',
    cliente: 'Cliente',
    eng_id: 'eng-1',
    engenheiro_nome: 'Bruno Evangelista',
    area_id: 'area-1',
    area_descricao: 'Hidraulico Piscina',
    instancia_label: null,
    ativo: true,
    percentual_ponderado: 0,
    data_conclusao: null,
    etapa_pavimento_total: 0,
    etapa_pavimento_concluidas: 0,
    etapa_global_total: 0,
    etapa_global_concluidas: 0,
    status_historico_codigos: [],
    previsao_status_codigos: [],
    previsoes_count: 0,
    feitos_count: 0,
    dashboard_percentual_andamento: 0,
    dashboard_status_descricao: 'Aguardando Inicio',
    chatbot_deve_aparecer: true,
    duplicate_key_count: 1,
    relato_humano_concluido: false,
    ...overrides,
  };
}

assert.deepEqual(
  DEFAULT_AUDIT_CODES,
  ['PRJ-002', 'PRJ-009', 'PRJ-012', 'PRJ-12', 'PRJ-015', 'PRJ-035', 'PRJ-037', 'PRJ-077', 'PRJ-081'],
  'codigos obrigatorios do plano devem ser o default da auditoria'
);

assert.equal(
  classifyAuditRow(row({ percentual_ponderado: 100, data_conclusao: '2026-07-31', chatbot_deve_aparecer: false })).classificacao,
  'OK_CONCLUIDA',
  '100% com data_conclusao deve ser OK_CONCLUIDA'
);

assert.equal(
  classifyAuditRow(row({ status_historico_codigos: ['AGUARDANDO_INICIO', 'CONCLUIDO'] })).classificacao,
  'DIVERGENTE_FORTE',
  '0% com historico CONCLUIDO deve ser DIVERGENTE_FORTE'
);

assert.equal(
  classifyAuditRow(row({ relato_humano_concluido: true })).classificacao,
  'DIVERGENTE_AMBIGUA',
  'relato humano sem evidencia forte deve ser DIVERGENTE_AMBIGUA'
);

assert.equal(
  classifyAuditRow(row({ codigo_projeto: 'PRJ-037', duplicate_key_count: 2, area_descricao: 'Hidrossanitario' })).classificacao,
  'DUPLICIDADE_CONFUSA',
  'duplicidade por projeto/disciplina deve exigir identificacao por eng_projeto_id'
);

assert.equal(
  classifyAuditRow(row({ percentual_ponderado: 42, dashboard_percentual_andamento: 42, dashboard_status_descricao: 'Em Andamento' })).classificacao,
  'OK_PENDENTE',
  'pendente sem evidencia de conclusao deve ser OK_PENDENTE'
);

const approvalCsv = generateApprovalCsv([
  classifyAuditRow(row({ eng_projeto_id: 'ep-081', status_historico_codigos: ['CONCLUIDO'] })),
  classifyAuditRow(row({ eng_projeto_id: 'ep-012', percentual_ponderado: 30 })),
]);

assert.match(approvalCsv, /eng_projeto_id,codigo_projeto,engenheiro,disciplina_instancia,classificacao,acao_esperada,data_conclusao_correta/);
assert.match(approvalCsv, /ep-081,PRJ-081,Bruno Evangelista,Hidraulico Piscina,DIVERGENTE_FORTE,investigar mais,/);
assert.doesNotMatch(approvalCsv, /ep-012/, 'template de aprovacao deve conter apenas divergencias e duplicidades');

const approvals: ConclusionApproval[] = [
  {
    eng_projeto_id: 'ep-081',
    codigo_projeto: 'PRJ-081',
    engenheiro: 'Bruno Evangelista',
    disciplina_instancia: 'Hidraulico Piscina',
    acao_esperada: 'marcar concluída',
    data_conclusao_correta: '2026-07-22',
  },
];

const parsedApprovals = parseApprovalCsv(`eng_projeto_id,codigo_projeto,engenheiro,disciplina_instancia,classificacao,acao_esperada,data_conclusao_correta,evidencia
ep-081,PRJ-081,Bruno Evangelista,Hidraulico Piscina,DIVERGENTE_FORTE,marcar concluída,2026-07-22,historico=CONCLUIDO
ep-037,PRJ-037,Bruno Evangelista,Complemento,DIVERGENTE_AMBIGUA,investigar mais,,relato_humano=concluido`);

assert.deepEqual(
  parsedApprovals,
  [
    {
      eng_projeto_id: 'ep-081',
      codigo_projeto: 'PRJ-081',
      engenheiro: 'Bruno Evangelista',
      disciplina_instancia: 'Hidraulico Piscina',
      acao_esperada: 'marcar concluída',
      data_conclusao_correta: '2026-07-22',
    },
    {
      eng_projeto_id: 'ep-037',
      codigo_projeto: 'PRJ-037',
      engenheiro: 'Bruno Evangelista',
      disciplina_instancia: 'Complemento',
      acao_esperada: 'investigar mais',
      data_conclusao_correta: undefined,
    },
  ],
  'parseApprovalCsv deve ler apenas colunas de aprovacao necessarias ao SQL'
);

const dryRunSql = generateCorrectionSql(approvals, { apply: false });
assert.match(dryRunSql, /BEGIN;/);
assert.match(dryRunSql, /CREATE TEMP TABLE approved_conclusoes/);
assert.match(dryRunSql, /p_eng_projeto_id => ep\.id/);
assert.match(dryRunSql, /ROLLBACK;/, 'SQL padrao deve ser dry-run');
assert.doesNotMatch(dryRunSql, /COMMIT;/, 'dry-run nao pode conter COMMIT');

const applySql = generateCorrectionSql(approvals, { apply: true });
assert.match(applySql, /COMMIT;/, 'modo apply deve finalizar com COMMIT');

console.log('test-conclusao-audit-rules: OK');
