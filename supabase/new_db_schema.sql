-- =====================================================
-- NOVO SCHEMA DO BANCO DE DADOS - SUPABASE
-- Sistema de Gestão de Projetos de Engenharia
-- =====================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA: engenheiros
-- =====================================================
-- Cadastro de engenheiros com informações básicas
-- Cada engenheiro pode editar seu próprio nome e exclusividade
-- =====================================================

CREATE TABLE IF NOT EXISTS engenheiros (
    eng_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    exclusivo BOOLEAN NOT NULL DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_engenheiros_ativo ON engenheiros(ativo);

-- Comentários
COMMENT ON TABLE engenheiros IS 'Cadastro de engenheiros - cada um tem seu próprio ID e pode editar suas informações';
COMMENT ON COLUMN engenheiros.exclusivo IS 'TRUE se trabalha somente na empresa, FALSE se trabalha em outros lugares';

-- =====================================================
-- TABELA: areas
-- =====================================================
-- Decodificação de áreas de trabalho
-- Cada área tem um ID único e descrição
-- =====================================================

CREATE TABLE IF NOT EXISTS areas (
    area_id SERIAL PRIMARY KEY,
    codigo TEXT UNIQUE NOT NULL,
    descricao TEXT NOT NULL,
    tempo_trabalho_dias INTEGER NOT NULL DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_areas_codigo ON areas(codigo);
CREATE INDEX idx_areas_ativo ON areas(ativo);

COMMENT ON TABLE areas IS 'Cadastro de áreas de trabalho (ex: Elétrico, Hidráulico, Estrutural)';
COMMENT ON COLUMN areas.tempo_trabalho_dias IS 'Tempo estimado de trabalho em dias para esta área';

-- =====================================================
-- TABELA: status_codes
-- =====================================================
-- Decodificação de status/etapas dos projetos
-- =====================================================

CREATE TABLE IF NOT EXISTS status_codes (
    status_id SERIAL PRIMARY KEY,
    codigo TEXT UNIQUE NOT NULL,
    descricao TEXT NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    percentual_base NUMERIC(5,2) DEFAULT 0.00,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_status_ordem ON status_codes(ordem);
CREATE INDEX idx_status_ativo ON status_codes(ativo);

COMMENT ON TABLE status_codes IS 'Etapas/status dos projetos com percentual associado';
COMMENT ON COLUMN status_codes.ordem IS 'Ordem sequencial da etapa';
COMMENT ON COLUMN status_codes.percentual_base IS 'Percentual de conclusão associado a esta etapa';

-- =====================================================
-- TABELA: projetos
-- =====================================================
-- Informações base dos projetos
-- =====================================================

CREATE TABLE IF NOT EXISTS projetos (
    projeto_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_projeto TEXT UNIQUE NOT NULL,
    cliente TEXT NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_projetos_codigo ON projetos(codigo_projeto);
CREATE INDEX idx_projetos_ativo ON projetos(ativo);

COMMENT ON TABLE projetos IS 'Cadastro base dos projetos - informações gerais';
COMMENT ON COLUMN projetos.codigo_projeto IS 'Código identificador do projeto (ex: PRJ-001)';

-- =====================================================
-- TABELA: engenheiros_projetos
-- =====================================================
-- Relacionamento N:N entre engenheiros, projetos e áreas
-- Um engenheiro pode ter múltiplas áreas no mesmo projeto
-- Cada registro representa uma atribuição específica
-- =====================================================

CREATE TABLE IF NOT EXISTS engenheiros_projetos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    eng_id UUID NOT NULL REFERENCES engenheiros(eng_id) ON DELETE CASCADE,
    projeto_id UUID NOT NULL REFERENCES projetos(projeto_id) ON DELETE CASCADE,
    area_id INTEGER NOT NULL REFERENCES areas(area_id),
    
    -- Datas e prazos
    data_inicio DATE,
    data_prevista DATE,
    data_conclusao DATE,
    
    -- Status e progresso
    status_id INTEGER REFERENCES status_codes(status_id),
    percentual_andamento NUMERIC(5,2) DEFAULT 0.00 CHECK (percentual_andamento >= 0 AND percentual_andamento <= 100),
    
    -- Tempo de trabalho (calculado automaticamente)
    tempo_trabalho_dias INTEGER,
    
    -- Observações
    observacoes TEXT,
    
    -- Controle
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: Um engenheiro não pode ter a mesma área duplicada no mesmo projeto
    UNIQUE(eng_id, projeto_id, area_id)
);

-- Índices para otimização de consultas
CREATE INDEX idx_eng_proj_eng_id ON engenheiros_projetos(eng_id);
CREATE INDEX idx_eng_proj_projeto_id ON engenheiros_projetos(projeto_id);
CREATE INDEX idx_eng_proj_area_id ON engenheiros_projetos(area_id);
CREATE INDEX idx_eng_proj_status_id ON engenheiros_projetos(status_id);
CREATE INDEX idx_eng_proj_ativo ON engenheiros_projetos(ativo);

COMMENT ON TABLE engenheiros_projetos IS 'Atribuição de engenheiros a projetos com áreas específicas - permite múltiplas áreas por engenheiro/projeto';
COMMENT ON COLUMN engenheiros_projetos.data_prevista IS 'Data prevista atualizada diariamente pelo engenheiro';
COMMENT ON COLUMN engenheiros_projetos.tempo_trabalho_dias IS 'Calculado automaticamente baseado na área';
COMMENT ON COLUMN engenheiros_projetos.percentual_andamento IS 'Calculado automaticamente baseado no status';

-- =====================================================
-- TABELA: projetos_previsao
-- =====================================================
-- Histórico DIÁRIO de previsões (imutável após fim do dia)
-- Cada registro representa um dia de trabalho
-- =====================================================

CREATE TABLE IF NOT EXISTS projetos_previsao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    eng_projeto_id UUID NOT NULL REFERENCES engenheiros_projetos(id) ON DELETE CASCADE,
    
    -- Data do registro
    data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Variáveis compartilhadas com projetos
    projeto_id UUID NOT NULL REFERENCES projetos(projeto_id),
    eng_id UUID NOT NULL REFERENCES engenheiros(eng_id),
    tempo_estimado INTEGER, -- Tempo estimado para essa atividade
    status_id INTEGER REFERENCES status_codes(status_id),
    
    -- Previsões do dia (preenchidas no início do dia)
    previsao_texto TEXT NOT NULL,
    
    -- Feito ao fim do dia (preenchido ao final do dia)
    feito_texto TEXT,
    
    -- Nova data prevista de fim (atualizada com base no andamento)
    nova_data_prevista DATE,
    
    -- Controle de edição (torna imutável após fim do dia)
    editavel BOOLEAN DEFAULT true,
    data_fim_dia TIMESTAMP WITH TIME ZONE, -- Quando foi marcado como fim do dia
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: Uma previsão por dia por atribuição
    UNIQUE(eng_projeto_id, data_registro)
);

-- Índices
CREATE INDEX idx_proj_prev_eng_proj ON projetos_previsao(eng_projeto_id);
CREATE INDEX idx_proj_prev_data ON projetos_previsao(data_registro);
CREATE INDEX idx_proj_prev_editavel ON projetos_previsao(editavel);
CREATE INDEX idx_proj_prev_eng_id ON projetos_previsao(eng_id);
CREATE INDEX idx_proj_prev_projeto_id ON projetos_previsao(projeto_id);

COMMENT ON TABLE projetos_previsao IS 'Histórico diário de previsões - imutável após fim do dia';
COMMENT ON COLUMN projetos_previsao.previsao_texto IS 'O que o engenheiro prevê fazer no dia (preenchido no início)';
COMMENT ON COLUMN projetos_previsao.feito_texto IS 'O que foi feito ao fim do dia (preenchido ao final)';
COMMENT ON COLUMN projetos_previsao.editavel IS 'FALSE após fim do dia (torna registro imutável)';
COMMENT ON COLUMN projetos_previsao.nova_data_prevista IS 'Atualizada com base no andamento do dia';

-- =====================================================
-- TABELA: retrabalho_projetos
-- =====================================================
-- Registro DIÁRIO de retrabalhos (um registro por dia)
-- Contador automático via COUNT(*)
-- =====================================================

CREATE TABLE IF NOT EXISTS retrabalho_projetos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    eng_projeto_id UUID NOT NULL REFERENCES engenheiros_projetos(id) ON DELETE CASCADE,
    
    -- Variáveis compartilhadas com projetos
    projeto_id UUID NOT NULL REFERENCES projetos(projeto_id),
    eng_id UUID NOT NULL REFERENCES engenheiros(eng_id),
    
    -- Boolean diário (preenchido todo dia)
    necessitou_retrabalho BOOLEAN NOT NULL DEFAULT false,
    
    -- Data do retrabalho
    data_retrabalho DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Motivo (obrigatório quando necessitou_retrabalho = true)
    motivo_retrabalho TEXT,
    
    -- Tipo/descrição adicional
    descricao TEXT,
    tipo_retrabalho TEXT,
    
    -- Status no momento do retrabalho
    status_id INTEGER REFERENCES status_codes(status_id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: Um registro por dia por atribuição
    UNIQUE(eng_projeto_id, data_retrabalho)
);

-- Índices
CREATE INDEX idx_retrab_eng_proj ON retrabalho_projetos(eng_projeto_id);
CREATE INDEX idx_retrab_data ON retrabalho_projetos(data_retrabalho);
CREATE INDEX idx_retrab_necessitou ON retrabalho_projetos(necessitou_retrabalho);
CREATE INDEX idx_retrab_eng_id ON retrabalho_projetos(eng_id);
CREATE INDEX idx_retrab_projeto_id ON retrabalho_projetos(projeto_id);

COMMENT ON TABLE retrabalho_projetos IS 'Registro diário de retrabalhos - contador via COUNT(*)';
COMMENT ON COLUMN retrabalho_projetos.necessitou_retrabalho IS 'Preenchido todo dia - TRUE se houve retrabalho';
COMMENT ON COLUMN retrabalho_projetos.motivo_retrabalho IS 'Obrigatório quando necessitou_retrabalho = TRUE';

-- =====================================================
-- VIEW: Contador de retrabalhos por atribuição
-- =====================================================
CREATE OR REPLACE VIEW vw_quantidade_retrabalhos AS
SELECT 
    eng_projeto_id,
    COUNT(*) FILTER (WHERE necessitou_retrabalho = true) AS quantidade_retrabalhos,
    COUNT(*) AS total_dias_registrados,
    ROUND(
        (COUNT(*) FILTER (WHERE necessitou_retrabalho = true)::NUMERIC / 
         NULLIF(COUNT(*), 0)::NUMERIC) * 100, 
        2
    ) AS percentual_retrabalhos
FROM retrabalho_projetos
GROUP BY eng_projeto_id;

COMMENT ON VIEW vw_quantidade_retrabalhos IS 'Contador automático de retrabalhos por atribuição';

-- =====================================================
-- TABELA: prazos
-- =====================================================
-- Controle completo de prazos (4 datas principais)
-- Conecta com engenheiros e projetos
-- =====================================================

CREATE TABLE IF NOT EXISTS prazos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    eng_projeto_id UUID NOT NULL REFERENCES engenheiros_projetos(id) ON DELETE CASCADE,
    
    -- Variáveis compartilhadas com projetos e engenheiros
    projeto_id UUID NOT NULL REFERENCES projetos(projeto_id),
    eng_id UUID NOT NULL REFERENCES engenheiros(eng_id),
    
    -- 4 DATAS PRINCIPAIS
    -- 1. Data de início do projeto (real)
    data_inicio_projeto DATE NOT NULL,
    
    -- 2. Data de início esperada pelo cliente
    data_inicio_esperada_cliente DATE,
    
    -- 3. Prazo final do engenheiro (interno)
    prazo_final_eng DATE NOT NULL,
    
    -- 4. Prazo final dado ao cliente
    prazo_final_cliente DATE NOT NULL,
    
    -- Cálculos automáticos (dias)
    prazo_interno_dias INTEGER GENERATED ALWAYS AS (
        EXTRACT(DAY FROM (prazo_final_eng - data_inicio_projeto))
    ) STORED,
    
    prazo_cliente_dias INTEGER GENERATED ALWAYS AS (
        EXTRACT(DAY FROM (prazo_final_cliente - data_inicio_projeto))
    ) STORED,
    
    dias_atraso_inicio INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN data_inicio_esperada_cliente IS NOT NULL THEN
                EXTRACT(DAY FROM (data_inicio_projeto - data_inicio_esperada_cliente))
            ELSE NULL
        END
    ) STORED,
    
    -- Observações
    observacoes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_prazos_eng_proj ON prazos(eng_projeto_id);
CREATE INDEX idx_prazos_eng_id ON prazos(eng_id);
CREATE INDEX idx_prazos_projeto_id ON prazos(projeto_id);
CREATE INDEX idx_prazos_data_inicio ON prazos(data_inicio_projeto);
CREATE INDEX idx_prazos_final_eng ON prazos(prazo_final_eng);
CREATE INDEX idx_prazos_final_cliente ON prazos(prazo_final_cliente);

COMMENT ON TABLE prazos IS 'Controle completo de prazos - 4 datas principais';
COMMENT ON COLUMN prazos.data_inicio_projeto IS '1. Data de início REAL do projeto';
COMMENT ON COLUMN prazos.data_inicio_esperada_cliente IS '2. Data que o cliente esperava que começasse';
COMMENT ON COLUMN prazos.prazo_final_eng IS '3. Prazo final interno do engenheiro';
COMMENT ON COLUMN prazos.prazo_final_cliente IS '4. Prazo final dado ao cliente';
COMMENT ON COLUMN prazos.prazo_interno_dias IS 'Calculado: dias entre início e prazo do eng';
COMMENT ON COLUMN prazos.prazo_cliente_dias IS 'Calculado: dias entre início e prazo do cliente';
COMMENT ON COLUMN prazos.dias_atraso_inicio IS 'Calculado: atraso no início (se houver)';

-- =====================================================
-- NOTA: Tabela EXECUCAO não é necessária
-- A execução já está representada na tabela projetos
-- através do campo percentual_andamento em engenheiros_projetos
-- =====================================================

-- =====================================================
-- TRIGGERS E FUNCTIONS
-- =====================================================

-- Function para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER trg_engenheiros_updated_at
    BEFORE UPDATE ON engenheiros
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_projetos_updated_at
    BEFORE UPDATE ON projetos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_eng_proj_updated_at
    BEFORE UPDATE ON engenheiros_projetos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Function para calcular tempo_trabalho automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION calcular_tempo_trabalho()
RETURNS TRIGGER AS $$
BEGIN
    -- Busca o tempo de trabalho da área e atribui automaticamente
    SELECT tempo_trabalho_dias INTO NEW.tempo_trabalho_dias
    FROM areas
    WHERE area_id = NEW.area_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular tempo_trabalho ao inserir/atualizar
CREATE TRIGGER trg_calcular_tempo_trabalho
    BEFORE INSERT OR UPDATE OF area_id ON engenheiros_projetos
    FOR EACH ROW
    EXECUTE FUNCTION calcular_tempo_trabalho();

-- =====================================================
-- Function para calcular percentual automaticamente baseado no status
-- =====================================================
CREATE OR REPLACE FUNCTION calcular_percentual_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status mudou, atualiza o percentual baseado no status
    IF NEW.status_id IS NOT NULL THEN
        SELECT percentual_base INTO NEW.percentual_andamento
        FROM status_codes
        WHERE status_id = NEW.status_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular percentual ao atualizar status
CREATE TRIGGER trg_calcular_percentual_status
    BEFORE INSERT OR UPDATE OF status_id ON engenheiros_projetos
    FOR EACH ROW
    EXECUTE FUNCTION calcular_percentual_status();

-- =====================================================
-- Function para validar edição de previsões (imutável após fim do dia)
-- =====================================================
CREATE OR REPLACE FUNCTION validar_edicao_previsao()
RETURNS TRIGGER AS $$
BEGIN
    -- Se já existe e não é mais editável, bloqueia atualização
    IF TG_OP = 'UPDATE' AND OLD.editavel = false THEN
        RAISE EXCEPTION 'Registro não pode ser editado após o fim do dia';
    END IF;
    
    -- Se está marcando como fim do dia, torna imutável
    IF NEW.feito_texto IS NOT NULL AND NEW.editavel = true THEN
        NEW.editavel := false;
        NEW.data_fim_dia := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_edicao_previsao
    BEFORE UPDATE ON projetos_previsao
    FOR EACH ROW
    EXECUTE FUNCTION validar_edicao_previsao();

COMMENT ON FUNCTION validar_edicao_previsao IS 'Torna previsões imutáveis após preenchimento do feito_texto';

-- =====================================================
-- Function para validar motivo obrigatório em retrabalhos
-- =====================================================
CREATE OR REPLACE FUNCTION validar_motivo_retrabalho()
RETURNS TRIGGER AS $$
BEGIN
    -- Se necessitou retrabalho = true, motivo é obrigatório
    IF NEW.necessitou_retrabalho = true THEN
        IF NEW.motivo_retrabalho IS NULL OR TRIM(NEW.motivo_retrabalho) = '' THEN
            RAISE EXCEPTION 'Motivo do retrabalho é obrigatório quando necessitou_retrabalho = TRUE';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_motivo_retrabalho
    BEFORE INSERT OR UPDATE ON retrabalho_projetos
    FOR EACH ROW
    EXECUTE FUNCTION validar_motivo_retrabalho();

COMMENT ON FUNCTION validar_motivo_retrabalho IS 'Valida que motivo é obrigatório quando há retrabalho';

-- =====================================================
-- Function para atualizar status quando há retrabalho (indica atraso)
-- =====================================================
CREATE OR REPLACE FUNCTION atualizar_status_retrabalho()
RETURNS TRIGGER AS $$
BEGIN
    -- Se houve retrabalho, registra o status atual
    IF NEW.necessitou_retrabalho = true THEN
        -- Busca o status atual da atribuição
        SELECT status_id INTO NEW.status_id
        FROM engenheiros_projetos
        WHERE id = NEW.eng_projeto_id;
        
        -- Atualiza a data prevista na atribuição (adiciona 1 dia de atraso)
        UPDATE engenheiros_projetos
        SET data_prevista = data_prevista + INTERVAL '1 day'
        WHERE id = NEW.eng_projeto_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atualizar_status_retrabalho
    BEFORE INSERT ON retrabalho_projetos
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_status_retrabalho();

COMMENT ON FUNCTION atualizar_status_retrabalho IS 'Atualiza status e adiciona atraso quando há retrabalho';

-- =====================================================
-- Function para preencher variáveis compartilhadas automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION preencher_variaveis_compartilhadas()
RETURNS TRIGGER AS $$
BEGIN
    -- Para projetos_previsao e retrabalho_projetos
    -- Busca projeto_id e eng_id da atribuição
    IF NEW.eng_projeto_id IS NOT NULL THEN
        SELECT projeto_id, eng_id 
        INTO NEW.projeto_id, NEW.eng_id
        FROM engenheiros_projetos
        WHERE id = NEW.eng_projeto_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para preencher variáveis compartilhadas
CREATE TRIGGER trg_preencher_vars_previsao
    BEFORE INSERT ON projetos_previsao
    FOR EACH ROW
    EXECUTE FUNCTION preencher_variaveis_compartilhadas();

CREATE TRIGGER trg_preencher_vars_retrabalho
    BEFORE INSERT ON retrabalho_projetos
    FOR EACH ROW
    EXECUTE FUNCTION preencher_variaveis_compartilhadas();

CREATE TRIGGER trg_preencher_vars_prazos
    BEFORE INSERT ON prazos
    FOR EACH ROW
    EXECUTE FUNCTION preencher_variaveis_compartilhadas();

COMMENT ON FUNCTION preencher_variaveis_compartilhadas IS 'Preenche automaticamente projeto_id e eng_id das variáveis compartilhadas';

-- =====================================================
-- DADOS INICIAIS (SEED)
-- =====================================================

-- Status padrão
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

-- Áreas padrão (exemplos - você pode adicionar mais)
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

-- =====================================================
-- VIEWS PARA CONSULTAS
-- =====================================================

-- View: Projetos por Engenheiro
CREATE OR REPLACE VIEW vw_engenheiros_projetos AS
SELECT 
    e.eng_id,
    e.nome AS engenheiro_nome,
    e.exclusivo,
    p.projeto_id,
    p.codigo_projeto,
    p.cliente,
    a.area_id,
    a.codigo AS area_codigo,
    a.descricao AS area_descricao,
    ep.data_inicio,
    ep.data_prevista,
    ep.data_conclusao,
    s.status_id,
    s.codigo AS status_codigo,
    s.descricao AS status_descricao,
    ep.percentual_andamento,
    ep.tempo_trabalho_dias,
    ep.observacoes,
    ep.ativo,
    ep.created_at,
    ep.updated_at
FROM engenheiros_projetos ep
JOIN engenheiros e ON e.eng_id = ep.eng_id
JOIN projetos p ON p.projeto_id = ep.projeto_id
JOIN areas a ON a.area_id = ep.area_id
LEFT JOIN status_codes s ON s.status_id = ep.status_id
WHERE ep.ativo = true AND e.ativo = true AND p.ativo = true;

COMMENT ON VIEW vw_engenheiros_projetos IS 'Visão consolidada de engenheiros, projetos e áreas';

-- View: Resumo por Engenheiro
CREATE OR REPLACE VIEW vw_resumo_engenheiros AS
SELECT 
    e.eng_id,
    e.nome,
    e.exclusivo,
    COUNT(DISTINCT ep.projeto_id) AS total_projetos,
    COUNT(ep.id) AS total_atribuicoes,
    AVG(ep.percentual_andamento) AS media_percentual,
    SUM(CASE WHEN ep.data_conclusao IS NULL AND ep.ativo = true THEN 1 ELSE 0 END) AS projetos_ativos
FROM engenheiros e
LEFT JOIN engenheiros_projetos ep ON ep.eng_id = e.eng_id AND ep.ativo = true
WHERE e.ativo = true
GROUP BY e.eng_id, e.nome, e.exclusivo;

COMMENT ON VIEW vw_resumo_engenheiros IS 'Resumo estatístico por engenheiro';

-- =====================================================
-- View: Visão completa com retrabalhos e prazos
-- =====================================================
CREATE OR REPLACE VIEW vw_projetos_completo AS
SELECT 
    ep.id AS atribuicao_id,
    e.eng_id,
    e.nome AS engenheiro_nome,
    p.projeto_id,
    p.codigo_projeto,
    p.cliente,
    a.area_id,
    a.codigo AS area_codigo,
    a.descricao AS area_descricao,
    ep.data_inicio,
    ep.data_prevista,
    ep.data_conclusao,
    s.status_id,
    s.descricao AS status_descricao,
    ep.percentual_andamento,
    ep.tempo_trabalho_dias,
    
    -- Prazos
    pr.data_inicio_projeto,
    pr.data_inicio_esperada_cliente,
    pr.prazo_final_eng,
    pr.prazo_final_cliente,
    pr.prazo_interno_dias,
    pr.prazo_cliente_dias,
    pr.dias_atraso_inicio,
    
    -- Retrabalhos
    COALESCE(vr.quantidade_retrabalhos, 0) AS quantidade_retrabalhos,
    COALESCE(vr.percentual_retrabalhos, 0) AS percentual_retrabalhos,
    
    -- Última previsão
    (SELECT previsao_texto FROM projetos_previsao 
     WHERE eng_projeto_id = ep.id 
     ORDER BY data_registro DESC LIMIT 1) AS ultima_previsao,
    
    (SELECT feito_texto FROM projetos_previsao 
     WHERE eng_projeto_id = ep.id 
     ORDER BY data_registro DESC LIMIT 1) AS ultimo_feito,
    
    -- Cálculo de dias de atraso
    CASE 
        WHEN ep.data_prevista < CURRENT_DATE AND ep.data_conclusao IS NULL 
        THEN EXTRACT(DAY FROM (CURRENT_DATE - ep.data_prevista))::INTEGER
        ELSE 0
    END AS dias_atraso
    
FROM engenheiros_projetos ep
JOIN engenheiros e ON e.eng_id = ep.eng_id
JOIN projetos p ON p.projeto_id = ep.projeto_id
JOIN areas a ON a.area_id = ep.area_id
LEFT JOIN status_codes s ON s.status_id = ep.status_id
LEFT JOIN prazos pr ON pr.eng_projeto_id = ep.id
LEFT JOIN vw_quantidade_retrabalhos vr ON vr.eng_projeto_id = ep.id
WHERE ep.ativo = true;

COMMENT ON VIEW vw_projetos_completo IS 'Visão consolidada com retrabalhos, prazos e previsões';

-- =====================================================
-- TABELA: chatbot_logs (para integração via prompts)
-- =====================================================

CREATE TABLE IF NOT EXISTS chatbot_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    eng_id UUID REFERENCES engenheiros(eng_id) ON DELETE SET NULL,
    prompt_original TEXT NOT NULL,
    acao_executada TEXT,
    comando_sql TEXT,
    sucesso BOOLEAN DEFAULT true,
    mensagem_retorno TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chatbot_logs_eng_id ON chatbot_logs(eng_id);
CREATE INDEX idx_chatbot_logs_created ON chatbot_logs(created_at DESC);
CREATE INDEX idx_chatbot_logs_sucesso ON chatbot_logs(sucesso);

COMMENT ON TABLE chatbot_logs IS 'Log de todas as interações do chatbot com o banco de dados';
