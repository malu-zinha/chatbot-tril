-- =====================================================
-- MIGRAÇÃO: PERCENTUAL PONDERADO COMO FONTE ÚNICA + STATUS DERIVADO
-- =====================================================
-- A partir daqui, projetos.percentual_ponderado é a ÚNICA fonte de progresso.
-- engenheiros_projetos.percentual_andamento fica morta (não é mais lida).
--
-- Status passa a ser derivado do ponderado, com apenas 3 estados:
--   0%          -> Aguardando Início
--   0,1% a 99,9% -> Em Andamento
--   100%        -> Concluído
--
-- A marcação manual de status deixa de existir (dono + notificações diárias).
-- Atraso vira indicador separado: prazo vencido E ponderado < 100.
--
-- COLE TUDO ISTO no SQL Editor do Supabase e execute UMA vez.
-- Pré-requisitos já aplicados: MASTER_SCHEMA_COMPLETO.sql, triggers_e_views.sql,
-- 20260319_progresso_ponderado.sql.
-- NÃO rode 20260529_sync_ponderado_dashboard.sql (substituído por este arquivo).
-- =====================================================

-- -----------------------------------------------------
-- 1) Recálculo volta a atualizar SOMENTE projetos.percentual_ponderado
--    (remove a escrita em engenheiros_projetos que a versão anterior fazia)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION atualizar_percentual_ponderado()
RETURNS TRIGGER AS $$
DECLARE
    v_projeto_id UUID;
BEGIN
    IF TG_TABLE_NAME = 'pavimento_etapas' THEN
        SELECT pp.projeto_id INTO v_projeto_id
        FROM projeto_pavimentos pp
        WHERE pp.pavimento_id = COALESCE(NEW.pavimento_id, OLD.pavimento_id);
    ELSIF TG_TABLE_NAME = 'projeto_etapas_globais' THEN
        v_projeto_id := COALESCE(NEW.projeto_id, OLD.projeto_id);
    ELSIF TG_TABLE_NAME = 'projeto_pavimentos' THEN
        v_projeto_id := COALESCE(NEW.projeto_id, OLD.projeto_id);
    END IF;

    IF v_projeto_id IS NOT NULL THEN
        UPDATE projetos
        SET percentual_ponderado = calcular_progresso_ponderado(v_projeto_id)
        WHERE projeto_id = v_projeto_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION atualizar_percentual_ponderado IS
    'Recalcula projetos.percentual_ponderado quando etapas/pavimentos mudam (fonte única)';

-- -----------------------------------------------------
-- 2) Trigger em projetos: mantém engenheiros_projetos.data_conclusao
--    coerente com o ponderado (100% => concluído; <100% => em aberto).
--    Mantém relatórios de área/atraso funcionando sem ler percentual_andamento.
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION sync_conclusao_por_ponderado()
RETURNS TRIGGER AS $$
BEGIN
    IF COALESCE(NEW.percentual_ponderado, 0) >= 100 THEN
        UPDATE engenheiros_projetos
        SET data_conclusao = COALESCE(data_conclusao, CURRENT_DATE),
            updated_at = CURRENT_TIMESTAMP
        WHERE projeto_id = NEW.projeto_id
          AND ativo = true
          AND data_conclusao IS NULL;
    ELSE
        UPDATE engenheiros_projetos
        SET data_conclusao = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE projeto_id = NEW.projeto_id
          AND ativo = true
          AND data_conclusao IS NOT NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_conclusao_por_ponderado IS
    'Sincroniza engenheiros_projetos.data_conclusao com projetos.percentual_ponderado (100% = concluído)';

DROP TRIGGER IF EXISTS trg_sync_conclusao_ponderado ON projetos;
CREATE TRIGGER trg_sync_conclusao_ponderado
    AFTER UPDATE OF percentual_ponderado ON projetos
    FOR EACH ROW
    WHEN (OLD.percentual_ponderado IS DISTINCT FROM NEW.percentual_ponderado)
    EXECUTE FUNCTION sync_conclusao_por_ponderado();

-- -----------------------------------------------------
-- 3) RPC para projetos SEM etapas: marcar/desmarcar concluído
--    (define o ponderado em 100 ou 0; o trigger acima cuida da data_conclusao)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION marcar_projeto_concluido(
    p_projeto_id UUID,
    p_concluido BOOLEAN DEFAULT true
)
RETURNS NUMERIC AS $$
DECLARE
    v_pct NUMERIC(5,2);
BEGIN
    v_pct := CASE WHEN p_concluido THEN 100.00 ELSE 0.00 END;
    UPDATE projetos
    SET percentual_ponderado = v_pct
    WHERE projeto_id = p_projeto_id;
    RETURN v_pct;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION marcar_projeto_concluido IS
    'Marca (100%) ou desmarca (0%) um projeto como concluído via percentual_ponderado';

-- -----------------------------------------------------
-- 4) Remove a sincronização de status manual (previsão diária -> status)
-- -----------------------------------------------------
DROP TRIGGER IF EXISTS trg_sync_status_previsao_to_engenheiros ON projetos_previsao;

-- -----------------------------------------------------
-- 5) Backfill: recalcula ponderado dos projetos com etapas e ajusta
--    data_conclusao de TODOS conforme o ponderado atual
-- -----------------------------------------------------
DO $$
DECLARE
    v_id UUID;
BEGIN
    FOR v_id IN
        SELECT DISTINCT projeto_id FROM (
            SELECT projeto_id FROM projeto_pavimentos WHERE ativo = true
            UNION
            SELECT projeto_id FROM projeto_etapas_globais WHERE ativo = true
        ) t
    LOOP
        UPDATE projetos
        SET percentual_ponderado = calcular_progresso_ponderado(v_id)
        WHERE projeto_id = v_id;
    END LOOP;

    UPDATE engenheiros_projetos ep
    SET data_conclusao = CASE
            WHEN p.percentual_ponderado >= 100 THEN COALESCE(ep.data_conclusao, CURRENT_DATE)
            ELSE NULL
        END
    FROM projetos p
    WHERE ep.projeto_id = p.projeto_id
      AND ep.ativo = true;
END $$;

-- =====================================================
-- 6) VIEWS: percentual e status passam a vir de projetos.percentual_ponderado
-- =====================================================

-- 6a) Lista detalhada de projetos (principal do dashboard)
DROP VIEW IF EXISTS vw_projetos_detalhado;
CREATE VIEW vw_projetos_detalhado AS
SELECT
    p.projeto_id,
    p.codigo_projeto,
    COALESCE(p.cliente, 'Sem cliente') AS cliente,
    p.descricao,
    COALESCE(e.nome, 'Sem engenheiro') AS engenheiro_nome,
    COALESCE(a.descricao, 'Sem área') AS area_descricao,
    CASE
        WHEN COALESCE(p.percentual_ponderado, 0) >= 100 THEN 'Concluído'
        WHEN COALESCE(p.percentual_ponderado, 0) > 0 THEN 'Em Andamento'
        ELSE 'Aguardando Início'
    END AS status_descricao,
    COALESCE(p.percentual_ponderado, 0) AS percentual_andamento,
    ep.data_inicio,
    ep.data_prevista,
    ep.data_conclusao,
    CASE
        WHEN ep.data_prevista::DATE < CURRENT_DATE AND COALESCE(p.percentual_ponderado, 0) < 100
        THEN (CURRENT_DATE - ep.data_prevista::DATE)
        ELSE 0
    END AS dias_atraso,
    ep.observacoes AS motivo_aguardo,
    p.ativo,
    p.created_at
FROM projetos p
LEFT JOIN engenheiros_projetos ep ON ep.projeto_id = p.projeto_id AND ep.ativo = true
LEFT JOIN engenheiros e ON e.eng_id = ep.eng_id
LEFT JOIN areas a ON a.area_id = ep.area_id
WHERE p.ativo = true
ORDER BY p.created_at DESC;

-- 6b) Gráfico: projetos por status (3 estados)
DROP VIEW IF EXISTS vw_grafico_projetos_status;
CREATE VIEW vw_grafico_projetos_status AS
SELECT
    status,
    COUNT(*) AS quantidade,
    ROUND(
        COUNT(*)::NUMERIC / NULLIF((SELECT COUNT(*) FROM projetos WHERE ativo = true), 0) * 100
    , 2) AS percentual
FROM (
    SELECT
        p.projeto_id,
        CASE
            WHEN COALESCE(p.percentual_ponderado, 0) >= 100 THEN 'Concluído'
            WHEN COALESCE(p.percentual_ponderado, 0) > 0 THEN 'Em Andamento'
            ELSE 'Aguardando Início'
        END AS status
    FROM projetos p
    WHERE p.ativo = true
) s
GROUP BY status
ORDER BY quantidade DESC;

-- 6c) Visão geral (KPIs)
DROP VIEW IF EXISTS vw_bloco1_visao_geral;
CREATE VIEW vw_bloco1_visao_geral AS
SELECT
    (SELECT COUNT(*) FROM projetos WHERE ativo = true) AS total_projetos,
    (SELECT COUNT(*) FROM projetos
        WHERE ativo = true AND COALESCE(percentual_ponderado, 0) >= 100) AS projetos_concluidos,
    (SELECT COUNT(*) FROM projetos
        WHERE ativo = true AND COALESCE(percentual_ponderado, 0) < 100) AS projetos_em_execucao,
    (SELECT COUNT(DISTINCT p.projeto_id)
        FROM projetos p
        JOIN engenheiros_projetos ep ON ep.projeto_id = p.projeto_id AND ep.ativo = true
        WHERE p.ativo = true
          AND COALESCE(p.percentual_ponderado, 0) < 100
          AND ep.data_prevista::DATE < CURRENT_DATE) AS projetos_atrasados,
    (SELECT ROUND(COALESCE(AVG(percentual_ponderado), 0), 2)
        FROM projetos WHERE ativo = true) AS percentual_concluido_medio,
    (SELECT COUNT(*) FROM engenheiros_projetos WHERE ativo = true) AS total_areas,
    (SELECT COUNT(*) FROM engenheiros_projetos
        WHERE ativo = true AND data_conclusao IS NOT NULL) AS areas_concluidas,
    (SELECT COUNT(*) FROM engenheiros_projetos
        WHERE ativo = true AND data_conclusao IS NULL) AS areas_ativas;

-- 6d) Carga de trabalho por engenheiro
DROP VIEW IF EXISTS vw_bloco3_carga_trabalho;
CREATE VIEW vw_bloco3_carga_trabalho AS
SELECT
    e.eng_id,
    e.nome AS engenheiro,
    e.exclusivo,
    COALESCE(SUM(ep.tempo_trabalho_dias) FILTER (
        WHERE ep.data_conclusao IS NULL AND ep.ativo = true
    ), 0) AS dias_estimados_totais,
    ROUND(COALESCE(AVG(p.percentual_ponderado) FILTER (
        WHERE ep.data_conclusao IS NULL AND ep.ativo = true
    ), 0), 2) AS percentual_execucao_media,
    ROUND(
        COALESCE(SUM(
            ep.tempo_trabalho_dias * (100 - COALESCE(p.percentual_ponderado, 0)) / 100.0
        ) FILTER (WHERE ep.data_conclusao IS NULL AND ep.ativo = true), 0)
    , 0) AS dias_restantes,
    COUNT(ep.id) FILTER (WHERE ep.data_conclusao IS NULL AND ep.ativo = true) AS areas_ativas,
    COUNT(DISTINCT ep.projeto_id) FILTER (WHERE ep.data_conclusao IS NULL AND ep.ativo = true) AS projetos_ativos
FROM engenheiros e
LEFT JOIN engenheiros_projetos ep ON ep.eng_id = e.eng_id
LEFT JOIN projetos p ON p.projeto_id = ep.projeto_id
WHERE e.ativo = true
GROUP BY e.eng_id, e.nome, e.exclusivo
ORDER BY dias_restantes DESC;

-- 6e) Execução média por engenheiro
DROP VIEW IF EXISTS vw_bloco4_execucao_media;
CREATE VIEW vw_bloco4_execucao_media AS
SELECT
    e.eng_id,
    e.nome AS engenheiro,
    COALESCE(SUM(a.tempo_trabalho_dias), 0) AS dias_estimados_totais,
    ROUND(
        COALESCE(SUM(a.tempo_trabalho_dias * COALESCE(p.percentual_ponderado, 0) / 100.0), 0)
    , 0) AS dias_executados,
    ROUND(COALESCE(AVG(p.percentual_ponderado), 0), 2) AS percentual_execucao_media,
    ROUND(
        COALESCE(SUM(a.tempo_trabalho_dias * (100 - COALESCE(p.percentual_ponderado, 0)) / 100.0), 0)
    , 0) AS dias_restantes
FROM engenheiros e
LEFT JOIN engenheiros_projetos ep ON ep.eng_id = e.eng_id AND ep.ativo = true
LEFT JOIN projetos p ON p.projeto_id = ep.projeto_id
LEFT JOIN areas a ON a.area_id = ep.area_id
WHERE e.ativo = true
GROUP BY e.eng_id, e.nome
ORDER BY percentual_execucao_media DESC;

-- 6f) Gráfico: carga de trabalho
DROP VIEW IF EXISTS vw_grafico_carga_trabalho;
CREATE VIEW vw_grafico_carga_trabalho AS
SELECT
    e.nome AS engenheiro,
    ROUND(
        COALESCE(SUM(ep.tempo_trabalho_dias * COALESCE(p.percentual_ponderado, 0) / 100.0) FILTER (
            WHERE ep.data_conclusao IS NULL AND ep.ativo = true
        ), 0)
    , 0) AS dias_concluidos,
    ROUND(
        COALESCE(SUM(ep.tempo_trabalho_dias * (100 - COALESCE(p.percentual_ponderado, 0)) / 100.0) FILTER (
            WHERE ep.data_conclusao IS NULL AND ep.ativo = true
        ), 0)
    , 0) AS dias_restantes
FROM engenheiros e
LEFT JOIN engenheiros_projetos ep ON ep.eng_id = e.eng_id
LEFT JOIN projetos p ON p.projeto_id = ep.projeto_id
WHERE e.ativo = true
GROUP BY e.eng_id, e.nome
ORDER BY COALESCE(SUM(ep.tempo_trabalho_dias), 0) DESC;

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
SELECT '✅ Status agora deriva de projetos.percentual_ponderado (fonte única)' AS resultado;