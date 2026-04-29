-- =====================================================
-- MIGRAÇÃO: PAVIMENTOS E ETAPAS POR ÁREA
-- =====================================================
-- Adiciona area_id em projeto_pavimentos e
-- projeto_etapas_globais, cria templates por área a
-- partir do MODELO_PLANILHA GERAL_ 2026.xlsx, e função
-- seed_pavimentos_etapas que popula um (projeto, área)
-- automaticamente quando uma atribuição é criada.
--
-- DEPENDE DE: 20260319_progresso_ponderado.sql
-- NOTA: areas.area_id é UUID (não INTEGER)
-- =====================================================

-- =====================================================
-- PARTE 1: NOVA ÁREA (EXAUSTAO)
-- =====================================================

INSERT INTO areas (codigo, descricao, tempo_trabalho_dias, ativo)
VALUES ('EXAUSTAO', 'Exaustão', 5, true)
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- PARTE 2: area_id EM PAVIMENTOS E ETAPAS GLOBAIS
-- =====================================================

ALTER TABLE projeto_pavimentos
    ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES areas(area_id) ON DELETE CASCADE;

ALTER TABLE projeto_etapas_globais
    ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES areas(area_id) ON DELETE CASCADE;

-- UNIQUE permite mesmo nome em áreas diferentes do mesmo projeto
ALTER TABLE projeto_pavimentos
    DROP CONSTRAINT IF EXISTS projeto_pavimentos_projeto_id_nome_key;
ALTER TABLE projeto_pavimentos
    DROP CONSTRAINT IF EXISTS uq_pav_projeto_area_nome;
ALTER TABLE projeto_pavimentos
    ADD CONSTRAINT uq_pav_projeto_area_nome UNIQUE (projeto_id, area_id, nome);

ALTER TABLE projeto_etapas_globais
    DROP CONSTRAINT IF EXISTS projeto_etapas_globais_projeto_id_nome_key;
ALTER TABLE projeto_etapas_globais
    DROP CONSTRAINT IF EXISTS uq_etapa_global_projeto_area_nome;
ALTER TABLE projeto_etapas_globais
    ADD CONSTRAINT uq_etapa_global_projeto_area_nome UNIQUE (projeto_id, area_id, nome);

CREATE INDEX IF NOT EXISTS idx_pav_area_id ON projeto_pavimentos(area_id);
CREATE INDEX IF NOT EXISTS idx_etapa_global_area_id ON projeto_etapas_globais(area_id);

-- =====================================================
-- PARTE 3: TABELAS DE TEMPLATE
-- =====================================================

CREATE TABLE IF NOT EXISTS area_pavimentos_template (
    id SERIAL PRIMARY KEY,
    area_id UUID NOT NULL REFERENCES areas(area_id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    UNIQUE(area_id, nome)
);

CREATE TABLE IF NOT EXISTS area_etapas_template (
    id SERIAL PRIMARY KEY,
    area_id UUID NOT NULL REFERENCES areas(area_id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    -- 'pavimento': aplicada a cada pavimento; 'global': etapa global do projeto
    tipo TEXT NOT NULL CHECK (tipo IN ('pavimento', 'global')),
    ordem INTEGER NOT NULL DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    UNIQUE(area_id, tipo, nome)
);

CREATE INDEX IF NOT EXISTS idx_pav_tpl_area ON area_pavimentos_template(area_id);
CREATE INDEX IF NOT EXISTS idx_etapa_tpl_area_tipo ON area_etapas_template(area_id, tipo);

-- =====================================================
-- PARTE 4: SEED DOS TEMPLATES (gerado por scripts/extract-xlsx-templates.ts)
-- =====================================================
-- ELETRICO
INSERT INTO area_pavimentos_template (area_id, nome, ordem) VALUES
    ((SELECT area_id FROM areas WHERE codigo = 'ELETRICO'), 'Tipo', 1),
    ((SELECT area_id FROM areas WHERE codigo = 'ELETRICO'), 'Mezanino', 2),
    ((SELECT area_id FROM areas WHERE codigo = 'ELETRICO'), 'Térreo', 3),
    ((SELECT area_id FROM areas WHERE codigo = 'ELETRICO'), 'Subsolo', 4),
    ((SELECT area_id FROM areas WHERE codigo = 'ELETRICO'), 'Cobertura / Coberta', 5),
    ((SELECT area_id FROM areas WHERE codigo = 'ELETRICO'), 'Energisa', 6)
ON CONFLICT (area_id, nome) DO NOTHING;
INSERT INTO area_etapas_template (area_id, nome, tipo, ordem) VALUES
    ((SELECT area_id FROM areas WHERE codigo = 'ELETRICO'), 'Pontos', 'pavimento', 1),
    ((SELECT area_id FROM areas WHERE codigo = 'ELETRICO'), 'Eletrodutos', 'pavimento', 2),
    ((SELECT area_id FROM areas WHERE codigo = 'ELETRICO'), 'Fiação', 'pavimento', 3),
    ((SELECT area_id FROM areas WHERE codigo = 'ELETRICO'), 'Quadros / Diagramas e Detalhes da proteção', 'pavimento', 4),
    ((SELECT area_id FROM areas WHERE codigo = 'ELETRICO'), 'Modelagem', 'global', 1),
    ((SELECT area_id FROM areas WHERE codigo = 'ELETRICO'), 'Memorial', 'global', 2),
    ((SELECT area_id FROM areas WHERE codigo = 'ELETRICO'), 'Corte Esquemático', 'global', 3),
    ((SELECT area_id FROM areas WHERE codigo = 'ELETRICO'), 'Pranchas', 'global', 4),
    ((SELECT area_id FROM areas WHERE codigo = 'ELETRICO'), 'Quantitativos / Memorial Descritivo', 'global', 5)
ON CONFLICT (area_id, tipo, nome) DO NOTHING;

-- TELEFONIA
INSERT INTO area_pavimentos_template (area_id, nome, ordem) VALUES
    ((SELECT area_id FROM areas WHERE codigo = 'TELEFONIA'), 'Tipo', 1),
    ((SELECT area_id FROM areas WHERE codigo = 'TELEFONIA'), 'Mezanino', 2),
    ((SELECT area_id FROM areas WHERE codigo = 'TELEFONIA'), 'Térreo', 3),
    ((SELECT area_id FROM areas WHERE codigo = 'TELEFONIA'), 'Subsolo', 4),
    ((SELECT area_id FROM areas WHERE codigo = 'TELEFONIA'), 'Cobertura / Coberta', 5)
ON CONFLICT (area_id, nome) DO NOTHING;
INSERT INTO area_etapas_template (area_id, nome, tipo, ordem) VALUES
    ((SELECT area_id FROM areas WHERE codigo = 'TELEFONIA'), 'Pontos', 'pavimento', 1),
    ((SELECT area_id FROM areas WHERE codigo = 'TELEFONIA'), 'Eletrodutos', 'pavimento', 2),
    ((SELECT area_id FROM areas WHERE codigo = 'TELEFONIA'), 'Fiação', 'pavimento', 3),
    ((SELECT area_id FROM areas WHERE codigo = 'TELEFONIA'), 'Rodar Quadros', 'pavimento', 4),
    ((SELECT area_id FROM areas WHERE codigo = 'TELEFONIA'), 'Conectar Divisores e Caixas', 'global', 1),
    ((SELECT area_id FROM areas WHERE codigo = 'TELEFONIA'), 'Plano de Face TV', 'global', 2),
    ((SELECT area_id FROM areas WHERE codigo = 'TELEFONIA'), 'Plano de Face Rede Lógica', 'global', 3),
    ((SELECT area_id FROM areas WHERE codigo = 'TELEFONIA'), 'Rodar Quadros e Legenda Eletrocalha', 'global', 4),
    ((SELECT area_id FROM areas WHERE codigo = 'TELEFONIA'), 'Corte Esquemático', 'global', 5),
    ((SELECT area_id FROM areas WHERE codigo = 'TELEFONIA'), 'Pranchas', 'global', 6),
    ((SELECT area_id FROM areas WHERE codigo = 'TELEFONIA'), 'Quantitativos / Memorial descritivo', 'global', 7)
ON CONFLICT (area_id, tipo, nome) DO NOTHING;

-- HIDRAULICO
INSERT INTO area_pavimentos_template (area_id, nome, ordem) VALUES
    ((SELECT area_id FROM areas WHERE codigo = 'HIDRAULICO'), 'Tipo', 1),
    ((SELECT area_id FROM areas WHERE codigo = 'HIDRAULICO'), 'Mezanino', 2),
    ((SELECT area_id FROM areas WHERE codigo = 'HIDRAULICO'), 'Térreo', 3),
    ((SELECT area_id FROM areas WHERE codigo = 'HIDRAULICO'), 'Subsolo', 4),
    ((SELECT area_id FROM areas WHERE codigo = 'HIDRAULICO'), 'Cobertura / Coberta', 5)
ON CONFLICT (area_id, nome) DO NOTHING;
INSERT INTO area_etapas_template (area_id, nome, tipo, ordem) VALUES
    ((SELECT area_id FROM areas WHERE codigo = 'HIDRAULICO'), 'Pontos', 'pavimento', 1),
    ((SELECT area_id FROM areas WHERE codigo = 'HIDRAULICO'), 'Tubulações', 'pavimento', 2),
    ((SELECT area_id FROM areas WHERE codigo = 'HIDRAULICO'), 'Isométricos', 'pavimento', 3),
    ((SELECT area_id FROM areas WHERE codigo = 'HIDRAULICO'), 'Desvios', 'pavimento', 4),
    ((SELECT area_id FROM areas WHERE codigo = 'HIDRAULICO'), 'Drenagem Subsolo', 'global', 1),
    ((SELECT area_id FROM areas WHERE codigo = 'HIDRAULICO'), 'EEE', 'global', 2),
    ((SELECT area_id FROM areas WHERE codigo = 'HIDRAULICO'), 'Piscinas', 'global', 3),
    ((SELECT area_id FROM areas WHERE codigo = 'HIDRAULICO'), 'Reservatórios', 'global', 4),
    ((SELECT area_id FROM areas WHERE codigo = 'HIDRAULICO'), 'Corte Esquemático', 'global', 5),
    ((SELECT area_id FROM areas WHERE codigo = 'HIDRAULICO'), 'Pranchas', 'global', 6),
    ((SELECT area_id FROM areas WHERE codigo = 'HIDRAULICO'), 'Quantitativos / Memorial Descritivo', 'global', 7)
ON CONFLICT (area_id, tipo, nome) DO NOTHING;

-- CLIMATIZACAO
INSERT INTO area_pavimentos_template (area_id, nome, ordem) VALUES
    ((SELECT area_id FROM areas WHERE codigo = 'CLIMATIZACAO'), 'Tipo', 1),
    ((SELECT area_id FROM areas WHERE codigo = 'CLIMATIZACAO'), 'Mezanino', 2),
    ((SELECT area_id FROM areas WHERE codigo = 'CLIMATIZACAO'), 'Térreo', 3),
    ((SELECT area_id FROM areas WHERE codigo = 'CLIMATIZACAO'), 'Subsolo', 4),
    ((SELECT area_id FROM areas WHERE codigo = 'CLIMATIZACAO'), 'Cobertura / Coberta', 5)
ON CONFLICT (area_id, nome) DO NOTHING;
INSERT INTO area_etapas_template (area_id, nome, tipo, ordem) VALUES
    ((SELECT area_id FROM areas WHERE codigo = 'CLIMATIZACAO'), 'Pontos', 'pavimento', 1),
    ((SELECT area_id FROM areas WHERE codigo = 'CLIMATIZACAO'), 'Tubulações', 'pavimento', 2),
    ((SELECT area_id FROM areas WHERE codigo = 'CLIMATIZACAO'), 'Legendas', 'pavimento', 3),
    ((SELECT area_id FROM areas WHERE codigo = 'CLIMATIZACAO'), 'Comprimento do Trecho / Engrosso Arq.', 'pavimento', 4),
    ((SELECT area_id FROM areas WHERE codigo = 'CLIMATIZACAO'), 'Detalhe Área Técnica', 'global', 1),
    ((SELECT area_id FROM areas WHERE codigo = 'CLIMATIZACAO'), 'Pranchas', 'global', 2),
    ((SELECT area_id FROM areas WHERE codigo = 'CLIMATIZACAO'), 'Quantitativos / Memorial Descritivo', 'global', 3)
ON CONFLICT (area_id, tipo, nome) DO NOTHING;

-- EXAUSTAO
INSERT INTO area_pavimentos_template (area_id, nome, ordem) VALUES
    ((SELECT area_id FROM areas WHERE codigo = 'EXAUSTAO'), 'Tipo', 1),
    ((SELECT area_id FROM areas WHERE codigo = 'EXAUSTAO'), 'Mezanino', 2),
    ((SELECT area_id FROM areas WHERE codigo = 'EXAUSTAO'), 'Térreo', 3),
    ((SELECT area_id FROM areas WHERE codigo = 'EXAUSTAO'), 'Subsolo', 4),
    ((SELECT area_id FROM areas WHERE codigo = 'EXAUSTAO'), 'Cobertura / Coberta', 5)
ON CONFLICT (area_id, nome) DO NOTHING;
INSERT INTO area_etapas_template (area_id, nome, tipo, ordem) VALUES
    ((SELECT area_id FROM areas WHERE codigo = 'EXAUSTAO'), 'Pontos', 'pavimento', 1),
    ((SELECT area_id FROM areas WHERE codigo = 'EXAUSTAO'), 'Tubulações', 'pavimento', 2),
    ((SELECT area_id FROM areas WHERE codigo = 'EXAUSTAO'), 'Legendas', 'pavimento', 3),
    ((SELECT area_id FROM areas WHERE codigo = 'EXAUSTAO'), 'Pranchas', 'global', 1),
    ((SELECT area_id FROM areas WHERE codigo = 'EXAUSTAO'), 'Quantitativos / Memorial Descritivo', 'global', 2)
ON CONFLICT (area_id, tipo, nome) DO NOTHING;

-- GAS
INSERT INTO area_pavimentos_template (area_id, nome, ordem) VALUES
    ((SELECT area_id FROM areas WHERE codigo = 'GAS'), 'Tipo', 1),
    ((SELECT area_id FROM areas WHERE codigo = 'GAS'), 'Mezanino', 2),
    ((SELECT area_id FROM areas WHERE codigo = 'GAS'), 'Térreo', 3),
    ((SELECT area_id FROM areas WHERE codigo = 'GAS'), 'Subsolo', 4),
    ((SELECT area_id FROM areas WHERE codigo = 'GAS'), 'Cobertura / Coberta', 5)
ON CONFLICT (area_id, nome) DO NOTHING;
INSERT INTO area_etapas_template (area_id, nome, tipo, ordem) VALUES
    ((SELECT area_id FROM areas WHERE codigo = 'GAS'), 'Pontos', 'pavimento', 1),
    ((SELECT area_id FROM areas WHERE codigo = 'GAS'), 'Tubulações', 'pavimento', 2),
    ((SELECT area_id FROM areas WHERE codigo = 'GAS'), 'Legendas', 'pavimento', 3),
    ((SELECT area_id FROM areas WHERE codigo = 'GAS'), 'Shaft / Detalhe medidores', 'pavimento', 4),
    ((SELECT area_id FROM areas WHERE codigo = 'GAS'), 'Dimensionamento Prumada', 'global', 1),
    ((SELECT area_id FROM areas WHERE codigo = 'GAS'), 'Entrada / Ramal de Alimentação', 'global', 2),
    ((SELECT area_id FROM areas WHERE codigo = 'GAS'), 'Corte Esquemático', 'global', 3),
    ((SELECT area_id FROM areas WHERE codigo = 'GAS'), 'Pranchas', 'global', 4),
    ((SELECT area_id FROM areas WHERE codigo = 'GAS'), 'Quantitativos / Memorial Descritivo', 'global', 5)
ON CONFLICT (area_id, tipo, nome) DO NOTHING;




-- =====================================================
-- PARTE 5: FUNÇÃO seed_pavimentos_etapas
-- =====================================================
-- Popula projeto_pavimentos / pavimento_etapas / projeto_etapas_globais
-- para um par (projeto, área), distribuindo pesos igualmente.
-- Idempotente: se já existem pavimentos para esse par, retorna sem alterar.
-- =====================================================

CREATE OR REPLACE FUNCTION seed_pavimentos_etapas(p_projeto_id UUID, p_area_id UUID)
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
    IF EXISTS (SELECT 1 FROM projeto_pavimentos
               WHERE projeto_id = p_projeto_id AND area_id = p_area_id) THEN
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_pav_count FROM area_pavimentos_template
        WHERE area_id = p_area_id AND ativo = true;
    SELECT COUNT(*) INTO v_glb_count FROM area_etapas_template
        WHERE area_id = p_area_id AND tipo = 'global' AND ativo = true;
    SELECT COUNT(*) INTO v_etapa_pav_count FROM area_etapas_template
        WHERE area_id = p_area_id AND tipo = 'pavimento' AND ativo = true;

    v_total_n1 := v_pav_count + v_glb_count;
    IF v_total_n1 = 0 THEN RETURN; END IF;

    v_peso_n1 := ROUND(100.0 / v_total_n1, 2);
    v_peso_etapa := CASE WHEN v_etapa_pav_count > 0
                         THEN ROUND(100.0 / v_etapa_pav_count, 2)
                         ELSE 0 END;

    FOR v_pav IN
        SELECT nome, ordem FROM area_pavimentos_template
        WHERE area_id = p_area_id AND ativo = true ORDER BY ordem
    LOOP
        INSERT INTO projeto_pavimentos (projeto_id, area_id, nome, ordem, peso, ativo)
        VALUES (p_projeto_id, p_area_id, v_pav.nome, v_pav.ordem, v_peso_n1, true);

        INSERT INTO pavimento_etapas (pavimento_id, nome, peso, ativo)
        SELECT pp.pavimento_id, t.nome, v_peso_etapa, true
        FROM projeto_pavimentos pp
        CROSS JOIN area_etapas_template t
        WHERE pp.projeto_id = p_projeto_id
          AND pp.area_id = p_area_id
          AND pp.nome = v_pav.nome
          AND t.area_id = p_area_id
          AND t.tipo = 'pavimento'
          AND t.ativo = true;
    END LOOP;

    INSERT INTO projeto_etapas_globais (projeto_id, area_id, nome, peso, ativo)
    SELECT p_projeto_id, p_area_id, nome, v_peso_n1, true
    FROM area_etapas_template
    WHERE area_id = p_area_id AND tipo = 'global' AND ativo = true
    ORDER BY ordem;

    PERFORM ajustar_residuo_pesos(p_projeto_id, p_area_id);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION seed_pavimentos_etapas IS
'Popula pavimentos/etapas/etapas globais de um par (projeto, área) com pesos iguais distribuídos.';

-- =====================================================
-- PARTE 6: ajustar_residuo_pesos
-- =====================================================
-- Após distribuição igualitária + arredondamento, joga o resíduo
-- (positivo ou negativo) no último item para fechar exatamente 100%.
-- Mantém invariantes de calculateWeightedProgress.ts:
--   nível 1: pavimentos + globais = 100
--   nível 2: etapas dentro de cada pavimento = 100
-- =====================================================

CREATE OR REPLACE FUNCTION ajustar_residuo_pesos(p_projeto_id UUID, p_area_id UUID)
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
        COALESCE((SELECT SUM(peso) FROM projeto_pavimentos
                  WHERE projeto_id = p_projeto_id AND area_id = p_area_id AND ativo = true), 0) +
        COALESCE((SELECT SUM(peso) FROM projeto_etapas_globais
                  WHERE projeto_id = p_projeto_id AND area_id = p_area_id AND ativo = true), 0)
    INTO v_soma_n1;
    v_residuo_n1 := 100 - v_soma_n1;

    IF v_residuo_n1 != 0 THEN
        -- Preferir aplicar resíduo no último pavimento; se não houver pavimentos,
        -- aplicar na última etapa global.
        SELECT pavimento_id INTO v_target_pav FROM projeto_pavimentos
        WHERE projeto_id = p_projeto_id AND area_id = p_area_id AND ativo = true
        ORDER BY ordem DESC LIMIT 1;

        IF v_target_pav IS NOT NULL THEN
            UPDATE projeto_pavimentos SET peso = peso + v_residuo_n1
            WHERE pavimento_id = v_target_pav;
        ELSE
            SELECT etapa_global_id INTO v_target_glb FROM projeto_etapas_globais
            WHERE projeto_id = p_projeto_id AND area_id = p_area_id AND ativo = true
            ORDER BY created_at DESC LIMIT 1;
            IF v_target_glb IS NOT NULL THEN
                UPDATE projeto_etapas_globais SET peso = peso + v_residuo_n1
                WHERE etapa_global_id = v_target_glb;
            END IF;
        END IF;
    END IF;

    FOR v_pav IN
        SELECT pavimento_id FROM projeto_pavimentos
        WHERE projeto_id = p_projeto_id AND area_id = p_area_id AND ativo = true
    LOOP
        SELECT COALESCE(SUM(peso), 0) INTO v_soma_etapa
        FROM pavimento_etapas WHERE pavimento_id = v_pav.pavimento_id AND ativo = true;
        v_residuo_etapa := 100 - v_soma_etapa;
        IF v_soma_etapa > 0 AND v_residuo_etapa != 0 THEN
            UPDATE pavimento_etapas SET peso = peso + v_residuo_etapa
            WHERE etapa_id = (
                SELECT etapa_id FROM pavimento_etapas
                WHERE pavimento_id = v_pav.pavimento_id AND ativo = true
                ORDER BY created_at DESC LIMIT 1
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 7: TRIGGER em engenheiros_projetos
-- =====================================================

CREATE OR REPLACE FUNCTION trg_seed_on_atribuicao()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.area_id IS NOT NULL AND NEW.ativo = true THEN
        PERFORM seed_pavimentos_etapas(NEW.projeto_id, NEW.area_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seed_pav_etapa ON engenheiros_projetos;
CREATE TRIGGER trg_seed_pav_etapa
    AFTER INSERT OR UPDATE OF area_id, ativo ON engenheiros_projetos
    FOR EACH ROW
    EXECUTE FUNCTION trg_seed_on_atribuicao();

-- =====================================================
-- PARTE 8: BACKFILL DOS PROJETOS EXISTENTES
-- =====================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT DISTINCT projeto_id, area_id
        FROM engenheiros_projetos
        WHERE ativo = true AND area_id IS NOT NULL
    LOOP
        PERFORM seed_pavimentos_etapas(r.projeto_id, r.area_id);
    END LOOP;
END $$;

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
