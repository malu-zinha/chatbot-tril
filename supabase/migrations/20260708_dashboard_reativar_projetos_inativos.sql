-- =====================================================
-- MIGRACAO: Reativa projetos inativos no recadastro
-- =====================================================
-- Projetos excluidos pelo chatbot ficam em projetos.ativo = false.
-- Como codigo_projeto e unico, o dashboard precisa reativar o registro
-- existente em vez de tentar criar outro projeto com o mesmo codigo.
-- =====================================================

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
    v_codigo_projeto TEXT;
    v_cliente TEXT;
    v_descricao TEXT;
    v_reativado BOOLEAN := false;
BEGIN
    v_codigo_projeto := btrim(COALESCE(p_codigo_projeto, ''));
    v_cliente := btrim(COALESCE(p_cliente, ''));
    v_descricao := NULLIF(btrim(COALESCE(p_descricao, '')), '');

    IF NULLIF(v_codigo_projeto, '') IS NULL THEN
        RETURN json_build_object('sucesso', false, 'mensagem', 'Codigo do projeto e obrigatorio');
    END IF;

    IF NULLIF(v_cliente, '') IS NULL THEN
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
    WHERE codigo_projeto = v_codigo_projeto
    FOR UPDATE;

    IF v_projeto_id IS NULL THEN
        INSERT INTO projetos (codigo_projeto, cliente, descricao, ativo)
        VALUES (v_codigo_projeto, v_cliente, v_descricao, true)
        RETURNING projeto_id, ativo INTO v_projeto_id, v_projeto_ativo;
    ELSIF v_projeto_ativo = false THEN
        UPDATE projetos
        SET
            ativo = true,
            cliente = v_cliente,
            descricao = v_descricao,
            updated_at = NOW()
        WHERE projeto_id = v_projeto_id
        RETURNING ativo INTO v_projeto_ativo;

        v_reativado := true;

        -- Um projeto inativo nao deve manter tarefas ou atribuicoes ativas.
        -- O recadastro cria uma nova task ativa logo abaixo.
        UPDATE engenheiros_projetos
        SET
            ativo = false,
            updated_at = NOW()
        WHERE projeto_id = v_projeto_id
          AND ativo = true;

        UPDATE evandro_distribuicao_tasks
        SET
            ativo = false,
            updated_at = NOW()
        WHERE projeto_id = v_projeto_id
          AND ativo = true;

        UPDATE notificacoes_whatsapp
        SET
            enviada = true,
            data_envio = COALESCE(data_envio, NOW()),
            erro_envio = COALESCE(erro_envio, 'Cancelada por exclusao do projeto')
        WHERE projeto_id = v_projeto_id
          AND enviada = false;

        DELETE FROM projeto_etapas_globais
        WHERE projeto_id = v_projeto_id;

        DELETE FROM projeto_pavimentos
        WHERE projeto_id = v_projeto_id;
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
        v_codigo_projeto,
        v_cliente,
        p_area_id,
        v_complexidade_id,
        COALESCE(v_descricao, 'Projeto ' || v_codigo_projeto),
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
        'instancia_label', v_instancia_label,
        'reativado', v_reativado
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'sucesso', false,
        'mensagem', 'Erro ao atribuir projeto: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION criar_projeto(
    p_codigo TEXT,
    p_cliente TEXT,
    p_descricao TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_projeto_id UUID;
    v_projeto_ativo BOOLEAN;
    v_codigo TEXT;
    v_cliente TEXT;
    v_descricao TEXT;
    v_reativado BOOLEAN := false;
BEGIN
    v_codigo := UPPER(TRIM(COALESCE(p_codigo, '')));
    v_cliente := TRIM(COALESCE(p_cliente, ''));
    v_descricao := NULLIF(TRIM(COALESCE(p_descricao, '')), '');

    IF v_codigo = '' THEN
        RETURN json_build_object(
            'sucesso', false,
            'mensagem', 'Codigo do projeto e obrigatorio'
        );
    END IF;

    IF v_cliente = '' THEN
        RETURN json_build_object(
            'sucesso', false,
            'mensagem', 'Nome do cliente e obrigatorio'
        );
    END IF;

    SELECT projeto_id, ativo INTO v_projeto_id, v_projeto_ativo
    FROM projetos
    WHERE codigo_projeto = v_codigo
    FOR UPDATE;

    IF v_projeto_id IS NOT NULL AND v_projeto_ativo = true THEN
        RETURN json_build_object(
            'sucesso', false,
            'mensagem', 'Codigo de projeto ja existe'
        );
    END IF;

    IF v_projeto_id IS NOT NULL AND v_projeto_ativo = false THEN
        UPDATE projetos
        SET
            ativo = true,
            cliente = v_cliente,
            descricao = v_descricao,
            updated_at = NOW()
        WHERE projeto_id = v_projeto_id;

        UPDATE engenheiros_projetos
        SET
            ativo = false,
            updated_at = NOW()
        WHERE projeto_id = v_projeto_id
          AND ativo = true;

        UPDATE evandro_distribuicao_tasks
        SET
            ativo = false,
            updated_at = NOW()
        WHERE projeto_id = v_projeto_id
          AND ativo = true;

        UPDATE notificacoes_whatsapp
        SET
            enviada = true,
            data_envio = COALESCE(data_envio, NOW()),
            erro_envio = COALESCE(erro_envio, 'Cancelada por exclusao do projeto')
        WHERE projeto_id = v_projeto_id
          AND enviada = false;

        DELETE FROM projeto_etapas_globais
        WHERE projeto_id = v_projeto_id;

        DELETE FROM projeto_pavimentos
        WHERE projeto_id = v_projeto_id;

        v_reativado := true;
    ELSE
        INSERT INTO projetos (codigo_projeto, cliente, descricao, ativo)
        VALUES (v_codigo, v_cliente, v_descricao, true)
        RETURNING projeto_id INTO v_projeto_id;
    END IF;

    RETURN json_build_object(
        'sucesso', true,
        'mensagem', CASE
            WHEN v_reativado THEN 'Projeto reativado com sucesso!'
            ELSE 'Projeto criado com sucesso!'
        END,
        'projeto_id', v_projeto_id,
        'codigo', v_codigo,
        'cliente', v_cliente,
        'reativado', v_reativado
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'sucesso', false,
        'mensagem', 'Erro ao criar projeto: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION desativar_projeto_completo(
    p_projeto_id UUID,
    p_origem TEXT DEFAULT 'sistema',
    p_actor_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_codigo_projeto TEXT;
    v_projeto_ativo BOOLEAN;
    v_atribuicoes_desativadas INTEGER := 0;
    v_tasks_desativadas INTEGER := 0;
    v_notificacoes_canceladas INTEGER := 0;
BEGIN
    SELECT codigo_projeto, ativo INTO v_codigo_projeto, v_projeto_ativo
    FROM projetos
    WHERE projeto_id = p_projeto_id
    FOR UPDATE;

    IF v_codigo_projeto IS NULL THEN
        RETURN json_build_object(
            'ok', false,
            'codigo', 'nao_encontrado',
            'mensagem', 'Projeto nao encontrado.'
        );
    END IF;

    UPDATE projetos
    SET
        ativo = false,
        updated_at = NOW()
    WHERE projeto_id = p_projeto_id
      AND ativo = true;

    UPDATE engenheiros_projetos
    SET
        ativo = false,
        updated_at = NOW()
    WHERE projeto_id = p_projeto_id
      AND ativo = true;
    GET DIAGNOSTICS v_atribuicoes_desativadas = ROW_COUNT;

    UPDATE evandro_distribuicao_tasks
    SET
        ativo = false,
        updated_at = NOW()
    WHERE projeto_id = p_projeto_id
      AND ativo = true;
    GET DIAGNOSTICS v_tasks_desativadas = ROW_COUNT;

    UPDATE notificacoes_whatsapp
    SET
        enviada = true,
        data_envio = COALESCE(data_envio, NOW()),
        erro_envio = COALESCE(erro_envio, 'Cancelada por exclusao do projeto')
    WHERE projeto_id = p_projeto_id
      AND enviada = false;
    GET DIAGNOSTICS v_notificacoes_canceladas = ROW_COUNT;

    RETURN json_build_object(
        'ok', true,
        'codigo', CASE WHEN v_projeto_ativo THEN 'desativado' ELSE 'ja_inativo' END,
        'mensagem', CASE
            WHEN v_projeto_ativo THEN 'Projeto desativado com sucesso.'
            ELSE 'Projeto ja estava inativo.'
        END,
        'projeto_id', p_projeto_id,
        'codigo_projeto', v_codigo_projeto,
        'atribuicoes_desativadas', v_atribuicoes_desativadas,
        'tasks_desativadas', v_tasks_desativadas,
        'notificacoes_canceladas', v_notificacoes_canceladas,
        'origem', p_origem,
        'actor_user_id', p_actor_user_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'ok', false,
        'codigo', 'erro_interno',
        'mensagem', 'Erro ao desativar projeto: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- Reparo unico para inconsistencias ja existentes: se o projeto esta
-- inativo, nenhuma atribuicao/task pendente dele deve permanecer ativa.
UPDATE engenheiros_projetos ep
SET
    ativo = false,
    updated_at = NOW()
FROM projetos p
WHERE ep.projeto_id = p.projeto_id
  AND p.ativo = false
  AND ep.ativo = true;

UPDATE evandro_distribuicao_tasks t
SET
    ativo = false,
    updated_at = NOW()
FROM projetos p
WHERE t.projeto_id = p.projeto_id
  AND p.ativo = false
  AND t.ativo = true;

UPDATE notificacoes_whatsapp n
SET
    enviada = true,
    data_envio = COALESCE(n.data_envio, NOW()),
    erro_envio = COALESCE(n.erro_envio, 'Cancelada por exclusao do projeto')
FROM projetos p
WHERE n.projeto_id = p.projeto_id
  AND p.ativo = false
  AND n.enviada = false;

COMMENT ON FUNCTION desativar_projeto_completo IS
'Desativa projeto completo, atribuicoes, tasks e notificacoes pendentes na mesma transacao.';

CREATE OR REPLACE FUNCTION verificar_atribuicao_info(
    p_atribuicao_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_projeto_id UUID;
    v_codigo_projeto TEXT;
    v_area_descricao TEXT;
    v_eng_nome TEXT;
    v_total_disciplinas INTEGER := 0;
BEGIN
    SELECT
        ep.projeto_id,
        p.codigo_projeto,
        a.descricao,
        e.nome
    INTO
        v_projeto_id,
        v_codigo_projeto,
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
            'mensagem', 'Atribuicao nao encontrada ou ja excluida.'
        );
    END IF;

    SELECT COUNT(*) INTO v_total_disciplinas
    FROM engenheiros_projetos
    WHERE projeto_id = v_projeto_id
      AND ativo = true;

    RETURN json_build_object(
        'ok', true,
        'atribuicao_id', p_atribuicao_id,
        'projeto_id', v_projeto_id,
        'codigo_projeto', v_codigo_projeto,
        'area_descricao', v_area_descricao,
        'engenheiro_nome', v_eng_nome,
        'total_disciplinas_ativas', v_total_disciplinas,
        'is_ultima_disciplina', (v_total_disciplinas <= 1)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'ok', false,
        'codigo', 'erro_interno',
        'mensagem', 'Erro ao verificar atribuicao: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verificar_atribuicao_info IS
'Retorna informacoes sobre uma atribuicao, incluindo se e a ultima disciplina ativa do projeto.';
