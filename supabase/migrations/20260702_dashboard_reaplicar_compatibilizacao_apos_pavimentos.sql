-- =====================================================
-- MIGRACAO: Reaplica compatibilizacao apos pavimentos
-- =====================================================
-- Mantem o historico da migration 20260630 ja aplicada e garante
-- que a RPC final seja a versao com p_instancia_label depois que
-- 20260630_dashboard_pavimentos_customizados.sql recriar a RPC base.
-- =====================================================

DROP FUNCTION IF EXISTS dashboard_atribuir_projeto_com_pavimentos(
    TEXT,
    TEXT,
    TEXT,
    UUID,
    UUID,
    TEXT,
    DATE,
    TEXT[]
);

CREATE OR REPLACE FUNCTION dashboard_atribuir_projeto_com_pavimentos(
    p_codigo_projeto TEXT,
    p_cliente TEXT,
    p_descricao TEXT,
    p_area_id UUID,
    p_eng_id UUID,
    p_complexidade_codigo TEXT DEFAULT 'MEDIA',
    p_data_conclusao_prevista DATE DEFAULT NULL,
    p_pavimentos TEXT[] DEFAULT ARRAY[]::TEXT[],
    p_instancia_label TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_projeto_id UUID;
    v_task_id UUID;
    v_eng_projeto_id UUID;
    v_complexidade_id INTEGER;
    v_area_codigo TEXT;
    v_area_descricao TEXT;
    v_eng_nome TEXT;
    v_projeto_ativo BOOLEAN;
    v_instancia_label TEXT;
    v_fallback_numero INTEGER;
BEGIN
    IF NULLIF(btrim(COALESCE(p_codigo_projeto, '')), '') IS NULL THEN
        RETURN json_build_object('sucesso', false, 'mensagem', 'Codigo do projeto e obrigatorio');
    END IF;

    IF NULLIF(btrim(COALESCE(p_cliente, '')), '') IS NULL THEN
        RETURN json_build_object('sucesso', false, 'mensagem', 'Cliente e obrigatorio');
    END IF;

    SELECT codigo, descricao INTO v_area_codigo, v_area_descricao
    FROM areas
    WHERE area_id = p_area_id
      AND ativo = true;

    IF v_area_descricao IS NULL THEN
        RETURN json_build_object('sucesso', false, 'mensagem', 'Area nao encontrada ou inativa');
    END IF;

    IF EXISTS (
        SELECT 1
        FROM area_etapas_template
        WHERE area_id = p_area_id
          AND tipo = 'pavimento'
          AND ativo = true
    ) AND NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p_pavimentos, ARRAY[]::TEXT[])) AS pavimento(nome)
        WHERE btrim(regexp_replace(COALESCE(pavimento.nome, ''), '\s+', ' ', 'g')) <> ''
    ) THEN
        RETURN json_build_object(
            'sucesso', false,
            'mensagem', 'Informe ao menos um pavimento para esta disciplina'
        );
    END IF;

    SELECT nome INTO v_eng_nome
    FROM engenheiros
    WHERE eng_id = p_eng_id
      AND ativo = true;

    IF v_eng_nome IS NULL THEN
        RETURN json_build_object('sucesso', false, 'mensagem', 'Engenheiro nao encontrado ou inativo');
    END IF;

    SELECT projeto_id, ativo INTO v_projeto_id, v_projeto_ativo
    FROM projetos
    WHERE codigo_projeto = btrim(p_codigo_projeto);

    IF v_projeto_id IS NULL THEN
        INSERT INTO projetos (codigo_projeto, cliente, descricao, ativo)
        VALUES (
            btrim(p_codigo_projeto),
            btrim(p_cliente),
            NULLIF(btrim(COALESCE(p_descricao, '')), ''),
            true
        )
        RETURNING projeto_id, ativo INTO v_projeto_id, v_projeto_ativo;
    END IF;

    IF v_projeto_ativo = false THEN
        RETURN json_build_object('sucesso', false, 'mensagem', 'Projeto existe, mas esta inativo');
    END IF;

    IF v_area_codigo = 'COMPATIBILIZACAO' THEN
        SELECT COUNT(*) + 1 INTO v_fallback_numero
        FROM engenheiros_projetos
        WHERE projeto_id = v_projeto_id
          AND area_id = p_area_id
          AND ativo = true;

        v_instancia_label := normalizar_label_compatibilizacao(
            p_instancia_label,
            v_fallback_numero
        );

        IF EXISTS (
            SELECT 1
            FROM engenheiros_projetos
            WHERE projeto_id = v_projeto_id
              AND area_id = p_area_id
              AND ativo = true
              AND lower(instancia_label) = lower(v_instancia_label)
        ) THEN
            RETURN json_build_object(
                'sucesso', false,
                'mensagem', 'Ja existe uma compatibilizacao com esta identificacao neste projeto'
            );
        END IF;
    ELSIF EXISTS (
        SELECT 1
        FROM engenheiros_projetos
        WHERE eng_id = p_eng_id
          AND projeto_id = v_projeto_id
          AND area_id = p_area_id
          AND ativo = true
    ) THEN
        RETURN json_build_object(
            'sucesso', false,
            'mensagem', 'Engenheiro ja esta atribuido a esta disciplina neste projeto'
        );
    END IF;

    SELECT complexidade_id INTO v_complexidade_id
    FROM complexidade_tarefas
    WHERE UPPER(codigo) = UPPER(TRIM(COALESCE(p_complexidade_codigo, 'MEDIA')))
      AND ativo = true;

    IF v_complexidade_id IS NULL THEN
        SELECT complexidade_id INTO v_complexidade_id
        FROM complexidade_tarefas
        WHERE codigo = 'MEDIA'
          AND ativo = true;
    END IF;

    INSERT INTO evandro_distribuicao_tasks (
        eng_id,
        projeto_id,
        codigo_projeto,
        cliente,
        area_id,
        complexidade_id,
        descricao_task,
        data_conclusao_prevista,
        status_task,
        instancia_label
    ) VALUES (
        p_eng_id,
        v_projeto_id,
        btrim(p_codigo_projeto),
        btrim(p_cliente),
        p_area_id,
        v_complexidade_id,
        COALESCE(NULLIF(btrim(COALESCE(p_descricao, '')), ''), 'Projeto ' || btrim(p_codigo_projeto)),
        p_data_conclusao_prevista,
        'PENDENTE',
        v_instancia_label
    )
    RETURNING task_id, eng_projeto_id, instancia_label
    INTO v_task_id, v_eng_projeto_id, v_instancia_label;

    IF v_eng_projeto_id IS NULL THEN
        SELECT id, instancia_label INTO v_eng_projeto_id, v_instancia_label
        FROM engenheiros_projetos
        WHERE eng_id = p_eng_id
          AND projeto_id = v_projeto_id
          AND area_id = p_area_id
          AND ativo = true
          AND (
              v_area_codigo <> 'COMPATIBILIZACAO'
              OR lower(instancia_label) = lower(v_instancia_label)
          )
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    PERFORM configurar_pavimentos_customizados_area(v_projeto_id, p_area_id, p_pavimentos);

    RETURN json_build_object(
        'sucesso', true,
        'mensagem', 'Projeto atribuido com sucesso',
        'projeto_id', v_projeto_id,
        'task_id', v_task_id,
        'eng_projeto_id', v_eng_projeto_id,
        'engenheiro', v_eng_nome,
        'area', v_area_descricao,
        'instancia_label', v_instancia_label
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'sucesso', false,
        'mensagem', 'Erro ao atribuir projeto: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

DROP VIEW IF EXISTS vw_projetos_detalhado;
CREATE VIEW vw_projetos_detalhado AS
SELECT
    ep.id AS atribuicao_id,
    p.projeto_id,
    p.codigo_projeto,
    COALESCE(p.cliente, 'Sem cliente') AS cliente,
    p.descricao,
    COALESCE(e.nome, 'Sem engenheiro') AS engenheiro_nome,
    a.codigo AS area_codigo,
    COALESCE(a.descricao, 'Sem área') AS area_descricao,
    ep.instancia_label,
    CASE
        WHEN COALESCE(ep.percentual_ponderado, 0) >= 100 THEN 'Concluído'
        WHEN COALESCE(ep.percentual_ponderado, 0) > 0 THEN 'Em Andamento'
        ELSE 'Aguardando Início'
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
WHERE p.ativo = true
ORDER BY p.created_at DESC;
