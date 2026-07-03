-- =====================================================
-- MIGRACAO: Dashboard - transferir e excluir atribuicoes
-- =====================================================
-- Centraliza as regras usadas por dashboard e chatbot para manter
-- engenheiros_projetos e evandro_distribuicao_tasks sincronizadas.
-- =====================================================

CREATE OR REPLACE FUNCTION transferir_atribuicao(
    p_atribuicao_id UUID,
    p_novo_eng_id UUID,
    p_origem TEXT DEFAULT 'sistema',
    p_actor_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_projeto_id UUID;
    v_area_id UUID;
    v_eng_antigo_id UUID;
    v_instancia_label TEXT;
    v_area_codigo TEXT;
    v_codigo_projeto TEXT;
    v_eng_antigo_nome TEXT;
    v_eng_novo_nome TEXT;
    v_tasks_atualizadas INTEGER := 0;
BEGIN
    SELECT
        ep.projeto_id,
        ep.area_id,
        ep.eng_id,
        ep.instancia_label,
        a.codigo,
        p.codigo_projeto,
        e.nome
    INTO
        v_projeto_id,
        v_area_id,
        v_eng_antigo_id,
        v_instancia_label,
        v_area_codigo,
        v_codigo_projeto,
        v_eng_antigo_nome
    FROM engenheiros_projetos ep
    JOIN areas a ON a.area_id = ep.area_id
    JOIN projetos p ON p.projeto_id = ep.projeto_id
    LEFT JOIN engenheiros e ON e.eng_id = ep.eng_id
    WHERE ep.id = p_atribuicao_id
      AND ep.ativo = true
    LIMIT 1;

    IF v_projeto_id IS NULL THEN
        RETURN json_build_object(
            'ok', false,
            'codigo', 'nao_encontrada',
            'mensagem', 'Tarefa nao encontrada ou ja excluida.'
        );
    END IF;

    IF p_novo_eng_id = v_eng_antigo_id THEN
        RETURN json_build_object(
            'ok', false,
            'codigo', 'mesmo_engenheiro',
            'mensagem', 'O engenheiro destino ja e o responsavel atual.'
        );
    END IF;

    SELECT nome INTO v_eng_novo_nome
    FROM engenheiros
    WHERE eng_id = p_novo_eng_id
      AND ativo = true
    LIMIT 1;

    IF v_eng_novo_nome IS NULL THEN
        RETURN json_build_object(
            'ok', false,
            'codigo', 'destino_invalido',
            'mensagem', 'Engenheiro destino nao encontrado ou inativo.'
        );
    END IF;

    IF EXISTS (
        SELECT 1
        FROM engenheiros_projetos ep
        WHERE ep.eng_id = p_novo_eng_id
          AND ep.projeto_id = v_projeto_id
          AND ep.area_id = v_area_id
          AND ep.ativo = true
          AND ep.id <> p_atribuicao_id
          AND (
              v_area_codigo <> 'COMPATIBILIZACAO'
              OR COALESCE(ep.instancia_label, '') = COALESCE(v_instancia_label, '')
          )
    ) THEN
        RETURN json_build_object(
            'ok', false,
            'codigo', 'duplicata',
            'mensagem', 'O engenheiro destino ja possui essa mesma tarefa neste projeto.'
        );
    END IF;

    UPDATE engenheiros_projetos
    SET
        eng_id = p_novo_eng_id,
        updated_at = NOW()
    WHERE id = p_atribuicao_id
      AND ativo = true;

    UPDATE evandro_distribuicao_tasks
    SET
        eng_id = p_novo_eng_id,
        updated_at = NOW()
    WHERE eng_projeto_id = p_atribuicao_id
      AND ativo = true;

    GET DIAGNOSTICS v_tasks_atualizadas = ROW_COUNT;

    RETURN json_build_object(
        'ok', true,
        'codigo', 'transferida',
        'mensagem', 'Responsavel alterado com sucesso.',
        'atribuicao_id', p_atribuicao_id,
        'projeto_id', v_projeto_id,
        'codigo_projeto', v_codigo_projeto,
        'area_id', v_area_id,
        'area_codigo', v_area_codigo,
        'instancia_label', v_instancia_label,
        'eng_antigo_id', v_eng_antigo_id,
        'eng_antigo_nome', v_eng_antigo_nome,
        'eng_novo_id', p_novo_eng_id,
        'eng_novo_nome', v_eng_novo_nome,
        'tasks_atualizadas', v_tasks_atualizadas,
        'origem', p_origem,
        'actor_user_id', p_actor_user_id
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object(
            'ok', false,
            'codigo', 'duplicata',
            'mensagem', 'O engenheiro destino ja possui essa mesma tarefa neste projeto.'
        );
    WHEN OTHERS THEN
        RETURN json_build_object(
            'ok', false,
            'codigo', 'erro_interno',
            'mensagem', 'Erro ao transferir tarefa: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION desativar_atribuicao(
    p_atribuicao_id UUID,
    p_origem TEXT DEFAULT 'sistema',
    p_actor_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_projeto_id UUID;
    v_area_id UUID;
    v_eng_id UUID;
    v_codigo_projeto TEXT;
    v_area_codigo TEXT;
    v_area_descricao TEXT;
    v_eng_nome TEXT;
    v_total_areas_ativas INTEGER := 0;
    v_tasks_atualizadas INTEGER := 0;
BEGIN
    SELECT
        ep.projeto_id,
        ep.area_id,
        ep.eng_id,
        p.codigo_projeto,
        a.codigo,
        a.descricao,
        e.nome
    INTO
        v_projeto_id,
        v_area_id,
        v_eng_id,
        v_codigo_projeto,
        v_area_codigo,
        v_area_descricao,
        v_eng_nome
    FROM engenheiros_projetos ep
    JOIN projetos p ON p.projeto_id = ep.projeto_id
    JOIN areas a ON a.area_id = ep.area_id
    LEFT JOIN engenheiros e ON e.eng_id = ep.eng_id
    WHERE ep.id = p_atribuicao_id
      AND ep.ativo = true
    LIMIT 1;

    IF v_projeto_id IS NULL THEN
        RETURN json_build_object(
            'ok', false,
            'codigo', 'nao_encontrada',
            'mensagem', 'Tarefa nao encontrada ou ja excluida.'
        );
    END IF;

    SELECT COUNT(*) INTO v_total_areas_ativas
    FROM engenheiros_projetos
    WHERE projeto_id = v_projeto_id
      AND ativo = true;

    IF v_total_areas_ativas <= 1 THEN
        RETURN json_build_object(
            'ok', false,
            'codigo', 'ultima_area',
            'mensagem', 'Nao e possivel excluir a ultima disciplina ativa do projeto.'
        );
    END IF;

    UPDATE engenheiros_projetos
    SET
        ativo = false,
        updated_at = NOW()
    WHERE id = p_atribuicao_id
      AND ativo = true;

    UPDATE evandro_distribuicao_tasks
    SET
        ativo = false,
        updated_at = NOW()
    WHERE eng_projeto_id = p_atribuicao_id
      AND ativo = true;

    GET DIAGNOSTICS v_tasks_atualizadas = ROW_COUNT;

    RETURN json_build_object(
        'ok', true,
        'codigo', 'desativada',
        'mensagem', 'Tarefa excluida com sucesso.',
        'atribuicao_id', p_atribuicao_id,
        'projeto_id', v_projeto_id,
        'codigo_projeto', v_codigo_projeto,
        'area_id', v_area_id,
        'area_codigo', v_area_codigo,
        'area_descricao', v_area_descricao,
        'eng_id', v_eng_id,
        'engenheiro_nome', v_eng_nome,
        'tasks_atualizadas', v_tasks_atualizadas,
        'origem', p_origem,
        'actor_user_id', p_actor_user_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'ok', false,
        'codigo', 'erro_interno',
        'mensagem', 'Erro ao excluir tarefa: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

DROP VIEW IF EXISTS vw_projetos_detalhado;
CREATE VIEW vw_projetos_detalhado AS
SELECT
    ep.id AS atribuicao_id,
    ep.eng_id,
    ep.area_id,
    p.projeto_id,
    p.codigo_projeto,
    COALESCE(p.cliente, 'Sem cliente') AS cliente,
    p.descricao,
    COALESCE(e.nome, 'Sem engenheiro') AS engenheiro_nome,
    a.codigo AS area_codigo,
    COALESCE(a.descricao, 'Sem area') AS area_descricao,
    ep.instancia_label,
    CASE
        WHEN COALESCE(ep.percentual_ponderado, 0) >= 100 THEN 'Concluido'
        WHEN COALESCE(ep.percentual_ponderado, 0) > 0 THEN 'Em Andamento'
        ELSE 'Aguardando Inicio'
    END AS status_descricao,
    COALESCE(ep.percentual_ponderado, 0) AS percentual_andamento,
    ep.data_inicio,
    ep.data_prevista,
    ep.data_conclusao,
    CASE
        WHEN ep.data_prevista::DATE < CURRENT_DATE AND COALESCE(ep.percentual_ponderado, 0) < 100
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
WHERE p.ativo = true;

REVOKE ALL ON FUNCTION transferir_atribuicao(UUID, UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION desativar_atribuicao(UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transferir_atribuicao(UUID, UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION desativar_atribuicao(UUID, TEXT, UUID) TO service_role;
