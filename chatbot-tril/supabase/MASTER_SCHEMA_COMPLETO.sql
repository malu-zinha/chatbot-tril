-- =====================================================
-- SCHEMA MASTER COMPLETO - SISTEMA TECPRED
-- Sistema de Gestão de Projetos via Chatbot WhatsApp
-- =====================================================
-- 
-- EXECUTE ESTE ARQUIVO ÚNICO NO SUPABASE
-- 
-- Inclui:
-- 1. Schema base (engenheiros, projetos, áreas)
-- 2. Tabelas de previsões e retrabalhos
-- 3. Tabela Evandro (dono)
-- 4. Triggers automáticos
-- 5. Functions para chatbot
-- 6. Views consolidadas
-- 
-- Ordem de execução:
-- 1º → Este arquivo (MASTER_SCHEMA_COMPLETO.sql)=
===-- 2º → Testar functions via SQL Editor
-- 3º → Implementar webhook WhatsApp
-- 
-- =====================================================

-- Habilitar extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PARTE 1: TABELAS BASE
-- =====================================================

\echo '🔧 Criando tabelas base...'

-- Engenheiros
CREATE TABLE IF NOT EXISTS engenheiros (
    eng_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    exclusivo BOOLEAN NOT NULL DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_engenheiros_ativo ON engenheiros(ativo);

COMMENT ON TABLE engenheiros IS 'Cadastro de engenheiros';
COMMENT ON COLUMN engenheiros.exclusivo IS 'TRUE se trabalha somente na empresa';

-- Áreas
CREATE TABLE IF NOT EXISTS areas (
    area_id SERIAL PRIMARY KEY,
    codigo TEXT UNIQUE NOT NULL,
    descricao TEXT NOT NULL,
    tempo_trabalho_dias INTEGER NOT NULL DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_areas_codigo ON areas(codigo);
CREATE INDEX idx_areas_ativo ON areas(ativo);

COMMENT ON TABLE areas IS 'Cadastro de áreas de trabalho';

-- Status
CREATE TABLE IF NOT EXISTS status_codes (
    status_id SERIAL PRIMARY KEY,
    codigo TEXT UNIQUE NOT NULL,
    descricao TEXT NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    percentual_base NUMERIC(5,2) DEFAULT 0.00,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_status_ordem ON status_codes(ordem);
CREATE INDEX idx_status_ativo ON status_codes(ativo);

COMMENT ON TABLE status_codes IS 'Etapas/status dos projetos';

-- Projetos
CREATE TABLE IF NOT EXISTS projetos (
    projeto_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_projeto TEXT UNIQUE NOT NULL,
    cliente TEXT NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_projetos_codigo ON projetos(codigo_projeto);
CREATE INDEX idx_projetos_ativo ON projetos(ativo);

-- Engenheiros_Projetos (TABELA PRINCIPAL)
CREATE TABLE IF NOT EXISTS engenheiros_projetos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    eng_id UUID NOT NULL REFERENCES engenheiros(eng_id) ON DELETE CASCADE,
    projeto_id UUID NOT NULL REFERENCES projetos(projeto_id) ON DELETE CASCADE,
    area_id INTEGER NOT NULL REFERENCES areas(area_id),
    
    data_inicio DATE,
    data_prevista DATE,
    data_conclusao DATE,
    
    status_id INTEGER REFERENCES status_codes(status_id),
    percentual_andamento NUMERIC(5,2) DEFAULT 0.00,
    tempo_trabalho_dias INTEGER,
    
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(eng_id, projeto_id, area_id)
);

CREATE INDEX idx_eng_proj_eng_id ON engenheiros_projetos(eng_id);
CREATE INDEX idx_eng_proj_projeto_id ON engenheiros_projetos(projeto_id);
CREATE INDEX idx_eng_proj_area_id ON engenheiros_projetos(area_id);

-- =====================================================
-- PARTE 2: TABELAS DE PREVISÕES E RETRABALHOS
-- =====================================================

\echo '📝 Criando tabelas de previsões e retrabalhos...'

-- Previsões Diárias
CREATE TABLE IF NOT EXISTS projetos_previsao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    eng_projeto_id UUID NOT NULL REFERENCES engenheiros_projetos(id) ON DELETE CASCADE,
    
    projeto_id UUID NOT NULL REFERENCES projetos(projeto_id),
    eng_id UUID NOT NULL REFERENCES engenheiros(eng_id),
    
    data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
    
    previsao_texto TEXT NOT NULL,
    feito_texto TEXT,
    nova_data_prevista DATE,
    tempo_estimado INTEGER,
    status_id INTEGER REFERENCES status_codes(status_id),
    
    editavel BOOLEAN DEFAULT true,
    data_fim_dia TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(eng_projeto_id, data_registro)
);

CREATE INDEX idx_proj_prev_eng_proj ON projetos_previsao(eng_projeto_id);
CREATE INDEX idx_proj_prev_data ON projetos_previsao(data_registro);

-- Retrabalhos
CREATE TABLE IF NOT EXISTS retrabalho_projetos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    eng_projeto_id UUID NOT NULL REFERENCES engenheiros_projetos(id) ON DELETE CASCADE,
    
    projeto_id UUID NOT NULL REFERENCES projetos(projeto_id),
    eng_id UUID NOT NULL REFERENCES engenheiros(eng_id),
    
    necessitou_retrabalho BOOLEAN NOT NULL DEFAULT false,
    data_retrabalho DATE NOT NULL DEFAULT CURRENT_DATE,
    motivo_retrabalho TEXT,
    descricao TEXT,
    tipo_retrabalho TEXT,
    status_id INTEGER REFERENCES status_codes(status_id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(eng_projeto_id, data_retrabalho)
);

CREATE INDEX idx_retrab_eng_proj ON retrabalho_projetos(eng_projeto_id);
CREATE INDEX idx_retrab_data ON retrabalho_projetos(data_retrabalho);

-- Prazos
CREATE TABLE IF NOT EXISTS prazos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    eng_projeto_id UUID NOT NULL REFERENCES engenheiros_projetos(id) ON DELETE CASCADE,
    
    projeto_id UUID NOT NULL REFERENCES projetos(projeto_id),
    eng_id UUID NOT NULL REFERENCES engenheiros(eng_id),
    
    data_inicio_projeto DATE NOT NULL,
    data_inicio_esperada_cliente DATE,
    prazo_final_eng DATE NOT NULL,
    prazo_final_cliente DATE NOT NULL,
    
    prazo_interno_dias INTEGER GENERATED ALWAYS AS (
        EXTRACT(DAY FROM (prazo_final_eng - data_inicio_projeto))
    ) STORED,
    
    prazo_cliente_dias INTEGER GENERATED ALWAYS AS (
        EXTRACT(DAY FROM (prazo_final_cliente - data_inicio_projeto))
    ) STORED,
    
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_prazos_eng_proj ON prazos(eng_projeto_id);

-- =====================================================
-- PARTE 3: TABELAS DO DONO (EVANDRO)
-- =====================================================

\echo '👔 Criando tabelas do dono...'

-- Dono
CREATE TABLE IF NOT EXISTS dono_empresa (
    dono_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    email TEXT UNIQUE,
    telefone TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Complexidade
CREATE TABLE IF NOT EXISTS complexidade_tarefas (
    complexidade_id SERIAL PRIMARY KEY,
    codigo TEXT UNIQUE NOT NULL,
    descricao TEXT NOT NULL,
    nivel INTEGER NOT NULL,
    tempo_estimado_dias INTEGER,
    ativo BOOLEAN DEFAULT true
);

-- Distribuição de Tasks
CREATE TABLE IF NOT EXISTS evandro_distribuicao_tasks (
    task_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dono_id UUID REFERENCES dono_empresa(dono_id),
    eng_id UUID NOT NULL REFERENCES engenheiros(eng_id),
    projeto_id UUID REFERENCES projetos(projeto_id),
    codigo_projeto TEXT,
    cliente TEXT,
    area_id INTEGER NOT NULL REFERENCES areas(area_id),
    complexidade_id INTEGER REFERENCES complexidade_tarefas(complexidade_id),
    descricao_task TEXT NOT NULL,
    data_atribuicao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_inicio_prevista DATE,
    data_conclusao_prevista DATE,
    status_task TEXT DEFAULT 'PENDENTE',
    notificacao_enviada BOOLEAN DEFAULT false,
    data_notificacao TIMESTAMP WITH TIME ZONE,
    eng_projeto_id UUID REFERENCES engenheiros_projetos(id),
    sincronizado BOOLEAN DEFAULT false,
    data_sincronizacao TIMESTAMP WITH TIME ZONE,
    observacoes_dono TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_evandro_tasks_eng ON evandro_distribuicao_tasks(eng_id);

-- Notificações WhatsApp
CREATE TABLE IF NOT EXISTS notificacoes_whatsapp (
    notificacao_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    eng_id UUID NOT NULL REFERENCES engenheiros(eng_id),
    telefone TEXT,
    tipo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    task_id UUID REFERENCES evandro_distribuicao_tasks(task_id),
    projeto_id UUID REFERENCES projetos(projeto_id),
    enviada BOOLEAN DEFAULT false,
    data_envio TIMESTAMP WITH TIME ZONE,
    erro_envio TEXT,
    tentativas INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notif_enviada ON notificacoes_whatsapp(enviada);

-- Logs do Chatbot
CREATE TABLE IF NOT EXISTS chatbot_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    eng_id UUID REFERENCES engenheiros(eng_id),
    prompt_original TEXT NOT NULL,
    acao_executada TEXT,
    sucesso BOOLEAN DEFAULT true,
    mensagem_retorno TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PARTE 4: SEED DATA
-- =====================================================

\echo '🌱 Inserindo dados iniciais...'

-- Status
INSERT INTO status_codes (codigo, descricao, ordem, percentual_base) VALUES
    ('AGUARDANDO_INICIO', 'Aguardando Início', 1, 0.00),
    ('EM_PLANEJAMENTO', 'Em Planejamento', 2, 5.00),
    ('DOCUMENTACAO', 'Recebimento da Documentação', 3, 10.00),
    ('SERVICOS_PRELIM', 'Serviços Preliminares e Infraestrutura', 4, 20.00),
    ('INSTALACOES_GROSSO', 'Instalações de Primeira Fase (Grosso)', 5, 35.00),
    ('DETALHAMENTO', 'Detalhamento e Instalações', 6, 55.00),
    ('INSTALACOES_ACABAMENTO', 'Instalações de Segunda Fase (Acabamento)', 7, 70.00),
    ('REVISAO_INTERNA', 'Revisão Interna', 8, 75.00),
    ('ENVIADO_CLIENTE', 'Enviado ao Cliente', 9, 80.00),
    ('EM_APROVACAO', 'Aprovado Cliente/Concessionária', 10, 90.00),
    ('CONCLUIDO', 'Concluído', 11, 100.00)
ON CONFLICT (codigo) DO NOTHING;

-- Áreas
INSERT INTO areas (codigo, descricao, tempo_trabalho_dias) VALUES
    ('ELETRICO', 'Elétrico', 15),
    ('HIDRAULICO', 'Hidráulico', 12),
    ('ESTRUTURAL', 'Estrutural', 20),
    ('CLIMATIZACAO', 'Climatização', 10),
    ('PREVENCAO_INCENDIO', 'Prevenção e Combate a Incêndio', 8),
    ('GAS', 'Gás', 5),
    ('TELEFONIA', 'Telefonia e Dados', 7),
    ('SPDA', 'SPDA (Para-raios)', 5),
    ('AUTOMACAO', 'Automação', 10)
ON CONFLICT (codigo) DO NOTHING;

-- Complexidades
INSERT INTO complexidade_tarefas (codigo, descricao, nivel, tempo_estimado_dias) VALUES
    ('MUITO_SIMPLES', 'Muito Simples', 1, 1),
    ('SIMPLES', 'Simples', 2, 3),
    ('MEDIA', 'Média', 3, 7),
    ('COMPLEXA', 'Complexa', 4, 15),
    ('MUITO_COMPLEXA', 'Muito Complexa', 5, 30)
ON CONFLICT (codigo) DO NOTHING;

-- Dono
INSERT INTO dono_empresa (nome, email) VALUES
    ('Evandro', 'evandro@empresa.com')
ON CONFLICT (email) DO NOTHING;

\echo '✅ Schema completo criado com sucesso!'
\echo '📊 Próximo passo: Criar TRIGGERS e FUNCTIONS'
\echo '   Execute: chatbot_functions.sql e functions_dono.sql'

