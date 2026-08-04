export const DEFAULT_AUDIT_CODES = [
  'PRJ-002',
  'PRJ-009',
  'PRJ-012',
  'PRJ-12',
  'PRJ-015',
  'PRJ-035',
  'PRJ-037',
  'PRJ-077',
  'PRJ-081',
] as const;

export type ConclusionClassification =
  | 'OK_CONCLUIDA'
  | 'OK_PENDENTE'
  | 'DIVERGENTE_FORTE'
  | 'DIVERGENTE_AMBIGUA'
  | 'DUPLICIDADE_CONFUSA';

export type ApprovalAction = 'manter pendente' | 'marcar concluída' | 'investigar mais';

export interface ConclusionAuditRow {
  eng_projeto_id: string;
  projeto_id: string;
  codigo_projeto: string;
  cliente: string;
  eng_id: string;
  engenheiro_nome: string;
  area_id: string;
  area_descricao: string;
  instancia_label: string | null;
  ativo: boolean;
  percentual_ponderado: number;
  data_conclusao: string | null;
  etapa_pavimento_total: number;
  etapa_pavimento_concluidas: number;
  etapa_global_total: number;
  etapa_global_concluidas: number;
  status_historico_codigos: string[];
  previsao_status_codigos: string[];
  previsoes_count: number;
  feitos_count: number;
  dashboard_percentual_andamento: number | null;
  dashboard_status_descricao: string | null;
  chatbot_deve_aparecer: boolean;
  duplicate_key_count: number;
  relato_humano_concluido: boolean;
}

export interface ClassifiedConclusionAuditRow extends ConclusionAuditRow {
  classificacao: ConclusionClassification;
  disciplina_instancia: string;
  evidencia: string;
  acao_sugerida: ApprovalAction;
  dashboard_consistente: boolean;
}

export interface ConclusionApproval {
  eng_projeto_id: string;
  codigo_projeto: string;
  engenheiro: string;
  disciplina_instancia: string;
  acao_esperada: ApprovalAction;
  data_conclusao_correta?: string;
}

function normalizedPct(value: number | null | undefined): number {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function hasConclusiveStatus(codes: string[]): boolean {
  return codes.some((code) => code.toUpperCase() === 'CONCLUIDO');
}

function allConfiguredStepsDone(row: ConclusionAuditRow): boolean {
  const total = row.etapa_pavimento_total + row.etapa_global_total;
  const done = row.etapa_pavimento_concluidas + row.etapa_global_concluidas;
  return total > 0 && total === done;
}

function statusExpectedFromPct(percentual: number): string {
  if (percentual >= 100) return 'concluido';
  if (percentual > 0) return 'em andamento';
  return 'aguardando inicio';
}

function normalizeStatusText(value: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

function isApprovalAction(value: string): value is ApprovalAction {
  return ['manter pendente', 'marcar concluída', 'investigar mais'].includes(value);
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function disciplinaInstancia(row: Pick<ConclusionAuditRow, 'area_descricao' | 'instancia_label'>): string {
  return row.instancia_label || row.area_descricao;
}

function evidenceFor(row: ConclusionAuditRow): string {
  const pieces: string[] = [];
  if (row.data_conclusao) pieces.push(`data_conclusao=${row.data_conclusao}`);
  if (hasConclusiveStatus(row.status_historico_codigos)) pieces.push('historico=CONCLUIDO');
  if (hasConclusiveStatus(row.previsao_status_codigos)) pieces.push('previsao_status=CONCLUIDO');
  if (allConfiguredStepsDone(row)) pieces.push('etapas=100%');
  if (row.relato_humano_concluido) pieces.push('relato_humano=concluido');
  if (row.duplicate_key_count > 1) pieces.push(`duplicidade=${row.duplicate_key_count}`);
  return pieces.length > 0 ? pieces.join('; ') : 'sem evidencias de conclusao';
}

export function classifyAuditRow(row: ConclusionAuditRow): ClassifiedConclusionAuditRow {
  const percentual = normalizedPct(row.percentual_ponderado);
  const dashboardPercent = row.dashboard_percentual_andamento == null
    ? null
    : normalizedPct(row.dashboard_percentual_andamento);
  const dashboardConsistente =
    dashboardPercent === null ||
    (dashboardPercent === percentual &&
      normalizeStatusText(row.dashboard_status_descricao) === statusExpectedFromPct(percentual));

  let classificacao: ConclusionClassification;
  if (percentual >= 100 && row.data_conclusao && !row.chatbot_deve_aparecer) {
    classificacao = 'OK_CONCLUIDA';
  } else if (
    percentual === 0 &&
    (Boolean(row.data_conclusao) ||
      hasConclusiveStatus(row.status_historico_codigos) ||
      hasConclusiveStatus(row.previsao_status_codigos) ||
      allConfiguredStepsDone(row))
  ) {
    classificacao = 'DIVERGENTE_FORTE';
  } else if (row.duplicate_key_count > 1) {
    classificacao = 'DUPLICIDADE_CONFUSA';
  } else if (row.relato_humano_concluido) {
    classificacao = 'DIVERGENTE_AMBIGUA';
  } else {
    classificacao = 'OK_PENDENTE';
  }

  const acaoSugerida: ApprovalAction =
    classificacao === 'OK_CONCLUIDA' || classificacao === 'OK_PENDENTE'
      ? 'manter pendente'
      : 'investigar mais';

  return {
    ...row,
    classificacao,
    disciplina_instancia: disciplinaInstancia(row),
    evidencia: evidenceFor(row),
    acao_sugerida: acaoSugerida,
    dashboard_consistente: dashboardConsistente,
  };
}

export function generateApprovalCsv(rows: ClassifiedConclusionAuditRow[]): string {
  const headers = [
    'eng_projeto_id',
    'codigo_projeto',
    'engenheiro',
    'disciplina_instancia',
    'classificacao',
    'acao_esperada',
    'data_conclusao_correta',
    'evidencia',
  ];

  const approvalRows = rows.filter((row) =>
    ['DIVERGENTE_FORTE', 'DIVERGENTE_AMBIGUA', 'DUPLICIDADE_CONFUSA'].includes(row.classificacao)
  );

  return [
    headers.join(','),
    ...approvalRows.map((row) => [
      row.eng_projeto_id,
      row.codigo_projeto,
      row.engenheiro_nome,
      row.disciplina_instancia,
      row.classificacao,
      row.acao_sugerida,
      '',
      row.evidencia,
    ].map(csvCell).join(',')),
  ].join('\n');
}

export function parseApprovalCsv(csv: string): ConclusionApproval[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);
  const indexOf = (name: string) => {
    const index = headers.indexOf(name);
    if (index < 0) throw new Error(`Coluna obrigatoria ausente no CSV de aprovacao: ${name}`);
    return index;
  };

  const idxEngProjeto = indexOf('eng_projeto_id');
  const idxCodigo = indexOf('codigo_projeto');
  const idxEngenheiro = indexOf('engenheiro');
  const idxDisciplina = indexOf('disciplina_instancia');
  const idxAcao = indexOf('acao_esperada');
  const idxData = indexOf('data_conclusao_correta');

  return lines.slice(1).map((line, offset) => {
    const cells = parseCsvLine(line);
    const action = (cells[idxAcao] ?? '').trim();
    if (!isApprovalAction(action)) {
      throw new Error(`Acao invalida na linha ${offset + 2}: ${action}`);
    }

    return {
      eng_projeto_id: (cells[idxEngProjeto] ?? '').trim(),
      codigo_projeto: (cells[idxCodigo] ?? '').trim(),
      engenheiro: (cells[idxEngenheiro] ?? '').trim(),
      disciplina_instancia: (cells[idxDisciplina] ?? '').trim(),
      acao_esperada: action,
      data_conclusao_correta: (cells[idxData] ?? '').trim() || undefined,
    };
  });
}

function validateApprovalForSql(approval: ConclusionApproval): void {
  if (approval.acao_esperada !== 'marcar concluída') return;
  if (!approval.data_conclusao_correta) {
    throw new Error(`Aprovacao ${approval.eng_projeto_id} precisa de data_conclusao_correta`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(approval.data_conclusao_correta)) {
    throw new Error(`data_conclusao_correta invalida em ${approval.eng_projeto_id}: ${approval.data_conclusao_correta}`);
  }
}

export function generateCorrectionSql(
  approvals: ConclusionApproval[],
  options: { apply: boolean }
): string {
  approvals.forEach(validateApprovalForSql);

  const values = approvals.length > 0
    ? approvals.map((approval) => `(
    ${sqlString(approval.eng_projeto_id)}::uuid,
    ${sqlString(approval.codigo_projeto)},
    ${sqlString(approval.engenheiro)},
    ${sqlString(approval.disciplina_instancia)},
    ${sqlString(approval.acao_esperada)},
    ${approval.data_conclusao_correta ? `${sqlString(approval.data_conclusao_correta)}::date` : 'NULL::date'}
  )`).join(',\n')
    : `(
    NULL::uuid,
    NULL::text,
    NULL::text,
    NULL::text,
    NULL::text,
    NULL::date
  )`;

  const header = `BEGIN;

CREATE TEMP TABLE approved_conclusoes (
  eng_projeto_id uuid,
  codigo_projeto text,
  engenheiro text,
  disciplina_instancia text,
  acao_esperada text,
  data_conclusao_correta date
) ON COMMIT DROP;

INSERT INTO approved_conclusoes (
  eng_projeto_id,
  codigo_projeto,
  engenheiro,
  disciplina_instancia,
  acao_esperada,
  data_conclusao_correta
) VALUES
${values};

DELETE FROM approved_conclusoes WHERE eng_projeto_id IS NULL;

-- Conferencia obrigatoria antes de aplicar qualquer atualizacao.
SELECT
  a.eng_projeto_id,
  a.codigo_projeto AS codigo_aprovado,
  p.codigo_projeto AS codigo_banco,
  a.engenheiro AS engenheiro_aprovado,
  e.nome AS engenheiro_banco,
  a.disciplina_instancia,
  COALESCE(ep.instancia_label, ar.descricao) AS disciplina_banco,
  a.acao_esperada,
  a.data_conclusao_correta,
  ep.percentual_ponderado AS percentual_atual,
  ep.data_conclusao AS data_conclusao_atual
FROM approved_conclusoes a
JOIN engenheiros_projetos ep ON ep.id = a.eng_projeto_id
JOIN projetos p ON p.projeto_id = ep.projeto_id
JOIN engenheiros e ON e.eng_id = ep.eng_id
JOIN areas ar ON ar.area_id = ep.area_id
ORDER BY p.codigo_projeto, e.nome, disciplina_banco;
`;

  if (!options.apply) {
    return `${header}
-- DRY RUN: nenhuma atualizacao e executada neste arquivo.
-- Para aplicar, gere novamente com --apply; o SQL aplicado usa:
-- SELECT marcar_area_concluida(p_projeto_id => ep.projeto_id, p_area_id => ep.area_id, p_concluido => true, p_eng_projeto_id => ep.id);

ROLLBACK;
`;
  }

  return `${header}
-- Somente linhas explicitamente aprovadas para marcar concluida sao alteradas.
WITH aprovadas AS (
  SELECT *
  FROM approved_conclusoes
  WHERE acao_esperada = 'marcar concluída'
),
pavs AS (
  SELECT pp.pavimento_id
  FROM aprovadas a
  JOIN projeto_pavimentos pp ON pp.eng_projeto_id = a.eng_projeto_id
  WHERE pp.ativo = true
)
UPDATE pavimento_etapas pe
SET concluida = true
FROM pavs
WHERE pe.pavimento_id = pavs.pavimento_id
  AND pe.ativo = true
  AND pe.concluida IS DISTINCT FROM true;

WITH aprovadas AS (
  SELECT *
  FROM approved_conclusoes
  WHERE acao_esperada = 'marcar concluída'
)
UPDATE projeto_etapas_globais peg
SET concluida = true
FROM aprovadas a
WHERE peg.eng_projeto_id = a.eng_projeto_id
  AND peg.ativo = true
  AND peg.concluida IS DISTINCT FROM true;

WITH aprovadas AS (
  SELECT *
  FROM approved_conclusoes
  WHERE acao_esperada = 'marcar concluída'
),
sem_estrutura AS (
  SELECT ep.id, ep.projeto_id, ep.area_id
  FROM aprovadas a
  JOIN engenheiros_projetos ep ON ep.id = a.eng_projeto_id
  WHERE NOT EXISTS (
    SELECT 1 FROM projeto_pavimentos pp
    WHERE pp.eng_projeto_id = ep.id AND pp.ativo = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM projeto_etapas_globais peg
    WHERE peg.eng_projeto_id = ep.id AND peg.ativo = true
  )
)
SELECT marcar_area_concluida(
  p_projeto_id => ep.projeto_id,
  p_area_id => ep.area_id,
  p_concluido => true,
  p_eng_projeto_id => ep.id
)
FROM sem_estrutura ep;

UPDATE engenheiros_projetos ep
SET data_conclusao = a.data_conclusao_correta,
    percentual_ponderado = CASE
      WHEN ep.percentual_ponderado >= 100 THEN ep.percentual_ponderado
      ELSE 100
    END,
    updated_at = CURRENT_TIMESTAMP
FROM approved_conclusoes a
WHERE ep.id = a.eng_projeto_id
  AND a.acao_esperada = 'marcar concluída';

SELECT recalcular_rollup_projeto(ep.projeto_id)
FROM engenheiros_projetos ep
JOIN approved_conclusoes a ON a.eng_projeto_id = ep.id
WHERE a.acao_esperada = 'marcar concluída'
GROUP BY ep.projeto_id;

-- Pos-checagem: estas linhas devem sair como 100% e Concluido.
SELECT
  v.atribuicao_id,
  v.codigo_projeto,
  v.engenheiro_nome,
  COALESCE(v.instancia_label, v.area_descricao) AS disciplina_instancia,
  v.percentual_andamento,
  v.status_descricao,
  v.data_conclusao
FROM vw_projetos_completo v
JOIN approved_conclusoes a ON a.eng_projeto_id = v.atribuicao_id
ORDER BY v.codigo_projeto, v.engenheiro_nome, disciplina_instancia;

COMMIT;
`;
}
