-- =====================================================
-- MIGRACAO: Dashboard - atribuicao com pavimentos customizados
-- =====================================================
-- Permite que o dashboard atribua uma disciplina e, quando a area usa
-- etapas por pavimento, substitua os pavimentos padrao pelos nomes
-- informados no cadastro/atribuicao.
-- =====================================================

CREATE OR REPLACE FUNCTION configurar_pavimentos_customizados_area(
    p_projeto_id UUID,
    p_area_id UUID,
    p_pavimentos TEXT[]
)
RETURNS VOID AS $$
DECLARE
    v_raw TEXT;
    v_nome TEXT;
    v_nomes TEXT[] := ARRAY[]::TEXT[];
    v_globais_count INTEGER;
    v_etapas_pav_count INTEGER;
    v_total_n1 INTEGER;
    v_peso_n1 NUMERIC(5,2);
    v_peso_etapa NUMERIC(5,2);
    v_pavimento_id UUID;
    v_ordem INTEGER := 0;
BEGIN
    FOREACH v_raw IN ARRAY COALESCE(p_pavimentos, ARRAY[]::TEXT[]) LOOP
        v_nome := btrim(regexp_replace(COALESCE(v_raw, ''), '\s+', ' ', 'g'));

        IF v_nome <> ''
           AND NOT EXISTS (
               SELECT 1
               FROM unnest(v_nomes) AS nome_existente(nome)
               WHERE lower(nome_existente.nome) = lower(v_nome)
           )
        THEN
            v_nomes := array_append(v_nomes, v_nome);
        END IF;
    END LOOP;

    IF COALESCE(array_length(v_nomes, 1), 0) = 0 THEN
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_etapas_pav_count
    FROM area_etapas_template
    WHERE area_id = p_area_id
      AND tipo = 'pavimento'
      AND ativo = true;

    IF v_etapas_pav_count = 0 THEN
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_globais_count
    FROM area_etapas_template
    WHERE area_id = p_area_id
      AND tipo = 'global'
      AND ativo = true;

    v_total_n1 := COALESCE(array_length(v_nomes, 1), 0) + v_globais_count;
    IF v_total_n1 = 0 THEN
        RETURN;
    END IF;

    v_peso_n1 := ROUND(100.0 / v_total_n1, 2);
    v_peso_etapa := ROUND(100.0 / v_etapas_pav_count, 2);

    IF EXISTS (
        SELECT 1
        FROM projeto_pavimentos pp
        JOIN pavimento_etapas pe ON pe.pavimento_id = pp.pavimento_id
        WHERE pp.projeto_id = p_projeto_id
          AND pp.area_id = p_area_id
          AND pe.concluida = true
    ) OR EXISTS (
        SELECT 1
        FROM projeto_etapas_globais peg
        WHERE peg.projeto_id = p_projeto_id
          AND peg.area_id = p_area_id
          AND peg.concluida = true
    ) THEN
        RAISE EXCEPTION 'Nao e possivel substituir pavimentos de uma disciplina com progresso concluido';
    END IF;

    DELETE FROM projeto_pavimentos
    WHERE projeto_id = p_projeto_id
      AND area_id = p_area_id;

    UPDATE projeto_etapas_globais
    SET peso = v_peso_n1
    WHERE projeto_id = p_projeto_id
      AND area_id = p_area_id
      AND ativo = true;

    FOREACH v_nome IN ARRAY v_nomes LOOP
        v_ordem := v_ordem + 1;

        INSERT INTO projeto_pavimentos (projeto_id, area_id, nome, ordem, peso, ativo)
        VALUES (p_projeto_id, p_area_id, v_nome, v_ordem, v_peso_n1, true)
        RETURNING pavimento_id INTO v_pavimento_id;

        INSERT INTO pavimento_etapas (pavimento_id, nome, peso, ativo)
        SELECT v_pavimento_id, nome, v_peso_etapa, true
        FROM area_etapas_template
        WHERE area_id = p_area_id
          AND tipo = 'pavimento'
          AND ativo = true
        ORDER BY ordem;
    END LOOP;

    PERFORM ajustar_residuo_pesos(p_projeto_id, p_area_id);
    PERFORM recalcular_rollup_projeto(p_projeto_id);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION configurar_pavimentos_customizados_area IS
'Substitui pavimentos padrao por nomes customizados e recria etapas da area mantendo pesos consistentes.';

CREATE OR REPLACE FUNCTION dashboard_atribuir_projeto_com_pavimentos(
    p_codigo_projeto TEXT,
    p_cliente TEXT,
    p_descricao TEXT,
    p_area_id UUID,
    p_eng_id UUID,
    p_complexidade_codigo TEXT DEFAULT 'MEDIA',
    p_data_conclusao_prevista DATE DEFAULT NULL,
    p_pavimentos TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS JSON AS $$
DECLARE
    v_projeto_id UUID;
    v_task_id UUID;
    v_eng_projeto_id UUID;
    v_complexidade_id INTEGER;
    v_area_descricao TEXT;
    v_eng_nome TEXT;
    v_projeto_ativo BOOLEAN;
BEGIN
    IF NULLIF(btrim(COALESCE(p_codigo_projeto, '')), '') IS NULL THEN
        RETURN json_build_object('sucesso', false, 'mensagem', 'Codigo do projeto e obrigatorio');
    END IF;

    IF NULLIF(btrim(COALESCE(p_cliente, '')), '') IS NULL THEN
        RETURN json_build_object('sucesso', false, 'mensagem', 'Cliente e obrigatorio');
    END IF;

    SELECT descricao INTO v_area_descricao
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

    IF EXISTS (
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
        status_task
    ) VALUES (
        p_eng_id,
        v_projeto_id,
        btrim(p_codigo_projeto),
        btrim(p_cliente),
        p_area_id,
        v_complexidade_id,
        COALESCE(NULLIF(btrim(COALESCE(p_descricao, '')), ''), 'Projeto ' || btrim(p_codigo_projeto)),
        p_data_conclusao_prevista,
        'PENDENTE'
    )
    RETURNING task_id, eng_projeto_id INTO v_task_id, v_eng_projeto_id;

    IF v_eng_projeto_id IS NULL THEN
        SELECT id INTO v_eng_projeto_id
        FROM engenheiros_projetos
        WHERE eng_id = p_eng_id
          AND projeto_id = v_projeto_id
          AND area_id = p_area_id
          AND ativo = true
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
        'area', v_area_descricao
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'sucesso', false,
        'mensagem', 'Erro ao atribuir projeto: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION dashboard_atribuir_projeto_com_pavimentos IS
'RPC transacional usada pelo dashboard para atribuir projeto e configurar pavimentos customizados quando informados.';
