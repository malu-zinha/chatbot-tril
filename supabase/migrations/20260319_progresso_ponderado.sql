-- =====================================================
-- MIGRAÇÃO: PROGRESSO PONDERADO POR PAVIMENTO/ETAPA
-- Sistema de cálculo de progresso em dois níveis:
--   Nível 1: Pavimentos (andares) com peso %
--   Nível 2: Etapas dentro de cada pavimento com peso %
--   + Etapas globais (não vinculadas a pavimento)
-- =====================================================
--
-- Fórmula:
--   progresso = SUM(peso_pavimento * progresso_interno_pavimento / 100)
--             + SUM(peso_etapa_global onde concluida = true)
--
-- Onde progresso_interno_pavimento = SUM(peso_etapa) onde concluida = true
--
-- EXECUTE APÓS: MASTER_SCHEMA_COMPLETO.sql + triggers_e_views.sql
-- =====================================================

-- =====================================================
-- PARTE 1: NOVAS TABELAS
-- =====================================================

-- Pavimentos (andares/níveis de um projeto)
CREATE TABLE IF NOT EXISTS projeto_pavimentos (
    pavimento_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    projeto_id UUID NOT NULL REFERENCES projetos(projeto_id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    peso NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(projeto_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_pav_projeto_id ON projeto_pavimentos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_pav_ativo ON projeto_pavimentos(ativo);

COMMENT ON TABLE projeto_pavimentos IS 'Pavimentos/andares de um projeto, cada um com peso percentual';
COMMENT ON COLUMN projeto_pavimentos.peso IS 'Peso do pavimento no progresso total do projeto (0-100)';

-- Etapas dentro de um pavimento
CREATE TABLE IF NOT EXISTS pavimento_etapas (
    etapa_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pavimento_id UUID NOT NULL REFERENCES projeto_pavimentos(pavimento_id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    peso NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    concluida BOOLEAN DEFAULT false,
    data_conclusao DATE,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pavimento_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_pav_etapa_pavimento_id ON pavimento_etapas(pavimento_id);
CREATE INDEX IF NOT EXISTS idx_pav_etapa_concluida ON pavimento_etapas(concluida);

COMMENT ON TABLE pavimento_etapas IS 'Etapas/tarefas dentro de um pavimento, cada uma com peso percentual interno';
COMMENT ON COLUMN pavimento_etapas.peso IS 'Peso da etapa dentro do pavimento (0-100, soma interna ao pavimento)';

-- Etapas globais (não vinculadas a pavimento)
CREATE TABLE IF NOT EXISTS projeto_etapas_globais (
    etapa_global_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    projeto_id UUID NOT NULL REFERENCES projetos(projeto_id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    peso NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    concluida BOOLEAN DEFAULT false,
    data_conclusao DATE,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(projeto_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_etapa_global_projeto_id ON projeto_etapas_globais(projeto_id);
CREATE INDEX IF NOT EXISTS idx_etapa_global_concluida ON projeto_etapas_globais(concluida);

COMMENT ON TABLE projeto_etapas_globais IS 'Etapas globais do projeto não vinculadas a nenhum pavimento';
COMMENT ON COLUMN projeto_etapas_globais.peso IS 'Peso da etapa global no progresso total do projeto (0-100)';

-- =====================================================
-- PARTE 2: NOVA COLUNA EM PROJETOS
-- =====================================================

ALTER TABLE projetos
    ADD COLUMN IF NOT EXISTS percentual_ponderado NUMERIC(5,2) DEFAULT 0.00;

COMMENT ON COLUMN projetos.percentual_ponderado IS 'Progresso ponderado calculado a partir de pavimentos e etapas globais';

-- =====================================================
-- PARTE 3: TRIGGERS updated_at PARA NOVAS TABELAS
-- =====================================================

CREATE TRIGGER trg_pav_updated_at
    BEFORE UPDATE ON projeto_pavimentos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_pav_etapa_updated_at
    BEFORE UPDATE ON pavimento_etapas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_etapa_global_updated_at
    BEFORE UPDATE ON projeto_etapas_globais
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PARTE 4: FUNCTION DE RECÁLCULO
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_progresso_ponderado(p_projeto_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_progresso NUMERIC(5,2) := 0.00;
    v_contrib_pavimentos NUMERIC := 0.00;
    v_contrib_globais NUMERIC := 0.00;
    v_pav RECORD;
    v_progresso_interno NUMERIC;
BEGIN
    -- Contribuição dos pavimentos
    FOR v_pav IN
        SELECT pavimento_id, peso
        FROM projeto_pavimentos
        WHERE projeto_id = p_projeto_id AND ativo = true
    LOOP
        -- Soma dos pesos das etapas concluídas dentro deste pavimento
        SELECT COALESCE(SUM(peso), 0.00)
        INTO v_progresso_interno
        FROM pavimento_etapas
        WHERE pavimento_id = v_pav.pavimento_id
            AND concluida = true
            AND ativo = true;

        v_contrib_pavimentos := v_contrib_pavimentos
            + (v_pav.peso * v_progresso_interno / 100.00);
    END LOOP;

    -- Contribuição das etapas globais concluídas
    SELECT COALESCE(SUM(peso), 0.00)
    INTO v_contrib_globais
    FROM projeto_etapas_globais
    WHERE projeto_id = p_projeto_id
        AND concluida = true
        AND ativo = true;

    v_progresso := v_contrib_pavimentos + v_contrib_globais;

    -- Limita entre 0 e 100
    IF v_progresso > 100.00 THEN
        v_progresso := 100.00;
    ELSIF v_progresso < 0.00 THEN
        v_progresso := 0.00;
    END IF;

    RETURN ROUND(v_progresso, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_progresso_ponderado IS 'Calcula progresso ponderado de um projeto baseado em pavimentos, etapas e etapas globais';

-- =====================================================
-- PARTE 5: FUNCTION DE ATUALIZAÇÃO NO PROJETO
-- =====================================================

CREATE OR REPLACE FUNCTION atualizar_percentual_ponderado()
RETURNS TRIGGER AS $$
DECLARE
    v_projeto_id UUID;
BEGIN
    -- Determina o projeto_id dependendo da tabela que disparou o trigger
    IF TG_TABLE_NAME = 'pavimento_etapas' THEN
        SELECT pp.projeto_id INTO v_projeto_id
        FROM projeto_pavimentos pp
        WHERE pp.pavimento_id = COALESCE(NEW.pavimento_id, OLD.pavimento_id);
    ELSIF TG_TABLE_NAME = 'projeto_etapas_globais' THEN
        v_projeto_id := COALESCE(NEW.projeto_id, OLD.projeto_id);
    ELSIF TG_TABLE_NAME = 'projeto_pavimentos' THEN
        v_projeto_id := COALESCE(NEW.projeto_id, OLD.projeto_id);
    END IF;

    -- Recalcula e atualiza
    IF v_projeto_id IS NOT NULL THEN
        UPDATE projetos
        SET percentual_ponderado = calcular_progresso_ponderado(v_projeto_id)
        WHERE projeto_id = v_projeto_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION atualizar_percentual_ponderado IS 'Trigger function que recalcula percentual_ponderado quando etapas ou pavimentos mudam';

-- =====================================================
-- PARTE 6: TRIGGERS DE RECÁLCULO AUTOMÁTICO
-- =====================================================

-- Quando uma etapa de pavimento muda (concluída, peso, ativada/desativada)
CREATE TRIGGER trg_recalc_etapa_pavimento
    AFTER INSERT OR UPDATE OF concluida, peso, ativo OR DELETE
    ON pavimento_etapas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_percentual_ponderado();

-- Quando uma etapa global muda
CREATE TRIGGER trg_recalc_etapa_global
    AFTER INSERT OR UPDATE OF concluida, peso, ativo OR DELETE
    ON projeto_etapas_globais
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_percentual_ponderado();

-- Quando um pavimento muda de peso ou é ativado/desativado
CREATE TRIGGER trg_recalc_pavimento
    AFTER INSERT OR UPDATE OF peso, ativo OR DELETE
    ON projeto_pavimentos
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_percentual_ponderado();

-- =====================================================
-- PARTE 7: TRIGGER data_conclusao AUTOMÁTICA
-- =====================================================

CREATE OR REPLACE FUNCTION auto_data_conclusao_etapa()
RETURNS TRIGGER AS $$
BEGIN
    -- Preenche data_conclusao ao marcar como concluída
    IF NEW.concluida = true AND (OLD.concluida = false OR OLD.concluida IS NULL) THEN
        NEW.data_conclusao := COALESCE(NEW.data_conclusao, CURRENT_DATE);
    END IF;

    -- Limpa data_conclusao ao desmarcar
    IF NEW.concluida = false AND OLD.concluida = true THEN
        NEW.data_conclusao := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_data_conclusao_etapa IS 'Preenche/limpa data_conclusao automaticamente ao mudar flag concluida';

CREATE TRIGGER trg_auto_data_conclusao_pav_etapa
    BEFORE UPDATE OF concluida ON pavimento_etapas
    FOR EACH ROW
    EXECUTE FUNCTION auto_data_conclusao_etapa();

CREATE TRIGGER trg_auto_data_conclusao_etapa_global
    BEFORE UPDATE OF concluida ON projeto_etapas_globais
    FOR EACH ROW
    EXECUTE FUNCTION auto_data_conclusao_etapa();

-- =====================================================
-- PARTE 8: VIEW DE PROGRESSO PONDERADO
-- =====================================================

CREATE OR REPLACE VIEW vw_progresso_ponderado AS
SELECT
    p.projeto_id,
    p.codigo_projeto,
    p.cliente,
    p.percentual_ponderado,

    -- Total de pavimentos configurados
    (SELECT COUNT(*)
     FROM projeto_pavimentos pp
     WHERE pp.projeto_id = p.projeto_id AND pp.ativo = true
    ) AS total_pavimentos,

    -- Total de etapas globais configuradas
    (SELECT COUNT(*)
     FROM projeto_etapas_globais eg
     WHERE eg.projeto_id = p.projeto_id AND eg.ativo = true
    ) AS total_etapas_globais,

    -- Soma dos pesos configurados (deve ser 100)
    (
        COALESCE((
            SELECT SUM(pp.peso)
            FROM projeto_pavimentos pp
            WHERE pp.projeto_id = p.projeto_id AND pp.ativo = true
        ), 0) +
        COALESCE((
            SELECT SUM(eg.peso)
            FROM projeto_etapas_globais eg
            WHERE eg.projeto_id = p.projeto_id AND eg.ativo = true
        ), 0)
    ) AS soma_pesos_configurados,

    -- Flag: pesos estão válidos (somam 100)?
    (
        COALESCE((
            SELECT SUM(pp.peso)
            FROM projeto_pavimentos pp
            WHERE pp.projeto_id = p.projeto_id AND pp.ativo = true
        ), 0) +
        COALESCE((
            SELECT SUM(eg.peso)
            FROM projeto_etapas_globais eg
            WHERE eg.projeto_id = p.projeto_id AND eg.ativo = true
        ), 0)
    ) = 100.00 AS pesos_validos

FROM projetos p
WHERE p.ativo = true;

COMMENT ON VIEW vw_progresso_ponderado IS 'Visão do progresso ponderado por projeto com validação de pesos';

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
--
-- RESUMO:
-- + 3 tabelas: projeto_pavimentos, pavimento_etapas, projeto_etapas_globais
-- + 1 coluna: projetos.percentual_ponderado
-- + 2 functions: calcular_progresso_ponderado, atualizar_percentual_ponderado
-- + 1 function: auto_data_conclusao_etapa
-- + 3 triggers updated_at (novas tabelas)
-- + 3 triggers recálculo automático (etapas e pavimentos)
-- + 2 triggers data_conclusao automática
-- + 1 view: vw_progresso_ponderado
-- =====================================================
