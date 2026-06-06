-- =====================================================
-- MIGRAÇÃO: CONCLUSÃO POR ÁREA + GLOBAIS NO CÁLCULO
-- Progresso passa a ser por (projeto, área) em engenheiros_projetos.percentual_ponderado.
-- projetos.percentual_ponderado vira roll-up (média das áreas).
-- Projeto "Concluído" = todas as áreas ativas com percentual >= 100.
-- DEPENDE DE: 20260319_progresso_ponderado.sql, 20260429_pavimentos_etapas_por_area.sql,
--             20260530_status_por_ponderado.sql
-- COLE TUDO no SQL Editor do Supabase e execute UMA vez.
-- =====================================================

-- 1) Coluna de progresso por área
ALTER TABLE engenheiros_projetos
    ADD COLUMN IF NOT EXISTS percentual_ponderado NUMERIC(5,2) DEFAULT 0.00;
COMMENT ON COLUMN engenheiros_projetos.percentual_ponderado IS
    'Progresso ponderado da disciplina (projeto+área): pavimentos + etapas globais. Fonte única do status por área.';

-- 2) Cálculo do progresso de UMA área
CREATE OR REPLACE FUNCTION calcular_progresso_area(p_projeto_id UUID, p_area_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_contrib_pav  NUMERIC := 0;
    v_contrib_glob NUMERIC := 0;
    v_pav RECORD;
    v_interno NUMERIC;
    v_total NUMERIC;
BEGIN
    FOR v_pav IN
        SELECT pavimento_id, peso FROM projeto_pavimentos
        WHERE projeto_id = p_projeto_id AND area_id = p_area_id AND ativo = true
    LOOP
        SELECT COALESCE(SUM(peso),0) INTO v_interno
        FROM pavimento_etapas
        WHERE pavimento_id = v_pav.pavimento_id AND concluida = true AND ativo = true;
        v_contrib_pav := v_contrib_pav + (v_pav.peso * v_interno / 100.0);
    END LOOP;

    SELECT COALESCE(SUM(peso),0) INTO v_contrib_glob
    FROM projeto_etapas_globais
    WHERE projeto_id = p_projeto_id AND area_id = p_area_id AND concluida = true AND ativo = true;

    v_total := v_contrib_pav + v_contrib_glob;
    IF v_total > 100 THEN v_total := 100; ELSIF v_total < 0 THEN v_total := 0; END IF;
    RETURN ROUND(v_total, 2);
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION calcular_progresso_area IS 'Progresso ponderado de uma disciplina (projeto+área), pavimentos + globais.';

-- 3) Roll-up do projeto = média das áreas ativas (distinct por área)
CREATE OR REPLACE FUNCTION recalcular_rollup_projeto(p_projeto_id UUID)
RETURNS VOID AS $$
DECLARE v_avg NUMERIC(5,2);
BEGIN
    SELECT COALESCE(ROUND(AVG(area_pct),2),0) INTO v_avg
    FROM (
        SELECT DISTINCT ON (area_id) area_id, percentual_ponderado AS area_pct
        FROM engenheiros_projetos
        WHERE projeto_id = p_projeto_id AND ativo = true
        ORDER BY area_id, percentual_ponderado DESC
    ) t;
    UPDATE projetos SET percentual_ponderado = v_avg WHERE projeto_id = p_projeto_id;
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION recalcular_rollup_projeto IS 'projetos.percentual_ponderado = média das disciplinas ativas do projeto.';

-- 4) Trigger function: recalcula a área afetada + roll-up do projeto
CREATE OR REPLACE FUNCTION atualizar_progresso_area()
RETURNS TRIGGER AS $$
DECLARE
    v_projeto_id UUID;
    v_area_id UUID;
    v_pct NUMERIC(5,2);
BEGIN
    IF TG_TABLE_NAME = 'pavimento_etapas' THEN
        SELECT pp.projeto_id, pp.area_id INTO v_projeto_id, v_area_id
        FROM projeto_pavimentos pp
        WHERE pp.pavimento_id = COALESCE(NEW.pavimento_id, OLD.pavimento_id);
    ELSIF TG_TABLE_NAME = 'projeto_etapas_globais' THEN
        v_projeto_id := COALESCE(NEW.projeto_id, OLD.projeto_id);
        v_area_id    := COALESCE(NEW.area_id, OLD.area_id);
    ELSIF TG_TABLE_NAME = 'projeto_pavimentos' THEN
        v_projeto_id := COALESCE(NEW.projeto_id, OLD.projeto_id);
        v_area_id    := COALESCE(NEW.area_id, OLD.area_id);
    END IF;

    IF v_projeto_id IS NOT NULL AND v_area_id IS NOT NULL THEN
        v_pct := calcular_progresso_area(v_projeto_id, v_area_id);
        UPDATE engenheiros_projetos
        SET percentual_ponderado = v_pct,
            data_conclusao = CASE WHEN v_pct >= 100 THEN COALESCE(data_conclusao, CURRENT_DATE) ELSE NULL END,
            updated_at = CURRENT_TIMESTAMP
        WHERE projeto_id = v_projeto_id AND area_id = v_area_id AND ativo = true;
        PERFORM recalcular_rollup_projeto(v_projeto_id);
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5) Re-apontar os triggers de recálculo para a nova função (por área)
DROP TRIGGER IF EXISTS trg_recalc_etapa_pavimento ON pavimento_etapas;
CREATE TRIGGER trg_recalc_etapa_pavimento
    AFTER INSERT OR UPDATE OF concluida, peso, ativo OR DELETE ON pavimento_etapas
    FOR EACH ROW EXECUTE FUNCTION atualizar_progresso_area();

DROP TRIGGER IF EXISTS trg_recalc_etapa_global ON projeto_etapas_globais;
CREATE TRIGGER trg_recalc_etapa_global
    AFTER INSERT OR UPDATE OF concluida, peso, ativo OR DELETE ON projeto_etapas_globais
    FOR EACH ROW EXECUTE FUNCTION atualizar_progresso_area();

DROP TRIGGER IF EXISTS trg_recalc_pavimento ON projeto_pavimentos;
CREATE TRIGGER trg_recalc_pavimento
    AFTER INSERT OR UPDATE OF peso, ativo OR DELETE ON projeto_pavimentos
    FOR EACH ROW EXECUTE FUNCTION atualizar_progresso_area();

-- 6) O sync por projeto inteiro não vale mais (data_conclusao agora é por área)
DROP TRIGGER IF EXISTS trg_sync_conclusao_ponderado ON projetos;

-- 7) RPC: marcar/desmarcar uma ÁREA sem etapas como concluída
CREATE OR REPLACE FUNCTION marcar_area_concluida(p_projeto_id UUID, p_area_id UUID, p_concluido BOOLEAN DEFAULT true)
RETURNS NUMERIC AS $$
DECLARE v_pct NUMERIC(5,2);
BEGIN
    v_pct := CASE WHEN p_concluido THEN 100.00 ELSE 0.00 END;
    UPDATE engenheiros_projetos
    SET percentual_ponderado = v_pct,
        data_conclusao = CASE WHEN p_concluido THEN COALESCE(data_conclusao, CURRENT_DATE) ELSE NULL END,
        updated_at = CURRENT_TIMESTAMP
    WHERE projeto_id = p_projeto_id AND area_id = p_area_id AND ativo = true;
    PERFORM recalcular_rollup_projeto(p_projeto_id);
    RETURN v_pct;
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION marcar_area_concluida IS 'Marca (100) ou reabre (0) uma disciplina sem etapas; recalcula roll-up.';

-- 8) BACKFILL
-- 8a) Áreas COM estrutura: calcula a partir das etapas
UPDATE engenheiros_projetos ep
SET percentual_ponderado = calcular_progresso_area(ep.projeto_id, ep.area_id)
WHERE ep.ativo = true AND (
    EXISTS (SELECT 1 FROM projeto_pavimentos pp WHERE pp.projeto_id=ep.projeto_id AND pp.area_id=ep.area_id AND pp.ativo=true)
 OR EXISTS (SELECT 1 FROM projeto_etapas_globais g WHERE g.projeto_id=ep.projeto_id AND g.area_id=ep.area_id AND g.ativo=true)
);
-- 8b) Áreas SEM estrutura: preserva conclusão manual existente (data_conclusao)
UPDATE engenheiros_projetos ep
SET percentual_ponderado = CASE WHEN ep.data_conclusao IS NOT NULL THEN 100.00 ELSE 0.00 END
WHERE ep.ativo = true AND NOT (
    EXISTS (SELECT 1 FROM projeto_pavimentos pp WHERE pp.projeto_id=ep.projeto_id AND pp.area_id=ep.area_id AND pp.ativo=true)
 OR EXISTS (SELECT 1 FROM projeto_etapas_globais g WHERE g.projeto_id=ep.projeto_id AND g.area_id=ep.area_id AND g.ativo=true)
);
-- 8c) data_conclusao coerente com o novo percentual (áreas com estrutura)
UPDATE engenheiros_projetos ep
SET data_conclusao = CASE WHEN ep.percentual_ponderado >= 100 THEN COALESCE(ep.data_conclusao, CURRENT_DATE) ELSE NULL END
WHERE ep.ativo = true AND (
    EXISTS (SELECT 1 FROM projeto_pavimentos pp WHERE pp.projeto_id=ep.projeto_id AND pp.area_id=ep.area_id AND pp.ativo=true)
 OR EXISTS (SELECT 1 FROM projeto_etapas_globais g WHERE g.projeto_id=ep.projeto_id AND g.area_id=ep.area_id AND g.ativo=true)
);
-- 8d) Roll-up de todos os projetos
DO $$ DECLARE r RECORD; BEGIN
    FOR r IN SELECT DISTINCT projeto_id FROM engenheiros_projetos WHERE ativo = true LOOP
        PERFORM recalcular_rollup_projeto(r.projeto_id);
    END LOOP;
END $$;

-- 9) VIEWS (status/percentual por ÁREA; projeto concluído = todas as áreas 100)
DROP VIEW IF EXISTS vw_projetos_detalhado;
CREATE VIEW vw_projetos_detalhado AS
SELECT
    p.projeto_id, p.codigo_projeto,
    COALESCE(p.cliente, 'Sem cliente') AS cliente,
    p.descricao,
    COALESCE(e.nome, 'Sem engenheiro') AS engenheiro_nome,
    COALESCE(a.descricao, 'Sem área') AS area_descricao,
    CASE
        WHEN COALESCE(ep.percentual_ponderado, 0) >= 100 THEN 'Concluído'
        WHEN COALESCE(ep.percentual_ponderado, 0) > 0   THEN 'Em Andamento'
        ELSE 'Aguardando Início'
    END AS status_descricao,
    COALESCE(ep.percentual_ponderado, 0) AS percentual_andamento,
    ep.data_inicio, ep.data_prevista, ep.data_conclusao,
    CASE
        WHEN ep.data_prevista::DATE < CURRENT_DATE AND COALESCE(ep.percentual_ponderado, 0) < 100
        THEN (CURRENT_DATE - ep.data_prevista::DATE) ELSE 0
    END AS dias_atraso,
    ep.observacoes AS motivo_aguardo,
    p.ativo, p.created_at
FROM projetos p
LEFT JOIN engenheiros_projetos ep ON ep.projeto_id = p.projeto_id AND ep.ativo = true
LEFT JOIN engenheiros e ON e.eng_id = ep.eng_id
LEFT JOIN areas a ON a.area_id = ep.area_id
WHERE p.ativo = true
ORDER BY p.created_at DESC;

-- 9b) Gráfico por status (projeto): concluído só se todas as áreas 100
DROP VIEW IF EXISTS vw_grafico_projetos_status;
CREATE VIEW vw_grafico_projetos_status AS
SELECT status, COUNT(*) AS quantidade,
    ROUND(COUNT(*)::NUMERIC / NULLIF((SELECT COUNT(*) FROM projetos WHERE ativo=true),0) * 100, 2) AS percentual
FROM (
    SELECT p.projeto_id,
        CASE
            WHEN EXISTS (SELECT 1 FROM engenheiros_projetos ep WHERE ep.projeto_id=p.projeto_id AND ep.ativo=true)
             AND NOT EXISTS (SELECT 1 FROM engenheiros_projetos ep WHERE ep.projeto_id=p.projeto_id AND ep.ativo=true AND COALESCE(ep.percentual_ponderado,0) < 100)
                THEN 'Concluído'
            WHEN EXISTS (SELECT 1 FROM engenheiros_projetos ep WHERE ep.projeto_id=p.projeto_id AND ep.ativo=true AND COALESCE(ep.percentual_ponderado,0) > 0)
                THEN 'Em Andamento'
            ELSE 'Aguardando Início'
        END AS status
    FROM projetos p WHERE p.ativo = true
) s GROUP BY status ORDER BY quantidade DESC;

-- 9c) KPIs
DROP VIEW IF EXISTS vw_bloco1_visao_geral;
CREATE VIEW vw_bloco1_visao_geral AS
SELECT
    (SELECT COUNT(*) FROM projetos WHERE ativo=true) AS total_projetos,
    (SELECT COUNT(*) FROM projetos p WHERE p.ativo=true
        AND EXISTS (SELECT 1 FROM engenheiros_projetos ep WHERE ep.projeto_id=p.projeto_id AND ep.ativo=true)
        AND NOT EXISTS (SELECT 1 FROM engenheiros_projetos ep WHERE ep.projeto_id=p.projeto_id AND ep.ativo=true AND COALESCE(ep.percentual_ponderado,0) < 100)
    ) AS projetos_concluidos,
    (SELECT COUNT(*) FROM projetos p WHERE p.ativo=true
        AND EXISTS (SELECT 1 FROM engenheiros_projetos ep WHERE ep.projeto_id=p.projeto_id AND ep.ativo=true AND COALESCE(ep.percentual_ponderado,0) < 100)
    ) AS projetos_em_execucao,
    (SELECT COUNT(DISTINCT p.projeto_id) FROM projetos p
        JOIN engenheiros_projetos ep ON ep.projeto_id=p.projeto_id AND ep.ativo=true
        WHERE p.ativo=true AND COALESCE(ep.percentual_ponderado,0) < 100 AND ep.data_prevista::DATE < CURRENT_DATE
    ) AS projetos_atrasados,
    (SELECT ROUND(COALESCE(AVG(percentual_ponderado),0),2) FROM projetos WHERE ativo=true) AS percentual_concluido_medio,
    (SELECT COUNT(*) FROM engenheiros_projetos WHERE ativo=true) AS total_areas,
    (SELECT COUNT(*) FROM engenheiros_projetos WHERE ativo=true AND data_conclusao IS NOT NULL) AS areas_concluidas,
    (SELECT COUNT(*) FROM engenheiros_projetos WHERE ativo=true AND data_conclusao IS NULL) AS areas_ativas;

-- 9d) Carga de trabalho por engenheiro
DROP VIEW IF EXISTS vw_bloco3_carga_trabalho;
CREATE VIEW vw_bloco3_carga_trabalho AS
SELECT e.eng_id, e.nome AS engenheiro, e.exclusivo,
    COALESCE(SUM(ep.tempo_trabalho_dias) FILTER (WHERE ep.data_conclusao IS NULL AND ep.ativo=true),0) AS dias_estimados_totais,
    ROUND(COALESCE(AVG(ep.percentual_ponderado) FILTER (WHERE ep.data_conclusao IS NULL AND ep.ativo=true),0),2) AS percentual_execucao_media,
    ROUND(COALESCE(SUM(ep.tempo_trabalho_dias * (100 - COALESCE(ep.percentual_ponderado,0))/100.0) FILTER (WHERE ep.data_conclusao IS NULL AND ep.ativo=true),0),0) AS dias_restantes,
    COUNT(ep.id) FILTER (WHERE ep.data_conclusao IS NULL AND ep.ativo=true) AS areas_ativas,
    COUNT(DISTINCT ep.projeto_id) FILTER (WHERE ep.data_conclusao IS NULL AND ep.ativo=true) AS projetos_ativos
FROM engenheiros e
LEFT JOIN engenheiros_projetos ep ON ep.eng_id=e.eng_id
WHERE e.ativo=true GROUP BY e.eng_id, e.nome, e.exclusivo ORDER BY dias_restantes DESC;

-- 9e) Execução média por engenheiro
DROP VIEW IF EXISTS vw_bloco4_execucao_media;
CREATE VIEW vw_bloco4_execucao_media AS
SELECT e.eng_id, e.nome AS engenheiro,
    COALESCE(SUM(a.tempo_trabalho_dias),0) AS dias_estimados_totais,
    ROUND(COALESCE(SUM(a.tempo_trabalho_dias * COALESCE(ep.percentual_ponderado,0)/100.0),0),0) AS dias_executados,
    ROUND(COALESCE(AVG(ep.percentual_ponderado),0),2) AS percentual_execucao_media,
    ROUND(COALESCE(SUM(a.tempo_trabalho_dias * (100 - COALESCE(ep.percentual_ponderado,0))/100.0),0),0) AS dias_restantes
FROM engenheiros e
LEFT JOIN engenheiros_projetos ep ON ep.eng_id=e.eng_id AND ep.ativo=true
LEFT JOIN areas a ON a.area_id=ep.area_id
WHERE e.ativo=true GROUP BY e.eng_id, e.nome ORDER BY percentual_execucao_media DESC;

-- 9f) Gráfico: carga de trabalho
DROP VIEW IF EXISTS vw_grafico_carga_trabalho;
CREATE VIEW vw_grafico_carga_trabalho AS
SELECT e.nome AS engenheiro,
    ROUND(COALESCE(SUM(ep.tempo_trabalho_dias * COALESCE(ep.percentual_ponderado,0)/100.0) FILTER (WHERE ep.data_conclusao IS NULL AND ep.ativo=true),0),0) AS dias_concluidos,
    ROUND(COALESCE(SUM(ep.tempo_trabalho_dias * (100 - COALESCE(ep.percentual_ponderado,0))/100.0) FILTER (WHERE ep.data_conclusao IS NULL AND ep.ativo=true),0),0) AS dias_restantes
FROM engenheiros e
LEFT JOIN engenheiros_projetos ep ON ep.eng_id=e.eng_id
WHERE e.ativo=true GROUP BY e.eng_id, e.nome
ORDER BY COALESCE(SUM(ep.tempo_trabalho_dias),0) DESC;

SELECT '✅ Conclusão agora é por área (engenheiros_projetos.percentual_ponderado); projeto concluído = todas as áreas 100%' AS resultado;