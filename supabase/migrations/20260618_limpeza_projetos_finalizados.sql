-- =====================================================
-- MIGRACAO: Limpeza semestral de projetos finalizados
-- =====================================================
-- Remove fisicamente projetos ativos que ja estao 100% concluidos
-- ha pelo menos N meses. Por padrao roda em dry-run.
-- =====================================================

CREATE OR REPLACE FUNCTION limpar_projetos_finalizados_antigos(
    p_meses INTEGER DEFAULT 6,
    p_dry_run BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
    v_data_limite DATE;
    v_projeto_ids UUID[];
    v_candidatos INTEGER;
    v_excluidos INTEGER := 0;
BEGIN
    IF p_meses IS NULL OR p_meses < 1 THEN
        RAISE EXCEPTION 'p_meses deve ser maior ou igual a 1';
    END IF;

    v_data_limite := (CURRENT_DATE - make_interval(months => p_meses))::DATE;

    SELECT COALESCE(array_agg(projeto_id), ARRAY[]::UUID[])
    INTO v_projeto_ids
    FROM (
        SELECT
            p.projeto_id,
            MAX(ep.data_conclusao) AS ultima_conclusao
        FROM projetos p
        JOIN engenheiros_projetos ep
            ON ep.projeto_id = p.projeto_id
           AND ep.ativo = true
        WHERE p.ativo = true
        GROUP BY p.projeto_id
        HAVING
            COUNT(*) > 0
            AND BOOL_AND(COALESCE(ep.percentual_ponderado, 0) >= 100)
            AND MAX(ep.data_conclusao) IS NOT NULL
            AND MAX(ep.data_conclusao)::DATE <= v_data_limite
    ) candidatos;

    v_candidatos := COALESCE(array_length(v_projeto_ids, 1), 0);

    IF p_dry_run OR v_candidatos = 0 THEN
        RETURN jsonb_build_object(
            'dry_run', p_dry_run,
            'meses_retencao', p_meses,
            'data_limite', v_data_limite,
            'projetos_candidatos', v_candidatos,
            'projetos_excluidos', 0
        );
    END IF;

    DELETE FROM notificacoes_whatsapp
    WHERE projeto_id = ANY(v_projeto_ids)
       OR task_id IN (
            SELECT task_id
            FROM evandro_distribuicao_tasks
            WHERE projeto_id = ANY(v_projeto_ids)
       );

    DELETE FROM projetos_previsao
    WHERE projeto_id = ANY(v_projeto_ids);

    DELETE FROM retrabalho_projetos
    WHERE projeto_id = ANY(v_projeto_ids);

    DELETE FROM prazos
    WHERE projeto_id = ANY(v_projeto_ids);

    DELETE FROM evandro_distribuicao_tasks
    WHERE projeto_id = ANY(v_projeto_ids);

    DELETE FROM projeto_etapas_globais
    WHERE projeto_id = ANY(v_projeto_ids);

    DELETE FROM pavimento_etapas
    WHERE pavimento_id IN (
        SELECT pavimento_id
        FROM projeto_pavimentos
        WHERE projeto_id = ANY(v_projeto_ids)
    );

    DELETE FROM projeto_pavimentos
    WHERE projeto_id = ANY(v_projeto_ids);

    DELETE FROM engenheiros_projetos
    WHERE projeto_id = ANY(v_projeto_ids);

    DELETE FROM projetos
    WHERE projeto_id = ANY(v_projeto_ids);

    GET DIAGNOSTICS v_excluidos = ROW_COUNT;

    RETURN jsonb_build_object(
        'dry_run', false,
        'meses_retencao', p_meses,
        'data_limite', v_data_limite,
        'projetos_candidatos', v_candidatos,
        'projetos_excluidos', v_excluidos
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION limpar_projetos_finalizados_antigos IS
    'Remove fisicamente projetos concluidos ha pelo menos N meses; use p_dry_run=true para auditar antes.';
