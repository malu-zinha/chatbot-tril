-- =====================================================
-- SCHEMA DO BANCO DE DADOS - CHATBOT TRIL CONSULT
-- =====================================================
-- Responsabilidade: Iza (Banco de Dados)
-- 
-- Este arquivo define toda a estrutura de tabelas do sistema
-- que armazena informações de engenheiros, projetos, execuções
-- diárias e retrabalhos.
-- =====================================================

-- =====================================================
-- TABELA: engenheiros
-- =====================================================
-- Armazena informações dos engenheiros que utilizam o sistema
-- Cada engenheiro tem acesso apenas aos seus próprios projetos
-- =====================================================

CREATE TABLE IF NOT EXISTS engenheiros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL UNIQUE, -- Formato: +5511999999999
    email VARCHAR(255) UNIQUE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para busca otimizada
CREATE INDEX idx_engenheiros_whatsapp ON engenheiros(whatsapp);
CREATE INDEX idx_engenheiros_ativo ON engenheiros(ativo);

-- Comentários descritivos
COMMENT ON TABLE engenheiros IS 'Cadastro de engenheiros que utilizam o chatbot';
COMMENT ON COLUMN engenheiros.whatsapp IS 'Número de WhatsApp para identificação no chatbot';


-- =====================================================
-- TABELA: projetos
-- =====================================================
-- Armazena todos os projetos vinculados aos engenheiros
-- Cada projeto pertence a um único engenheiro
-- =====================================================

CREATE TABLE IF NOT EXISTS projetos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE, -- Ex: PRJ-001, PRJ-002
    nome VARCHAR(255) NOT NULL,
    cliente VARCHAR(255) NOT NULL,
    engenheiro_id UUID NOT NULL REFERENCES engenheiros(id) ON DELETE CASCADE,
    area VARCHAR(100), -- Ex: Elétrico, Hidráulico, Estrutural
    tipo_obra VARCHAR(100), -- Ex: Predial, Industrial, Residencial
    status VARCHAR(50) DEFAULT 'Em Planejamento', -- Ex: Em Planejamento, Em Execução, Parado, Concluído
    percentual_total NUMERIC(5,2) DEFAULT 0.00 CHECK (percentual_total >= 0 AND percentual_total <= 100),
    data_inicio DATE,
    data_previsao_termino DATE,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para busca otimizada
CREATE INDEX idx_projetos_engenheiro ON projetos(engenheiro_id);
CREATE INDEX idx_projetos_codigo ON projetos(codigo);
CREATE INDEX idx_projetos_status ON projetos(status);
CREATE INDEX idx_projetos_ativo ON projetos(ativo);

-- Comentários descritivos
COMMENT ON TABLE projetos IS 'Cadastro de projetos vinculados aos engenheiros';
COMMENT ON COLUMN projetos.percentual_total IS 'Percentual acumulado de execução do projeto (0-100)';
COMMENT ON COLUMN projetos.status IS 'Status atual do projeto';


-- =====================================================
-- TABELA: execucao_diaria
-- =====================================================
-- Registra a execução diária de cada projeto
-- Permite acompanhar previsão vs realizado dia a dia
-- =====================================================

CREATE TABLE IF NOT EXISTS execucao_diaria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Execução do dia
    percentual_previsto NUMERIC(5,2) CHECK (percentual_previsto >= 0 AND percentual_previsto <= 100),
    percentual_realizado NUMERIC(5,2) NOT NULL CHECK (percentual_realizado >= 0 AND percentual_realizado <= 100),
    
    -- Acumulado até esta data
    percentual_acumulado NUMERIC(5,2) CHECK (percentual_acumulado >= 0 AND percentual_acumulado <= 100),
    
    -- Observações e notificações
    observacoes TEXT,
    notificacao_enviada BOOLEAN DEFAULT false,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Garantir que não haja duplicatas de projeto+data
    UNIQUE(projeto_id, data)
);

-- Índices para busca otimizada
CREATE INDEX idx_execucao_projeto ON execucao_diaria(projeto_id);
CREATE INDEX idx_execucao_data ON execucao_diaria(data);
CREATE INDEX idx_execucao_projeto_data ON execucao_diaria(projeto_id, data DESC);

-- Comentários descritivos
COMMENT ON TABLE execucao_diaria IS 'Registro diário de execução dos projetos';
COMMENT ON COLUMN execucao_diaria.percentual_previsto IS 'Percentual que era previsto executar no dia (manhã)';
COMMENT ON COLUMN execucao_diaria.percentual_realizado IS 'Percentual realmente executado no dia (noite)';
COMMENT ON COLUMN execucao_diaria.percentual_acumulado IS 'Percentual total acumulado até esta data';


-- =====================================================
-- TABELA: retrabalhos
-- =====================================================
-- Registra ocorrências de retrabalho nos projetos
-- Permite categorização e análise de motivos
-- =====================================================

CREATE TABLE IF NOT EXISTS retrabalhos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    execucao_diaria_id UUID REFERENCES execucao_diaria(id) ON DELETE SET NULL,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Classificação do retrabalho
    motivo VARCHAR(100) NOT NULL, -- Ex: Erro de Projeto, Mudança de Escopo, Problema de Material
    categoria VARCHAR(50), -- Ex: Técnico, Cliente, Fornecedor, Planejamento
    
    -- Detalhes
    descricao TEXT NOT NULL,
    impacto_percentual NUMERIC(5,2) CHECK (impacto_percentual >= 0), -- Quanto % foi perdido
    tempo_perdido_horas NUMERIC(8,2), -- Horas de trabalho perdidas
    
    -- Ações tomadas
    acao_corretiva TEXT,
    resolvido BOOLEAN DEFAULT false,
    data_resolucao DATE,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para busca otimizada
CREATE INDEX idx_retrabalhos_projeto ON retrabalhos(projeto_id);
CREATE INDEX idx_retrabalhos_data ON retrabalhos(data);
CREATE INDEX idx_retrabalhos_motivo ON retrabalhos(motivo);
CREATE INDEX idx_retrabalhos_categoria ON retrabalhos(categoria);

-- Comentários descritivos
COMMENT ON TABLE retrabalhos IS 'Registro de retrabalhos e seus motivos';
COMMENT ON COLUMN retrabalhos.motivo IS 'Motivo principal do retrabalho';
COMMENT ON COLUMN retrabalhos.impacto_percentual IS 'Percentual de execução perdido devido ao retrabalho';


-- =====================================================
-- TRIGGERS: Atualização automática de updated_at
-- =====================================================

-- Função genérica para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para cada tabela
CREATE TRIGGER update_engenheiros_updated_at BEFORE UPDATE ON engenheiros
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projetos_updated_at BEFORE UPDATE ON projetos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_execucao_diaria_updated_at BEFORE UPDATE ON execucao_diaria
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_retrabalhos_updated_at BEFORE UPDATE ON retrabalhos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- FUNÇÃO: Atualizar percentual total do projeto
-- =====================================================
-- Automaticamente atualiza o percentual_total do projeto
-- quando uma nova execução diária é registrada
-- =====================================================

CREATE OR REPLACE FUNCTION atualizar_percentual_projeto()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualiza o percentual total do projeto com o último valor acumulado
    UPDATE projetos
    SET percentual_total = NEW.percentual_acumulado,
        updated_at = NOW()
    WHERE id = NEW.projeto_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar automaticamente
CREATE TRIGGER trigger_atualizar_percentual_projeto
    AFTER INSERT OR UPDATE ON execucao_diaria
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_percentual_projeto();


-- =====================================================
-- DADOS DE EXEMPLO (OPCIONAL - remover em produção)
-- =====================================================

-- Exemplo de engenheiro
-- INSERT INTO engenheiros (nome, whatsapp, email) VALUES
-- ('João Silva', '+5511999999999', 'joao.silva@example.com'),
-- ('Maria Santos', '+5511988888888', 'maria.santos@example.com');

-- Exemplo de projeto
-- INSERT INTO projetos (codigo, nome, cliente, engenheiro_id, area, tipo_obra, status) VALUES
-- ('PRJ-001', 'Instalação Elétrica Prédio A', 'Construtora ABC', 
--  (SELECT id FROM engenheiros WHERE whatsapp = '+5511999999999'), 
--  'Elétrico', 'Predial', 'Em Execução');
