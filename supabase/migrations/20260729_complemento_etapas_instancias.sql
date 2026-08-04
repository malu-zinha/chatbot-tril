-- =====================================================
-- MIGRACAO: Etapas independentes por instancia
-- =====================================================
-- Complemento e Compatibilizacao podem ter multiplas instancias no mesmo
-- projeto. As etapas/progresso precisam apontar para a atribuicao
-- engenheiros_projetos.id para evitar duplicidade em (projeto, area, nome)
-- e impedir que uma instancia conclua as demais.
-- =====================================================

ALTER TABLE projeto_pavimentos
    ADD COLUMN IF NOT EXISTS eng_projeto_id UUID REFERENCES engenheiros_projetos(id) ON DELETE CASCADE;

ALTER TABLE projeto_etapas_globais
    ADD COLUMN IF NOT EXISTS eng_projeto_id UUID REFERENCES engenheiros_projetos(id) ON DELETE CASCADE;

COMMENT ON COLUMN projeto_pavimentos.eng_projeto_id IS
'Atribuicao responsavel por esta estrutura de pavimentos/etapas; permite multiplas instancias da mesma area no projeto.';

COMMENT ON COLUMN projeto_etapas_globais.eng_projeto_id IS
'Atribuicao responsavel por esta etapa global; permite multiplas instancias da mesma area no projeto.';

WITH atribuicoes_unicas AS (
    SELECT DISTINCT ON (projeto_id, area_id)
        projeto_id,
        area_id,
        id AS eng_projeto_id
    FROM (
        SELECT
            id,
            projeto_id,
            area_id,
            created_at,
            COUNT(*) OVER (PARTITION BY projeto_id, area_id) AS total_atribuicoes
        FROM engenheiros_projetos
        WHERE ativo = true
          AND area_id IS NOT NULL
    ) ep
    WHERE total_atribuicoes = 1
    ORDER BY projeto_id, area_id, created_at, id
)
UPDATE projeto_pavimentos pp
SET eng_projeto_id = au.eng_projeto_id
FROM atribuicoes_unicas au
WHERE pp.projeto_id = au.projeto_id
  AND pp.area_id = au.area_id
  AND pp.eng_projeto_id IS NULL;

WITH atribuicoes_unicas AS (
    SELECT DISTINCT ON (projeto_id, area_id)
        projeto_id,
        area_id,
        id AS eng_projeto_id
    FROM (
        SELECT
            id,
            projeto_id,
            area_id,
            created_at,
            COUNT(*) OVER (PARTITION BY projeto_id, area_id) AS total_atribuicoes
        FROM engenheiros_projetos
        WHERE ativo = true
          AND area_id IS NOT NULL
    ) ep
    WHERE total_atribuicoes = 1
    ORDER BY projeto_id, area_id, created_at, id
)
UPDATE projeto_etapas_globais peg
SET eng_projeto_id = au.eng_projeto_id
FROM atribuicoes_unicas au
WHERE peg.projeto_id = au.projeto_id
  AND peg.area_id = au.area_id
  AND peg.eng_projeto_id IS NULL;

WITH primeira_atribuicao AS (
    SELECT DISTINCT ON (projeto_id, area_id)
        projeto_id,
        area_id,
        id AS eng_projeto_id
    FROM engenheiros_projetos
    WHERE ativo = true
      AND area_id IS NOT NULL
    ORDER BY projeto_id, area_id, created_at, id
)
UPDATE projeto_pavimentos pp
SET eng_projeto_id = pa.eng_projeto_id
FROM primeira_atribuicao pa
WHERE pp.projeto_id = pa.projeto_id
  AND pp.area_id = pa.area_id
  AND pp.eng_projeto_id IS NULL;

WITH primeira_atribuicao AS (
    SELECT DISTINCT ON (projeto_id, area_id)
        projeto_id,
        area_id,
        id AS eng_projeto_id
    FROM engenheiros_projetos
    WHERE ativo = true
      AND area_id IS NOT NULL
    ORDER BY projeto_id, area_id, created_at, id
)
UPDATE projeto_etapas_globais peg
SET eng_projeto_id = pa.eng_projeto_id
FROM primeira_atribuicao pa
WHERE peg.projeto_id = pa.projeto_id
  AND peg.area_id = pa.area_id
  AND peg.eng_projeto_id IS NULL;

ALTER TABLE projeto_pavimentos
    DROP CONSTRAINT IF EXISTS projeto_pavimentos_projeto_id_nome_key;

ALTER TABLE projeto_pavimentos
    DROP CONSTRAINT IF EXISTS uq_pav_projeto_area_nome;

ALTER TABLE projeto_etapas_globais
    DROP CONSTRAINT IF EXISTS projeto_etapas_globais_projeto_id_nome_key;

ALTER TABLE projeto_etapas_globais
    DROP CONSTRAINT IF EXISTS uq_etapa_global_projeto_area_nome;

DROP INDEX IF EXISTS uq_pav_projeto_area_instancia_nome;
CREATE UNIQUE INDEX uq_pav_projeto_area_instancia_nome
ON projeto_pavimentos (
    projeto_id,
    area_id,
    (COALESCE(eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID)),
    nome
);

DROP INDEX IF EXISTS uq_etapa_global_projeto_area_instancia_nome;
CREATE UNIQUE INDEX uq_etapa_global_projeto_area_instancia_nome
ON projeto_etapas_globais (
    projeto_id,
    area_id,
    (COALESCE(eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID)),
    nome
);

CREATE INDEX IF NOT EXISTS idx_pav_eng_projeto_id
ON projeto_pavimentos(eng_projeto_id);

CREATE INDEX IF NOT EXISTS idx_etapa_global_eng_projeto_id
ON projeto_etapas_globais(eng_projeto_id);

DROP FUNCTION IF EXISTS seed_pavimentos_etapas(UUID, UUID);
CREATE OR REPLACE FUNCTION seed_pavimentos_etapas(
    p_projeto_id UUID,
    p_area_id UUID,
    p_eng_projeto_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_pav_count INTEGER;
    v_glb_count INTEGER;
    v_etapa_pav_count INTEGER;
    v_total_n1 INTEGER;
    v_peso_n1 NUMERIC(5,2);
    v_peso_etapa NUMERIC(5,2);
    v_pav RECORD;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM projeto_pavimentos
        WHERE projeto_id = p_projeto_id
          AND area_id = p_area_id
          AND COALESCE(eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID) =
              COALESCE(p_eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID)
    ) OR EXISTS (
        SELECT 1
        FROM projeto_etapas_globais
        WHERE projeto_id = p_projeto_id
          AND area_id = p_area_id
          AND COALESCE(eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID) =
              COALESCE(p_eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID)
    ) THEN
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_pav_count
    FROM area_pavimentos_template
    WHERE area_id = p_area_id
      AND ativo = true;

    SELECT COUNT(*) INTO v_glb_count
    FROM area_etapas_template
    WHERE area_id = p_area_id
      AND tipo = 'global'
      AND ativo = true;

    SELECT COUNT(*) INTO v_etapa_pav_count
    FROM area_etapas_template
    WHERE area_id = p_area_id
      AND tipo = 'pavimento'
      AND ativo = true;

    v_total_n1 := v_pav_count + v_glb_count;
    IF v_total_n1 = 0 THEN
        RETURN;
    END IF;

    v_peso_n1 := ROUND(100.0 / v_total_n1, 2);
    v_peso_etapa := CASE
        WHEN v_etapa_pav_count > 0 THEN ROUND(100.0 / v_etapa_pav_count, 2)
        ELSE 0
    END;

    FOR v_pav IN
        SELECT nome, ordem
        FROM area_pavimentos_template
        WHERE area_id = p_area_id
          AND ativo = true
        ORDER BY ordem
    LOOP
        INSERT INTO projeto_pavimentos (
            projeto_id,
            area_id,
            eng_projeto_id,
            nome,
            ordem,
            peso,
            ativo
        ) VALUES (
            p_projeto_id,
            p_area_id,
            p_eng_projeto_id,
            v_pav.nome,
            v_pav.ordem,
            v_peso_n1,
            true
        );

        INSERT INTO pavimento_etapas (pavimento_id, nome, peso, ativo)
        SELECT pp.pavimento_id, t.nome, v_peso_etapa, true
        FROM projeto_pavimentos pp
        CROSS JOIN area_etapas_template t
        WHERE pp.projeto_id = p_projeto_id
          AND pp.area_id = p_area_id
          AND COALESCE(pp.eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID) =
              COALESCE(p_eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID)
          AND pp.nome = v_pav.nome
          AND t.area_id = p_area_id
          AND t.tipo = 'pavimento'
          AND t.ativo = true;
    END LOOP;

    INSERT INTO projeto_etapas_globais (
        projeto_id,
        area_id,
        eng_projeto_id,
        nome,
        peso,
        ativo
    )
    SELECT p_projeto_id, p_area_id, p_eng_projeto_id, nome, v_peso_n1, true
    FROM area_etapas_template
    WHERE area_id = p_area_id
      AND tipo = 'global'
      AND ativo = true
    ORDER BY ordem;

    PERFORM ajustar_residuo_pesos(p_projeto_id, p_area_id, p_eng_projeto_id);
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS ajustar_residuo_pesos(UUID, UUID);
CREATE OR REPLACE FUNCTION ajustar_residuo_pesos(
    p_projeto_id UUID,
    p_area_id UUID,
    p_eng_projeto_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_soma_n1 NUMERIC(5,2);
    v_residuo_n1 NUMERIC(5,2);
    v_pav RECORD;
    v_soma_etapa NUMERIC(5,2);
    v_residuo_etapa NUMERIC(5,2);
    v_target_pav UUID;
    v_target_glb UUID;
BEGIN
    SELECT
        COALESCE((
            SELECT SUM(pp.peso)
            FROM projeto_pavimentos pp
            WHERE pp.projeto_id = p_projeto_id
              AND pp.area_id = p_area_id
              AND pp.ativo = true
              AND COALESCE(pp.eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID) =
                  COALESCE(p_eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID)
        ), 0) +
        COALESCE((
            SELECT SUM(peg.peso)
            FROM projeto_etapas_globais peg
            WHERE peg.projeto_id = p_projeto_id
              AND peg.area_id = p_area_id
              AND peg.ativo = true
              AND COALESCE(peg.eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID) =
                  COALESCE(p_eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID)
        ), 0)
    INTO v_soma_n1;

    v_residuo_n1 := 100 - v_soma_n1;

    IF v_residuo_n1 != 0 THEN
        SELECT pavimento_id INTO v_target_pav
        FROM projeto_pavimentos
        WHERE projeto_id = p_projeto_id
          AND area_id = p_area_id
          AND ativo = true
          AND COALESCE(eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID) =
              COALESCE(p_eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID)
        ORDER BY ordem DESC
        LIMIT 1;

        IF v_target_pav IS NOT NULL THEN
            UPDATE projeto_pavimentos
            SET peso = peso + v_residuo_n1
            WHERE pavimento_id = v_target_pav;
        ELSE
            SELECT etapa_global_id INTO v_target_glb
            FROM projeto_etapas_globais
            WHERE projeto_id = p_projeto_id
              AND area_id = p_area_id
              AND ativo = true
              AND COALESCE(eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID) =
                  COALESCE(p_eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID)
            ORDER BY created_at DESC
            LIMIT 1;

            IF v_target_glb IS NOT NULL THEN
                UPDATE projeto_etapas_globais
                SET peso = peso + v_residuo_n1
                WHERE etapa_global_id = v_target_glb;
            END IF;
        END IF;
    END IF;

    FOR v_pav IN
        SELECT pavimento_id
        FROM projeto_pavimentos
        WHERE projeto_id = p_projeto_id
          AND area_id = p_area_id
          AND ativo = true
          AND COALESCE(eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID) =
              COALESCE(p_eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID)
    LOOP
        SELECT COALESCE(SUM(peso), 0) INTO v_soma_etapa
        FROM pavimento_etapas
        WHERE pavimento_id = v_pav.pavimento_id
          AND ativo = true;

        v_residuo_etapa := 100 - v_soma_etapa;

        IF v_soma_etapa > 0 AND v_residuo_etapa != 0 THEN
            UPDATE pavimento_etapas
            SET peso = peso + v_residuo_etapa
            WHERE etapa_id = (
                SELECT etapa_id
                FROM pavimento_etapas
                WHERE pavimento_id = v_pav.pavimento_id
                  AND ativo = true
                ORDER BY created_at DESC
                LIMIT 1
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcular_progresso_area(UUID, UUID);
CREATE OR REPLACE FUNCTION calcular_progresso_area(
    p_projeto_id UUID,
    p_area_id UUID,
    p_eng_projeto_id UUID DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
    v_contrib_pav NUMERIC := 0;
    v_contrib_glob NUMERIC := 0;
    v_pav RECORD;
    v_interno NUMERIC;
    v_total NUMERIC;
BEGIN
    FOR v_pav IN
        SELECT pavimento_id, peso
        FROM projeto_pavimentos
        WHERE projeto_id = p_projeto_id
          AND area_id = p_area_id
          AND ativo = true
          AND COALESCE(eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID) =
              COALESCE(p_eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID)
    LOOP
        SELECT COALESCE(SUM(peso), 0) INTO v_interno
        FROM pavimento_etapas
        WHERE pavimento_id = v_pav.pavimento_id
          AND concluida = true
          AND ativo = true;

        v_contrib_pav := v_contrib_pav + (v_pav.peso * v_interno / 100.0);
    END LOOP;

    SELECT COALESCE(SUM(peso), 0) INTO v_contrib_glob
    FROM projeto_etapas_globais
    WHERE projeto_id = p_projeto_id
      AND area_id = p_area_id
      AND concluida = true
      AND ativo = true
      AND COALESCE(eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID) =
          COALESCE(p_eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID);

    v_total := v_contrib_pav + v_contrib_glob;
    IF v_total > 100 THEN
        v_total := 100;
    ELSIF v_total < 0 THEN
        v_total := 0;
    END IF;

    RETURN ROUND(v_total, 2);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recalcular_rollup_projeto(p_projeto_id UUID)
RETURNS VOID AS $$
DECLARE
    v_avg NUMERIC(5,2);
BEGIN
    SELECT COALESCE(ROUND(AVG(COALESCE(percentual_ponderado, 0)), 2), 0) INTO v_avg
    FROM engenheiros_projetos
    WHERE projeto_id = p_projeto_id
      AND ativo = true;

    UPDATE projetos
    SET percentual_ponderado = v_avg
    WHERE projeto_id = p_projeto_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION atualizar_progresso_area()
RETURNS TRIGGER AS $$
DECLARE
    v_projeto_id UUID;
    v_area_id UUID;
    v_eng_projeto_id UUID;
    v_pct NUMERIC(5,2);
BEGIN
    IF TG_TABLE_NAME = 'pavimento_etapas' THEN
        SELECT pp.projeto_id, pp.area_id, pp.eng_projeto_id
        INTO v_projeto_id, v_area_id, v_eng_projeto_id
        FROM projeto_pavimentos pp
        WHERE pp.pavimento_id = COALESCE(NEW.pavimento_id, OLD.pavimento_id);
    ELSIF TG_TABLE_NAME = 'projeto_etapas_globais' THEN
        v_projeto_id := COALESCE(NEW.projeto_id, OLD.projeto_id);
        v_area_id := COALESCE(NEW.area_id, OLD.area_id);
        v_eng_projeto_id := COALESCE(NEW.eng_projeto_id, OLD.eng_projeto_id);
    ELSIF TG_TABLE_NAME = 'projeto_pavimentos' THEN
        v_projeto_id := COALESCE(NEW.projeto_id, OLD.projeto_id);
        v_area_id := COALESCE(NEW.area_id, OLD.area_id);
        v_eng_projeto_id := COALESCE(NEW.eng_projeto_id, OLD.eng_projeto_id);
    END IF;

    IF v_projeto_id IS NOT NULL AND v_area_id IS NOT NULL THEN
        v_pct := calcular_progresso_area(v_projeto_id, v_area_id, v_eng_projeto_id);

        IF v_eng_projeto_id IS NOT NULL THEN
            UPDATE engenheiros_projetos
            SET percentual_ponderado = v_pct,
                data_conclusao = CASE WHEN v_pct >= 100 THEN COALESCE(data_conclusao, CURRENT_DATE) ELSE NULL END,
                updated_at = CURRENT_TIMESTAMP
            WHERE projeto_id = v_projeto_id
              AND area_id = v_area_id
              AND id = v_eng_projeto_id
              AND ativo = true;
        ELSE
            UPDATE engenheiros_projetos
            SET percentual_ponderado = v_pct,
                data_conclusao = CASE WHEN v_pct >= 100 THEN COALESCE(data_conclusao, CURRENT_DATE) ELSE NULL END,
                updated_at = CURRENT_TIMESTAMP
            WHERE projeto_id = v_projeto_id
              AND area_id = v_area_id
              AND ativo = true;
        END IF;

        PERFORM recalcular_rollup_projeto(v_projeto_id);
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

DROP FUNCTION IF EXISTS marcar_area_concluida(UUID, UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION marcar_area_concluida(
    p_projeto_id UUID,
    p_area_id UUID,
    p_concluido BOOLEAN DEFAULT true,
    p_eng_projeto_id UUID DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
    v_pct NUMERIC(5,2);
BEGIN
    v_pct := CASE WHEN p_concluido THEN 100.00 ELSE 0.00 END;

    IF p_eng_projeto_id IS NOT NULL THEN
        UPDATE engenheiros_projetos
        SET percentual_ponderado = v_pct,
            data_conclusao = CASE WHEN p_concluido THEN COALESCE(data_conclusao, CURRENT_DATE) ELSE NULL END,
            updated_at = CURRENT_TIMESTAMP
        WHERE projeto_id = p_projeto_id
          AND area_id = p_area_id
          AND id = p_eng_projeto_id
          AND ativo = true;
    ELSE
        UPDATE engenheiros_projetos
        SET percentual_ponderado = v_pct,
            data_conclusao = CASE WHEN p_concluido THEN COALESCE(data_conclusao, CURRENT_DATE) ELSE NULL END,
            updated_at = CURRENT_TIMESTAMP
        WHERE projeto_id = p_projeto_id
          AND area_id = p_area_id
          AND ativo = true;
    END IF;

    PERFORM recalcular_rollup_projeto(p_projeto_id);
    RETURN v_pct;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS configurar_pavimentos_customizados_area(UUID, UUID, TEXT[]);
CREATE OR REPLACE FUNCTION configurar_pavimentos_customizados_area(
    p_projeto_id UUID,
    p_area_id UUID,
    p_pavimentos TEXT[],
    p_eng_projeto_id UUID DEFAULT NULL
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
          AND COALESCE(pp.eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID) =
              COALESCE(p_eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID)
          AND pe.concluida = true
    ) OR EXISTS (
        SELECT 1
        FROM projeto_etapas_globais peg
        WHERE peg.projeto_id = p_projeto_id
          AND peg.area_id = p_area_id
          AND COALESCE(peg.eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID) =
              COALESCE(p_eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID)
          AND peg.concluida = true
    ) THEN
        RAISE EXCEPTION 'Nao e possivel substituir pavimentos de uma disciplina com progresso concluido';
    END IF;

    DELETE FROM projeto_pavimentos
    WHERE projeto_id = p_projeto_id
      AND area_id = p_area_id
      AND COALESCE(eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID) =
          COALESCE(p_eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID);

    UPDATE projeto_etapas_globais
    SET peso = v_peso_n1
    WHERE projeto_id = p_projeto_id
      AND area_id = p_area_id
      AND ativo = true
      AND COALESCE(eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID) =
          COALESCE(p_eng_projeto_id, '00000000-0000-0000-0000-000000000000'::UUID);

    FOREACH v_nome IN ARRAY v_nomes LOOP
        v_ordem := v_ordem + 1;

        INSERT INTO projeto_pavimentos (
            projeto_id,
            area_id,
            eng_projeto_id,
            nome,
            ordem,
            peso,
            ativo
        ) VALUES (
            p_projeto_id,
            p_area_id,
            p_eng_projeto_id,
            v_nome,
            v_ordem,
            v_peso_n1,
            true
        )
        RETURNING pavimento_id INTO v_pavimento_id;

        INSERT INTO pavimento_etapas (pavimento_id, nome, peso, ativo)
        SELECT v_pavimento_id, nome, v_peso_etapa, true
        FROM area_etapas_template
        WHERE area_id = p_area_id
          AND tipo = 'pavimento'
          AND ativo = true
        ORDER BY ordem;
    END LOOP;

    PERFORM ajustar_residuo_pesos(p_projeto_id, p_area_id, p_eng_projeto_id);
    PERFORM recalcular_rollup_projeto(p_projeto_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_seed_on_atribuicao()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.area_id IS NOT NULL AND NEW.ativo = true THEN
        PERFORM seed_pavimentos_etapas(NEW.projeto_id, NEW.area_id, NEW.id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seed_pav_etapa ON engenheiros_projetos;
CREATE TRIGGER trg_seed_pav_etapa
    AFTER INSERT OR UPDATE OF area_id, ativo ON engenheiros_projetos
    FOR EACH ROW
    EXECUTE FUNCTION trg_seed_on_atribuicao();

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
        SET ativo = false, updated_at = NOW()
        WHERE projeto_id = v_projeto_id
          AND ativo = true;

        UPDATE evandro_distribuicao_tasks
        SET ativo = false, updated_at = NOW()
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

        v_instancia_label := normalizar_label_compatibilizacao(p_instancia_label, v_fallback_numero);

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

    PERFORM configurar_pavimentos_customizados_area(v_projeto_id, p_area_id, p_pavimentos, v_eng_projeto_id);

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

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT id, projeto_id, area_id
        FROM engenheiros_projetos
        WHERE ativo = true
          AND area_id IS NOT NULL
    LOOP
        PERFORM seed_pavimentos_etapas(r.projeto_id, r.area_id, r.id);

        UPDATE engenheiros_projetos
        SET percentual_ponderado = calcular_progresso_area(r.projeto_id, r.area_id, r.id),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = r.id;
    END LOOP;
END $$;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT DISTINCT projeto_id
        FROM engenheiros_projetos
        WHERE ativo = true
    LOOP
        PERFORM recalcular_rollup_projeto(r.projeto_id);
    END LOOP;
END $$;
