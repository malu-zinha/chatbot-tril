-- =====================================================
-- MIGRATION 001: Expandir Schema para Alinhar com Planilha
-- =====================================================
-- Data: 2025-01-06
-- Objetivo: Adicionar campos faltantes para sincronização completa
--          entre Google Sheets e Supabase
-- =====================================================

-- =====================================================
-- PARTE 1: EXPANDIR TABELA PROJETOS
-- =====================================================

ALTER TABLE projetos 
-- Informações adicionais do cliente
ADD COLUMN IF NOT EXISTS contato_cliente VARCHAR(255),

-- Tipo e descrição do projeto
ADD COLUMN IF NOT EXISTS tipo_projeto VARCHAR(10), -- H1, H2, E1, T1, G1, CL1, etc
ADD COLUMN IF NOT EXISTS descricao_projeto TEXT,
ADD COLUMN IF NOT EXISTS complexidade VARCHAR(50),

-- Datas e prazos expandidos
ADD COLUMN IF NOT EXISTS dias_estimados_interno INTEGER,
ADD COLUMN IF NOT EXISTS data_final_cliente DATE,
ADD COLUMN IF NOT EXISTS prazo_interno_dias INTEGER,
ADD COLUMN IF NOT EXISTS prazo_cliente_dias INTEGER,
ADD COLUMN IF NOT EXISTS dias_atraso INTEGER DEFAULT 0,

-- Controle de etapa
ADD COLUMN IF NOT EXISTS etapa_atual VARCHAR(100),

-- Métricas adicionais
ADD COLUMN IF NOT EXISTS metrica_retrabalho NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS data_entrega_real DATE,
ADD COLUMN IF NOT EXISTS lead_time_dias INTEGER,
ADD COLUMN IF NOT EXISTS dias_parado_cliente INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dias_parado_tecpred INTEGER DEFAULT 0;

-- Comentários descritivos
COMMENT ON COLUMN projetos.contato_cliente IS 'Telefone ou e-mail do cliente';
COMMENT ON COLUMN projetos.tipo_projeto IS 'Código do tipo (H1, E1, T1, G1, CL1, etc)';
COMMENT ON COLUMN projetos.descricao_projeto IS 'Descrição automática baseada no tipo';
COMMENT ON COLUMN projetos.complexidade IS 'Nível de complexidade do projeto';
COMMENT ON COLUMN projetos.data_final_cliente IS 'Data acordada com o cliente';
COMMENT ON COLUMN projetos.prazo_interno_dias IS 'Prazo interno em dias úteis';
COMMENT ON COLUMN projetos.prazo_cliente_dias IS 'Prazo do cliente em dias úteis';
COMMENT ON COLUMN projetos.dias_atraso IS 'Quantidade de dias em atraso';
COMMENT ON COLUMN projetos.etapa_atual IS 'Etapa atual do projeto';
COMMENT ON COLUMN projetos.metrica_retrabalho IS 'Métrica acumulada de retrabalhos';
COMMENT ON COLUMN projetos.data_entrega_real IS 'Data real de entrega do projeto';
COMMENT ON COLUMN projetos.lead_time_dias IS 'Lead time total em dias úteis';
COMMENT ON COLUMN projetos.dias_parado_cliente IS 'Dias parado aguardando cliente';
COMMENT ON COLUMN projetos.dias_parado_tecpred IS 'Dias parado por questões internas';

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_projetos_tipo_projeto ON projetos(tipo_projeto);
CREATE INDEX IF NOT EXISTS idx_projetos_etapa_atual ON projetos(etapa_atual);
CREATE INDEX IF NOT EXISTS idx_projetos_data_final_cliente ON projetos(data_final_cliente);

-- =====================================================
-- PARTE 2: CRIAR TABELA ATUALIZACOES_DIARIAS
-- =====================================================
-- Para armazenar "Previsão para o dia" e "Feito ao final do dia"
-- (campos textuais que mudam diariamente)

CREATE TABLE IF NOT EXISTS atualizacoes_diarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Atualização da manhã
    previsao_dia TEXT,
    status_projeto VARCHAR(50), -- snapshot do status naquele dia
    
    -- Atualização da noite
    feito_dia TEXT,
    necessitou_retrabalho BOOLEAN DEFAULT false,
    motivo_revisao VARCHAR(255),
    data_registro_retrabalho DATE,
    etapa VARCHAR(100), -- snapshot da etapa naquele dia
    
    -- Observações gerais do dia
    observacoes TEXT,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Garantir que não haja duplicatas de projeto+data
    UNIQUE(projeto_id, data)
);

-- Índices para busca otimizada
CREATE INDEX IF NOT EXISTS idx_atualizacoes_projeto ON atualizacoes_diarias(projeto_id);
CREATE INDEX IF NOT EXISTS idx_atualizacoes_data ON atualizacoes_diarias(data);
CREATE INDEX IF NOT EXISTS idx_atualizacoes_projeto_data ON atualizacoes_diarias(projeto_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_atualizacoes_necessitou_retrabalho ON atualizacoes_diarias(necessitou_retrabalho) WHERE necessitou_retrabalho = true;

-- Comentários descritivos
COMMENT ON TABLE atualizacoes_diarias IS 'Registro das atualizações matinais e noturnas dos engenheiros';
COMMENT ON COLUMN atualizacoes_diarias.previsao_dia IS 'O que o engenheiro planeja fazer no dia (manhã)';
COMMENT ON COLUMN atualizacoes_diarias.feito_dia IS 'O que foi efetivamente feito no dia (noite)';
COMMENT ON COLUMN atualizacoes_diarias.necessitou_retrabalho IS 'Se houve necessidade de retrabalho neste dia';
COMMENT ON COLUMN atualizacoes_diarias.motivo_revisao IS 'Motivo do retrabalho (erro interno, mudança de escopo, etc)';
COMMENT ON COLUMN atualizacoes_diarias.data_registro_retrabalho IS 'Data em que o retrabalho foi registrado';
COMMENT ON COLUMN atualizacoes_diarias.etapa IS 'Etapa do projeto naquele dia';

-- =====================================================
-- PARTE 3: TRIGGERS AUTOMÁTICOS
-- =====================================================

-- Trigger para atualizar updated_at em atualizacoes_diarias
CREATE TRIGGER update_atualizacoes_diarias_updated_at 
    BEFORE UPDATE ON atualizacoes_diarias
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar etapa_atual do projeto quando atualização diária é feita
CREATE OR REPLACE FUNCTION atualizar_etapa_projeto_from_daily()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar a etapa_atual do projeto com a última etapa registrada
    IF NEW.etapa IS NOT NULL THEN
        UPDATE projetos
        SET etapa_atual = NEW.etapa,
            updated_at = NOW()
        WHERE id = NEW.projeto_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para sincronizar etapa
CREATE TRIGGER trigger_sync_etapa_projeto
    AFTER INSERT OR UPDATE ON atualizacoes_diarias
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_etapa_projeto_from_daily();

-- Função para calcular métrica de retrabalho automaticamente
CREATE OR REPLACE FUNCTION calcular_metrica_retrabalho()
RETURNS TRIGGER AS $$
DECLARE
    total_retrabalhos INTEGER;
    total_dias INTEGER;
    metrica NUMERIC(5,2);
BEGIN
    -- Contar retrabalhos do projeto
    SELECT COUNT(*) INTO total_retrabalhos
    FROM atualizacoes_diarias
    WHERE projeto_id = NEW.projeto_id 
    AND necessitou_retrabalho = true;
    
    -- Contar total de dias com atualização
    SELECT COUNT(DISTINCT data) INTO total_dias
    FROM atualizacoes_diarias
    WHERE projeto_id = NEW.projeto_id;
    
    -- Calcular métrica (% de dias com retrabalho)
    IF total_dias > 0 THEN
        metrica := (total_retrabalhos::NUMERIC / total_dias::NUMERIC) * 100;
        
        -- Atualizar métrica no projeto
        UPDATE projetos
        SET metrica_retrabalho = metrica,
            updated_at = NOW()
        WHERE id = NEW.projeto_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para recalcular métrica de retrabalho
CREATE TRIGGER trigger_calcular_metrica_retrabalho
    AFTER INSERT OR UPDATE ON atualizacoes_diarias
    FOR EACH ROW
    EXECUTE FUNCTION calcular_metrica_retrabalho();

-- =====================================================
-- PARTE 4: VIEW CONSOLIDADA PARA PLANILHA
-- =====================================================

CREATE OR REPLACE VIEW view_projetos_completo AS
SELECT 
    -- Campos básicos
    p.id,
    p.codigo,
    p.nome,
    p.cliente,
    p.contato_cliente,
    p.area,
    p.tipo_obra,
    p.tipo_projeto,
    p.descricao_projeto,
    p.complexidade,
    
    -- Engenheiro
    e.nome as engenheiro_nome,
    e.whatsapp as engenheiro_whatsapp,
    
    -- Datas
    p.data_inicio,
    p.data_previsao_termino,
    p.data_final_cliente,
    p.data_entrega_real,
    
    -- Prazos
    p.dias_estimados_interno,
    p.prazo_interno_dias,
    p.prazo_cliente_dias,
    p.dias_atraso,
    p.dias_parado_cliente,
    p.dias_parado_tecpred,
    p.lead_time_dias,
    
    -- Status e etapa
    p.status,
    p.etapa_atual,
    p.percentual_total,
    p.metrica_retrabalho,
    
    -- Última atualização diária
    ad.data as ultima_atualizacao,
    ad.previsao_dia,
    ad.feito_dia,
    ad.necessitou_retrabalho,
    ad.motivo_revisao,
    ad.data_registro_retrabalho,
    
    -- Observações
    p.observacoes as observacoes_projeto,
    ad.observacoes as observacoes_dia,
    
    -- Metadados
    p.ativo,
    p.created_at,
    p.updated_at
    
FROM projetos p
LEFT JOIN engenheiros e ON p.engenheiro_id = e.id
LEFT JOIN LATERAL (
    SELECT * FROM atualizacoes_diarias 
    WHERE projeto_id = p.id 
    ORDER BY data DESC 
    LIMIT 1
) ad ON true
WHERE p.ativo = true
ORDER BY p.codigo;

COMMENT ON VIEW view_projetos_completo IS 'View consolidada com todos os dados do projeto + última atualização diária';

-- =====================================================
-- PARTE 5: FUNCTION PARA SINCRONIZAÇÃO COM PLANILHA
-- =====================================================

CREATE OR REPLACE FUNCTION sync_projeto_from_sheet(
    p_codigo VARCHAR(50),
    p_cliente VARCHAR(255),
    p_contato VARCHAR(255),
    p_obra VARCHAR(100),
    p_area VARCHAR(100),
    p_eng_responsavel VARCHAR(255),
    p_tipo_projeto VARCHAR(10),
    p_descricao TEXT,
    p_data_inicio DATE,
    p_data_previsao_interna DATE,
    p_data_final_cliente DATE,
    p_prazo_interno INTEGER,
    p_prazo_cliente INTEGER,
    p_status VARCHAR(50),
    p_etapa VARCHAR(100),
    p_percentual NUMERIC(5,2),
    p_observacoes TEXT
) RETURNS JSON AS $$
DECLARE
    v_projeto_id UUID;
    v_engenheiro_id UUID;
    v_result JSON;
BEGIN
    -- 1. Buscar ou criar engenheiro (se não existir, cria genérico)
    SELECT id INTO v_engenheiro_id
    FROM engenheiros
    WHERE nome = p_eng_responsavel
    LIMIT 1;
    
    IF v_engenheiro_id IS NULL THEN
        INSERT INTO engenheiros (nome, whatsapp)
        VALUES (p_eng_responsavel, '+5500000000000')
        RETURNING id INTO v_engenheiro_id;
    END IF;
    
    -- 2. Inserir ou atualizar projeto
    INSERT INTO projetos (
        codigo, nome, cliente, contato_cliente, engenheiro_id,
        area, tipo_obra, tipo_projeto, descricao_projeto,
        data_inicio, data_previsao_termino, data_final_cliente,
        prazo_interno_dias, prazo_cliente_dias,
        status, etapa_atual, percentual_total, observacoes
    ) VALUES (
        p_codigo, p_obra, p_cliente, p_contato, v_engenheiro_id,
        p_area, p_obra, p_tipo_projeto, p_descricao,
        p_data_inicio, p_data_previsao_interna, p_data_final_cliente,
        p_prazo_interno, p_prazo_cliente,
        p_status, p_etapa, p_percentual, p_observacoes
    )
    ON CONFLICT (codigo) DO UPDATE SET
        cliente = EXCLUDED.cliente,
        contato_cliente = EXCLUDED.contato_cliente,
        area = EXCLUDED.area,
        tipo_obra = EXCLUDED.tipo_obra,
        tipo_projeto = EXCLUDED.tipo_projeto,
        descricao_projeto = EXCLUDED.descricao_projeto,
        data_previsao_termino = EXCLUDED.data_previsao_termino,
        data_final_cliente = EXCLUDED.data_final_cliente,
        prazo_interno_dias = EXCLUDED.prazo_interno_dias,
        prazo_cliente_dias = EXCLUDED.prazo_cliente_dias,
        status = EXCLUDED.status,
        etapa_atual = EXCLUDED.etapa_atual,
        percentual_total = EXCLUDED.percentual_total,
        observacoes = EXCLUDED.observacoes,
        updated_at = NOW()
    RETURNING id INTO v_projeto_id;
    
    -- 3. Retornar resultado
    v_result := json_build_object(
        'success', true,
        'projeto_id', v_projeto_id,
        'codigo', p_codigo
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_projeto_from_sheet IS 'Sincroniza dados da planilha para o banco';

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
-- Para aplicar esta migration:
-- 1. Copie todo o conteúdo deste arquivo
-- 2. Acesse Supabase Dashboard → SQL Editor
-- 3. Cole e execute (Run)
-- =====================================================

