-- =====================================================
-- MIGRACAO: Dashboard - instancias de compatibilizacao
-- =====================================================
-- Permite multiplas rodadas de Compatibilizacao no mesmo projeto,
-- inclusive para o mesmo engenheiro, sem liberar duplicidade acidental
-- das disciplinas comuns.
-- =====================================================

INSERT INTO areas (codigo, descricao, tempo_trabalho_dias, ativo)
VALUES ('COMPATIBILIZACAO', 'Compatibilização', 5, true)
ON CONFLICT (codigo) DO UPDATE SET
    descricao = EXCLUDED.descricao,
    tempo_trabalho_dias = EXCLUDED.tempo_trabalho_dias,
    ativo = EXCLUDED.ativo;

ALTER TABLE engenheiros_projetos
    ADD COLUMN IF NOT EXISTS instancia_label TEXT;

ALTER TABLE evandro_distribuicao_tasks
    ADD COLUMN IF NOT EXISTS instancia_label TEXT;

COMMENT ON COLUMN engenheiros_projetos.instancia_label IS
'Identifica rodadas/instancias repetiveis de disciplinas, usada inicialmente para Compatibilizacao.';

COMMENT ON COLUMN evandro_distribuicao_tasks.instancia_label IS
'Rotulo opcional da instancia repetivel enviada para engenheiros_projetos.';

WITH compat AS (
    SELECT
        ep.id,
        ROW_NUMBER() OVER (
            PARTITION BY ep.projeto_id, ep.area_id
            ORDER BY ep.created_at, ep.id
        ) AS rn
    FROM engenheiros_projetos ep
    JOIN areas a ON a.area_id = ep.area_id
    WHERE a.codigo = 'COMPATIBILIZACAO'
      AND ep.ativo = true
      AND NULLIF(btrim(COALESCE(ep.instancia_label, '')), '') IS NULL
)
UPDATE engenheiros_projetos ep
SET instancia_label = 'Compatibilização ' || compat.rn
FROM compat
WHERE compat.id = ep.id;

UPDATE evandro_distribuicao_tasks edt
SET instancia_label = ep.instancia_label
FROM engenheiros_projetos ep
JOIN areas a ON a.area_id = ep.area_id
WHERE edt.eng_projeto_id = ep.id
  AND a.codigo = 'COMPATIBILIZACAO'
  AND NULLIF(btrim(COALESCE(edt.instancia_label, '')), '') IS NULL;

ALTER TABLE engenheiros_projetos
    DROP CONSTRAINT IF EXISTS engenheiros_projetos_eng_id_projeto_id_area_id_key;

DROP INDEX IF EXISTS uq_eng_proj_active_instancia;
CREATE UNIQUE INDEX uq_eng_proj_active_instancia
ON engenheiros_projetos (
    eng_id,
    projeto_id,
    area_id,
    (COALESCE(instancia_label, ''::TEXT))
)
WHERE ativo = true;

DROP INDEX IF EXISTS uq_eng_proj_area_instancia_label_active;
CREATE UNIQUE INDEX uq_eng_proj_area_instancia_label_active
ON engenheiros_projetos (
    projeto_id,
    area_id,
    (LOWER(instancia_label))
)
WHERE ativo = true
  AND instancia_label IS NOT NULL;

CREATE OR REPLACE FUNCTION normalizar_label_compatibilizacao(
    p_label TEXT,
    p_fallback_numero INTEGER
)
RETURNS TEXT AS $$
DECLARE
    v_label TEXT;
BEGIN
    v_label := btrim(regexp_replace(COALESCE(p_label, ''), '\s+', ' ', 'g'));

    IF v_label = '' THEN
        RETURN 'Compatibilização ' || p_fallback_numero;
    END IF;

    IF lower(v_label) LIKE lower('Compatibilização') || '%' THEN
        RETURN v_label;
    END IF;

    RETURN 'Compatibilização ' || v_label;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION validar_instancia_engenheiros_projetos()
RETURNS TRIGGER AS $$
DECLARE
    v_area_codigo TEXT;
    v_fallback_numero INTEGER;
BEGIN
    IF COALESCE(NEW.ativo, true) = false THEN
        RETURN NEW;
    END IF;

    SELECT codigo INTO v_area_codigo
    FROM areas
    WHERE area_id = NEW.area_id;

    IF v_area_codigo = 'COMPATIBILIZACAO' THEN
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
    ELSE
        NEW.instancia_label := NULL;

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
    BEFORE INSERT OR UPDATE OF eng_id, projeto_id, area_id, instancia_label, ativo
    ON engenheiros_projetos
    FOR EACH ROW
    EXECUTE FUNCTION validar_instancia_engenheiros_projetos();

CREATE OR REPLACE FUNCTION sincronizar_task_para_engenheiro()
RETURNS TRIGGER AS $$
DECLARE
    v_projeto_id UUID;
    v_eng_projeto_id UUID;
    v_status_id INTEGER;
    v_telefone TEXT;
    v_area_label TEXT;
BEGIN
    IF NEW.sincronizado = false THEN
        IF NEW.projeto_id IS NULL AND NEW.codigo_projeto IS NOT NULL THEN
            INSERT INTO projetos (codigo_projeto, cliente)
            VALUES (NEW.codigo_projeto, NEW.cliente)
            RETURNING projeto_id INTO v_projeto_id;

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
            data_inicio,
            data_prevista,
            status_id,
            observacoes
        ) VALUES (
            NEW.eng_id,
            v_projeto_id,
            NEW.area_id,
            NEW.instancia_label,
            COALESCE(NEW.data_inicio_prevista, CURRENT_DATE),
            NEW.data_conclusao_prevista,
            v_status_id,
            'Atribuido por: ' || COALESCE(
                (SELECT nome FROM dono_empresa WHERE dono_id = NEW.dono_id),
                'Sistema'
            )
        ) RETURNING id, instancia_label INTO v_eng_projeto_id, NEW.instancia_label;

        NEW.eng_projeto_id := v_eng_projeto_id;
        NEW.sincronizado := true;
        NEW.data_sincronizacao := NOW();

        SELECT telefone INTO v_telefone
        FROM engenheiros
        WHERE eng_id = NEW.eng_id;

        SELECT COALESCE(NEW.instancia_label, a.descricao) INTO v_area_label
        FROM areas a
        WHERE a.area_id = NEW.area_id;

        INSERT INTO notificacoes_whatsapp (
            eng_id,
            telefone,
            tipo,
            titulo,
            mensagem,
            task_id,
            projeto_id
        ) VALUES (
            NEW.eng_id,
            v_telefone,
            'NOVA_TAREFA',
            '🆕 Nova Tarefa Atribuída!',
            '📋 Projeto: ' || COALESCE(NEW.codigo_projeto,
                (SELECT codigo_projeto FROM projetos WHERE projeto_id = v_projeto_id)) ||
            E'\n📦 Área: ' || COALESCE(v_area_label, 'Não definido') ||
            E'\n📝 Descrição: ' || NEW.descricao_task ||
            E'\n📅 Início previsto: ' || COALESCE(NEW.data_inicio_prevista::TEXT, 'Não definido') ||
            E'\n⏰ Conclusão prevista: ' || COALESCE(NEW.data_conclusao_prevista::TEXT, 'Não definido'),
            NEW.task_id,
            v_projeto_id
        );
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
