-- =====================================================
-- MIGRACAO: Historico de mudancas de status
-- =====================================================
-- Registra automaticamente todas as mudancas de status
-- em engenheiros_projetos para calcular tempo de paralisacao
-- em relatorios PDF de projetos concluidos.
-- =====================================================

-- Tabela para armazenar historico de mudancas de status
CREATE TABLE IF NOT EXISTS status_historico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    eng_projeto_id UUID NOT NULL REFERENCES engenheiros_projetos(id) ON DELETE CASCADE,
    projeto_id UUID NOT NULL REFERENCES projetos(projeto_id) ON DELETE CASCADE,
    status_anterior_id INTEGER REFERENCES status_codes(status_id),
    status_novo_id INTEGER REFERENCES status_codes(status_id),
    data_mudanca TIMESTAMPTZ DEFAULT NOW(),
    origem TEXT DEFAULT 'sistema',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_historico_projeto ON status_historico(projeto_id);
CREATE INDEX IF NOT EXISTS idx_status_historico_eng_projeto ON status_historico(eng_projeto_id);
CREATE INDEX IF NOT EXISTS idx_status_historico_data ON status_historico(data_mudanca);
CREATE INDEX IF NOT EXISTS idx_status_historico_status_novo ON status_historico(status_novo_id);

COMMENT ON TABLE status_historico IS 'Historico de mudancas de status para calculo de tempo de paralisacao';
COMMENT ON COLUMN status_historico.origem IS 'Origem da mudanca: chatbot, dashboard, sistema';

-- Funcao trigger para registrar mudancas de status automaticamente
CREATE OR REPLACE FUNCTION registrar_mudanca_status()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
        INSERT INTO status_historico (
            eng_projeto_id,
            projeto_id,
            status_anterior_id,
            status_novo_id,
            origem
        ) VALUES (
            NEW.id,
            NEW.projeto_id,
            OLD.status_id,
            NEW.status_id,
            'sistema'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que dispara apos UPDATE em engenheiros_projetos
DROP TRIGGER IF EXISTS trg_registrar_mudanca_status ON engenheiros_projetos;
CREATE TRIGGER trg_registrar_mudanca_status
AFTER UPDATE ON engenheiros_projetos
FOR EACH ROW
EXECUTE FUNCTION registrar_mudanca_status();

COMMENT ON FUNCTION registrar_mudanca_status IS 'Registra mudancas de status em status_historico para auditoria e calculo de paralisacao';

-- View para calcular metricas do relatorio PDF por projeto
CREATE OR REPLACE VIEW vw_relatorio_projeto_pdf AS
WITH disciplinas_projeto AS (
    SELECT
        ep.projeto_id,
        ep.id AS eng_projeto_id,
        ep.eng_id,
        ep.area_id,
        ep.data_inicio,
        ep.data_conclusao,
        ep.data_prevista,
        ep.percentual_ponderado,
        ep.instancia_label,
        e.nome AS engenheiro_nome,
        a.descricao AS area_descricao,
        a.codigo AS area_codigo
    FROM engenheiros_projetos ep
    LEFT JOIN engenheiros e ON e.eng_id = ep.eng_id
    LEFT JOIN areas a ON a.area_id = ep.area_id
    WHERE ep.ativo = true
),
retrabalho_projeto AS (
    SELECT
        projeto_id,
        COUNT(*) AS dias_retrabalho
    FROM retrabalho_projetos
    WHERE necessitou_retrabalho = true
    GROUP BY projeto_id
),
paralisacao_projeto AS (
    SELECT
        sh.projeto_id,
        COUNT(DISTINCT DATE(sh.data_mudanca)) AS dias_paralisacao
    FROM status_historico sh
    JOIN status_codes sc ON sc.status_id = sh.status_novo_id
    WHERE sc.codigo IN ('PARADO_CLIENTE', 'PARADO_TECPRED', 'AGUARDANDO_INF_CLIENTE', 'AGUARDANDO_INICIO')
    GROUP BY sh.projeto_id
)
SELECT
    p.projeto_id,
    p.codigo_projeto,
    p.cliente,
    p.descricao,
    p.percentual_ponderado AS percentual_projeto,
    
    -- Tempo de execucao (calendario)
    MIN(dp.data_inicio) AS data_inicio_projeto,
    MAX(dp.data_conclusao) AS data_conclusao_projeto,
    COALESCE(
        EXTRACT(DAY FROM (MAX(dp.data_conclusao)::timestamp - MIN(dp.data_inicio)::timestamp))::INTEGER,
        0
    ) AS dias_execucao_total,
    
    -- Engenheiros envolvidos
    COUNT(DISTINCT dp.eng_id) AS total_engenheiros,
    
    -- Disciplinas/Areas
    COUNT(DISTINCT dp.eng_projeto_id) AS total_disciplinas,
    COUNT(DISTINCT dp.eng_projeto_id) FILTER (
        WHERE dp.data_conclusao IS NOT NULL OR dp.percentual_ponderado >= 100
    ) AS disciplinas_concluidas,
    
    -- Retrabalho (dias com retrabalho registrado)
    COALESCE(rp.dias_retrabalho, 0) AS dias_retrabalho,
    
    -- Paralisacao (dias em status de parada)
    COALESCE(pp.dias_paralisacao, 0) AS dias_paralisacao,
    
    -- Data de criacao do projeto
    p.created_at AS projeto_criado_em

FROM projetos p
LEFT JOIN disciplinas_projeto dp ON dp.projeto_id = p.projeto_id
LEFT JOIN retrabalho_projeto rp ON rp.projeto_id = p.projeto_id
LEFT JOIN paralisacao_projeto pp ON pp.projeto_id = p.projeto_id
WHERE p.ativo = true
GROUP BY
    p.projeto_id,
    p.codigo_projeto,
    p.cliente,
    p.descricao,
    p.percentual_ponderado,
    p.created_at,
    rp.dias_retrabalho,
    pp.dias_paralisacao;

COMMENT ON VIEW vw_relatorio_projeto_pdf IS 'Metricas agregadas por projeto para geracao de relatorio PDF';

-- View auxiliar para detalhamento por disciplina (usado no PDF)
CREATE OR REPLACE VIEW vw_relatorio_disciplinas_projeto AS
SELECT
    ep.projeto_id,
    ep.id AS eng_projeto_id,
    e.nome AS engenheiro_nome,
    a.descricao AS area_descricao,
    a.codigo AS area_codigo,
    ep.instancia_label,
    ep.data_inicio,
    ep.data_conclusao,
    ep.data_prevista,
    ep.percentual_ponderado,
    COALESCE(
        EXTRACT(DAY FROM (ep.data_conclusao::timestamp - ep.data_inicio::timestamp))::INTEGER,
        0
    ) AS dias_execucao,
    COALESCE(r.dias_retrabalho, 0) AS dias_retrabalho
FROM engenheiros_projetos ep
LEFT JOIN engenheiros e ON e.eng_id = ep.eng_id
LEFT JOIN areas a ON a.area_id = ep.area_id
LEFT JOIN (
    SELECT eng_projeto_id, COUNT(*) AS dias_retrabalho
    FROM retrabalho_projetos
    WHERE necessitou_retrabalho = true
    GROUP BY eng_projeto_id
) r ON r.eng_projeto_id = ep.id
WHERE ep.ativo = true
ORDER BY ep.data_inicio NULLS LAST;

COMMENT ON VIEW vw_relatorio_disciplinas_projeto IS 'Detalhamento por disciplina para relatorio PDF';

-- Permissoes
GRANT SELECT ON status_historico TO authenticated;
GRANT SELECT ON vw_relatorio_projeto_pdf TO authenticated;
GRANT SELECT ON vw_relatorio_disciplinas_projeto TO authenticated;
