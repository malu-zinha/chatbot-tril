-- =====================================================
-- MIGRACAO: Complemento com multiplas instancias
-- =====================================================
-- Permite mais de um Complemento no mesmo projeto, distinguindo a
-- disciplina referida e numerando automaticamente cada instancia.
-- =====================================================

ALTER TABLE engenheiros_projetos
    ADD COLUMN IF NOT EXISTS complemento_area_ref_id UUID REFERENCES areas(area_id);

ALTER TABLE evandro_distribuicao_tasks
    ADD COLUMN IF NOT EXISTS complemento_area_ref_id UUID REFERENCES areas(area_id);

COMMENT ON COLUMN engenheiros_projetos.complemento_area_ref_id IS
'Disciplina referida quando a area atribuida e Complemento.';

COMMENT ON COLUMN evandro_distribuicao_tasks.complemento_area_ref_id IS
'Disciplina referida para sincronizar tasks de Complemento com engenheiros_projetos.';

CREATE OR REPLACE FUNCTION validar_instancia_engenheiros_projetos()
RETURNS TRIGGER AS $$
DECLARE
    v_area_codigo TEXT;
    v_complemento_area_descricao TEXT;
    v_fallback_numero INTEGER;
BEGIN
    IF COALESCE(NEW.ativo, true) = false THEN
        RETURN NEW;
    END IF;

    SELECT codigo INTO v_area_codigo
    FROM areas
    WHERE area_id = NEW.area_id;

    -- Disciplinas multi-instancia: v_area_codigo IN ('COMPATIBILIZACAO', 'COMPLEMENTO')
    IF v_area_codigo = 'COMPATIBILIZACAO' THEN
        NEW.complemento_area_ref_id := NULL;

        SELECT COUNT(*) + 1 INTO v_fallback_numero
        FROM engenheiros_projetos
        WHERE projeto_id = NEW.projeto_id
          AND area_id = NEW.area_id
          AND ativo = true
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

        NEW.instancia_label := normalizar_label_compatibilizacao(
            NEW.instancia_label,
            v_fallback_numero
        );

        IF EXISTS (
            SELECT 1
            FROM engenheiros_projetos ep
            WHERE ep.projeto_id = NEW.projeto_id
              AND ep.area_id = NEW.area_id
              AND ep.ativo = true
              AND ep.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
              AND lower(ep.instancia_label) = lower(NEW.instancia_label)
        ) THEN
            RAISE EXCEPTION 'Ja existe uma compatibilizacao com esta identificacao neste projeto';
        END IF;
    ELSIF v_area_codigo = 'COMPLEMENTO' THEN
        IF NEW.complemento_area_ref_id IS NULL THEN
            RAISE EXCEPTION 'Informe a disciplina que este complemento se refere';
        END IF;

        IF NEW.complemento_area_ref_id = NEW.area_id THEN
            RAISE EXCEPTION 'Complemento nao pode referenciar Complemento';
        END IF;

        SELECT descricao INTO v_complemento_area_descricao
        FROM areas
        WHERE area_id = NEW.complemento_area_ref_id
          AND ativo = true;

        IF v_complemento_area_descricao IS NULL THEN
            RAISE EXCEPTION 'Disciplina de referencia do complemento nao encontrada ou inativa';
        END IF;

        SELECT COUNT(*) + 1 INTO v_fallback_numero
        FROM engenheiros_projetos ep
        WHERE ep.projeto_id = NEW.projeto_id
          AND ep.area_id = NEW.area_id
          AND ep.complemento_area_ref_id = NEW.complemento_area_ref_id
          AND ep.ativo = true
          AND ep.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

        NEW.instancia_label := 'Complemento de ' || v_complemento_area_descricao || ' ' || v_fallback_numero;

        IF EXISTS (
            SELECT 1
            FROM engenheiros_projetos ep
            WHERE ep.projeto_id = NEW.projeto_id
              AND ep.area_id = NEW.area_id
              AND ep.ativo = true
              AND ep.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
              AND lower(ep.instancia_label) = lower(NEW.instancia_label)
        ) THEN
            RAISE EXCEPTION 'Ja existe um complemento com esta identificacao neste projeto';
        END IF;
    ELSE
        NEW.instancia_label := NULL;
        NEW.complemento_area_ref_id := NULL;

        IF EXISTS (
            SELECT 1
            FROM engenheiros_projetos ep
            WHERE ep.eng_id = NEW.eng_id
              AND ep.projeto_id = NEW.projeto_id
              AND ep.area_id = NEW.area_id
              AND ep.ativo = true
              AND ep.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
        ) THEN
            RAISE EXCEPTION 'Engenheiro ja esta atribuido a esta disciplina neste projeto';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_instancia_engenheiros_projetos ON engenheiros_projetos;
CREATE TRIGGER trg_validar_instancia_engenheiros_projetos
    BEFORE INSERT OR UPDATE OF eng_id, projeto_id, area_id, instancia_label, complemento_area_ref_id, ativo
    ON engenheiros_projetos
    FOR EACH ROW
    EXECUTE FUNCTION validar_instancia_engenheiros_projetos();

CREATE OR REPLACE FUNCTION sincronizar_task_para_engenheiro()
RETURNS TRIGGER AS $$
DECLARE
    v_projeto_id UUID;
    v_eng_projeto_id UUID;
    v_status_id INTEGER;
BEGIN
    IF NEW.sincronizado = false THEN
        IF NEW.projeto_id IS NULL AND NEW.codigo_projeto IS NOT NULL THEN
            INSERT INTO projetos (codigo_projeto, cliente)
            VALUES (NEW.codigo_projeto, NEW.cliente)
            ON CONFLICT (codigo_projeto) DO NOTHING
            RETURNING projeto_id INTO v_projeto_id;

            IF v_projeto_id IS NULL THEN
                SELECT projeto_id INTO v_projeto_id
                FROM projetos
                WHERE codigo_projeto = NEW.codigo_projeto
                LIMIT 1;
            END IF;

            NEW.projeto_id := v_projeto_id;
        ELSE
            v_projeto_id := NEW.projeto_id;
        END IF;

        SELECT status_id INTO v_status_id
        FROM status_codes
        WHERE codigo = 'AGUARDANDO_INICIO'
        LIMIT 1;

        INSERT INTO engenheiros_projetos (
            eng_id,
            projeto_id,
            area_id,
            instancia_label,
            complemento_area_ref_id,
            data_inicio,
            data_prevista,
            status_id,
            observacoes
        ) VALUES (
            NEW.eng_id,
            v_projeto_id,
            NEW.area_id,
            NEW.instancia_label,
            NEW.complemento_area_ref_id,
            COALESCE(NEW.data_inicio_prevista, CURRENT_DATE),
            NEW.data_conclusao_prevista,
            v_status_id,
            'Atribuido por: ' || COALESCE(
                (SELECT nome FROM dono_empresa WHERE dono_id = NEW.dono_id),
                'Sistema'
            )
        ) RETURNING id, instancia_label, complemento_area_ref_id
        INTO v_eng_projeto_id, NEW.instancia_label, NEW.complemento_area_ref_id;

        NEW.eng_projeto_id := v_eng_projeto_id;
        NEW.sincronizado := true;
        NEW.data_sincronizacao := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS dashboard_atribuir_projeto_com_pavimentos(
    TEXT,
    TEXT,
    TEXT,
    UUID,
    UUID,
    TEXT,
    DATE,
    TEXT[],
    TEXT
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
    p_instancia_label TEXT DEFAULT NULL,
    p_complemento_area_ref_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_projeto_id UUID;
    v_task_id UUID;
    v_eng_projeto_id UUID;
    v_complexidade_id INTEGER;
    v_area_codigo TEXT;
    v_area_descricao TEXT;
    v_complemento_area_descricao TEXT;
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

    IF v_area_codigo = 'COMPLEMENTO' THEN
        IF p_complemento_area_ref_id IS NULL THEN
            RETURN json_build_object(
                'sucesso', false,
                'mensagem', 'Informe a disciplina que este complemento se refere'
            );
        END IF;

        IF p_complemento_area_ref_id = p_area_id THEN
            RETURN json_build_object(
                'sucesso', false,
                'mensagem', 'Complemento nao pode referenciar Complemento'
            );
        END IF;

        SELECT descricao INTO v_complemento_area_descricao
        FROM areas
        WHERE area_id = p_complemento_area_ref_id
          AND ativo = true;

        IF v_complemento_area_descricao IS NULL THEN
            RETURN json_build_object(
                'sucesso', false,
                'mensagem', 'Disciplina de referencia do complemento nao encontrada ou inativa'
            );
        END IF;
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
    ELSIF v_area_codigo = 'COMPLEMENTO' THEN
        SELECT COUNT(*) + 1 INTO v_fallback_numero
        FROM engenheiros_projetos
        WHERE projeto_id = v_projeto_id
          AND area_id = p_area_id
          AND complemento_area_ref_id = p_complemento_area_ref_id
          AND ativo = true;

        v_instancia_label := 'Complemento de ' || v_complemento_area_descricao || ' ' || v_fallback_numero;

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
                'mensagem', 'Ja existe um complemento com esta identificacao neste projeto'
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
        complemento_area_ref_id,
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
        CASE WHEN v_area_codigo = 'COMPLEMENTO' THEN p_complemento_area_ref_id ELSE NULL END,
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
              v_area_codigo NOT IN ('COMPATIBILIZACAO', 'COMPLEMENTO')
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
        'complemento_area_ref_id', CASE WHEN v_area_codigo = 'COMPLEMENTO' THEN p_complemento_area_ref_id ELSE NULL END,
        'reativado', v_reativado
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'sucesso', false,
        'mensagem', 'Erro ao atribuir projeto: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;
