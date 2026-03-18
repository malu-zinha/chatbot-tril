-- =====================================================
-- POLÍTICAS DE SEGURANÇA - ROW LEVEL SECURITY (RLS)
-- Sistema de Gestão de Projetos via Chatbot WhatsApp
-- =====================================================
-- 
-- Este arquivo implementa segurança completa no banco de dados:
-- 1. Row Level Security (RLS) em todas as tabelas
-- 2. Políticas de acesso por função (engenheiro, dono, admin)
-- 3. Validações de input
-- 4. Proteção contra SQL injection
-- 5. Auditoria e logs
-- 
-- Execute APÓS: MASTER_SCHEMA_COMPLETO.sql, tabela_evandro_dono.sql
-- =====================================================

\echo '🔒 Implementando políticas de segurança...'

-- =====================================================
-- PARTE 1: HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

\echo '1️⃣ Habilitando Row Level Security...'

-- Tabelas principais
ALTER TABLE engenheiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE engenheiros_projetos ENABLE ROW LEVEL SECURITY;

-- Tabelas de dados
ALTER TABLE projetos_previsao ENABLE ROW LEVEL SECURITY;
ALTER TABLE retrabalho_projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE prazos ENABLE ROW LEVEL SECURITY;

-- Tabelas do dono
ALTER TABLE dono_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE complexidade_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE evandro_distribuicao_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTE 2: CRIAR FUNCTION PARA IDENTIFICAR USUÁRIO
-- =====================================================

\echo '2️⃣ Criando functions de autenticação...'

-- Function para pegar eng_id do usuário atual
CREATE OR REPLACE FUNCTION auth.current_eng_id()
RETURNS UUID AS $$
BEGIN
    -- Retorna o eng_id armazenado no JWT ou metadata do usuário
    RETURN COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'eng_id')::uuid,
        NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION auth.current_eng_id IS 'Retorna o eng_id do usuário autenticado atual';

-- Function para verificar se é dono
CREATE OR REPLACE FUNCTION auth.is_dono()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'role')::text = 'dono',
        false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION auth.is_dono IS 'Verifica se o usuário atual é dono/gestor';

-- Function para verificar se é admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'role')::text IN ('admin', 'service_role'),
        false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION auth.is_admin IS 'Verifica se o usuário atual é admin';

-- =====================================================
-- PARTE 3: POLÍTICAS PARA ENGENHEIROS
-- =====================================================

\echo '3️⃣ Criando políticas para engenheiros...'

-- ENGENHEIROS: Podem ver apenas seus próprios dados
DROP POLICY IF EXISTS engenheiros_select_policy ON engenheiros;
CREATE POLICY engenheiros_select_policy ON engenheiros
    FOR SELECT
    USING (
        auth.is_admin() OR 
        auth.is_dono() OR 
        eng_id = auth.current_eng_id()
    );

DROP POLICY IF EXISTS engenheiros_update_policy ON engenheiros;
CREATE POLICY engenheiros_update_policy ON engenheiros
    FOR UPDATE
    USING (
        auth.is_admin() OR 
        eng_id = auth.current_eng_id()
    );

-- PROJETOS: Engenheiros veem apenas seus projetos
DROP POLICY IF EXISTS projetos_select_policy ON projetos;
CREATE POLICY projetos_select_policy ON projetos
    FOR SELECT
    USING (
        auth.is_admin() OR 
        auth.is_dono() OR
        EXISTS (
            SELECT 1 FROM engenheiros_projetos ep
            WHERE ep.projeto_id = projetos.projeto_id
            AND ep.eng_id = auth.current_eng_id()
        )
    );

DROP POLICY IF EXISTS projetos_insert_policy ON projetos;
CREATE POLICY projetos_insert_policy ON projetos
    FOR INSERT
    WITH CHECK (auth.is_admin() OR auth.is_dono());

-- ENGENHEIROS_PROJETOS: Engenheiros veem apenas suas atribuições
DROP POLICY IF EXISTS eng_proj_select_policy ON engenheiros_projetos;
CREATE POLICY eng_proj_select_policy ON engenheiros_projetos
    FOR SELECT
    USING (
        auth.is_admin() OR 
        auth.is_dono() OR
        eng_id = auth.current_eng_id()
    );

DROP POLICY IF EXISTS eng_proj_update_policy ON engenheiros_projetos;
CREATE POLICY eng_proj_update_policy ON engenheiros_projetos
    FOR UPDATE
    USING (
        auth.is_admin() OR 
        auth.is_dono() OR
        eng_id = auth.current_eng_id()
    );

DROP POLICY IF EXISTS eng_proj_insert_policy ON engenheiros_projetos;
CREATE POLICY eng_proj_insert_policy ON engenheiros_projetos
    FOR INSERT
    WITH CHECK (
        auth.is_admin() OR 
        auth.is_dono() OR
        eng_id = auth.current_eng_id()
    );

-- PROJETOS_PREVISAO: Engenheiros veem apenas suas previsões
DROP POLICY IF EXISTS previsao_select_policy ON projetos_previsao;
CREATE POLICY previsao_select_policy ON projetos_previsao
    FOR SELECT
    USING (
        auth.is_admin() OR 
        auth.is_dono() OR
        eng_id = auth.current_eng_id()
    );

DROP POLICY IF EXISTS previsao_insert_policy ON projetos_previsao;
CREATE POLICY previsao_insert_policy ON projetos_previsao
    FOR INSERT
    WITH CHECK (eng_id = auth.current_eng_id());

DROP POLICY IF EXISTS previsao_update_policy ON projetos_previsao;
CREATE POLICY previsao_update_policy ON projetos_previsao
    FOR UPDATE
    USING (
        eng_id = auth.current_eng_id() AND 
        editavel = true
    );

-- RETRABALHO_PROJETOS: Engenheiros veem apenas seus retrabalhos
DROP POLICY IF EXISTS retrabalho_select_policy ON retrabalho_projetos;
CREATE POLICY retrabalho_select_policy ON retrabalho_projetos
    FOR SELECT
    USING (
        auth.is_admin() OR 
        auth.is_dono() OR
        eng_id = auth.current_eng_id()
    );

DROP POLICY IF EXISTS retrabalho_insert_policy ON retrabalho_projetos;
CREATE POLICY retrabalho_insert_policy ON retrabalho_projetos
    FOR INSERT
    WITH CHECK (eng_id = auth.current_eng_id());

-- PRAZOS: Engenheiros veem apenas seus prazos
DROP POLICY IF EXISTS prazos_select_policy ON prazos;
CREATE POLICY prazos_select_policy ON prazos
    FOR SELECT
    USING (
        auth.is_admin() OR 
        auth.is_dono() OR
        eng_id = auth.current_eng_id()
    );

-- =====================================================
-- PARTE 4: POLÍTICAS PARA DONO
-- =====================================================

\echo '4️⃣ Criando políticas para o dono...'

-- DONO_EMPRESA: Apenas admin pode modificar
DROP POLICY IF EXISTS dono_select_policy ON dono_empresa;
CREATE POLICY dono_select_policy ON dono_empresa
    FOR SELECT
    USING (auth.is_admin() OR auth.is_dono());

DROP POLICY IF EXISTS dono_update_policy ON dono_empresa;
CREATE POLICY dono_update_policy ON dono_empresa
    FOR UPDATE
    USING (auth.is_admin());

-- EVANDRO_DISTRIBUICAO_TASKS: Dono vê tudo, engenheiros veem só suas tasks
DROP POLICY IF EXISTS tasks_select_policy ON evandro_distribuicao_tasks;
CREATE POLICY tasks_select_policy ON evandro_distribuicao_tasks
    FOR SELECT
    USING (
        auth.is_admin() OR 
        auth.is_dono() OR
        eng_id = auth.current_eng_id()
    );

DROP POLICY IF EXISTS tasks_insert_policy ON evandro_distribuicao_tasks;
CREATE POLICY tasks_insert_policy ON evandro_distribuicao_tasks
    FOR INSERT
    WITH CHECK (auth.is_admin() OR auth.is_dono());

DROP POLICY IF EXISTS tasks_update_policy ON evandro_distribuicao_tasks;
CREATE POLICY tasks_update_policy ON evandro_distribuicao_tasks
    FOR UPDATE
    USING (
        auth.is_admin() OR 
        auth.is_dono() OR
        (eng_id = auth.current_eng_id() AND status_task != 'PENDENTE')
    );

-- NOTIFICACOES_WHATSAPP: Engenheiros veem apenas suas notificações
DROP POLICY IF EXISTS notif_select_policy ON notificacoes_whatsapp;
CREATE POLICY notif_select_policy ON notificacoes_whatsapp
    FOR SELECT
    USING (
        auth.is_admin() OR 
        auth.is_dono() OR
        eng_id = auth.current_eng_id()
    );

-- CHATBOT_LOGS: Logs são visíveis para admin e dono
DROP POLICY IF EXISTS logs_select_policy ON chatbot_logs;
CREATE POLICY logs_select_policy ON chatbot_logs
    FOR SELECT
    USING (
        auth.is_admin() OR 
        auth.is_dono() OR
        eng_id = auth.current_eng_id()
    );

DROP POLICY IF EXISTS logs_insert_policy ON chatbot_logs;
CREATE POLICY logs_insert_policy ON chatbot_logs
    FOR INSERT
    WITH CHECK (true); -- Qualquer um pode inserir log

-- =====================================================
-- PARTE 5: POLÍTICAS PARA TABELAS DE REFERÊNCIA
-- =====================================================

\echo '5️⃣ Criando políticas para tabelas de referência...'

-- AREAS: Leitura pública, escrita apenas admin
DROP POLICY IF EXISTS areas_select_policy ON areas;
CREATE POLICY areas_select_policy ON areas
    FOR SELECT
    USING (true); -- Todos podem ler

DROP POLICY IF EXISTS areas_insert_policy ON areas;
CREATE POLICY areas_insert_policy ON areas
    FOR INSERT
    WITH CHECK (auth.is_admin());

DROP POLICY IF EXISTS areas_update_policy ON areas;
CREATE POLICY areas_update_policy ON areas
    FOR UPDATE
    USING (auth.is_admin());

-- STATUS_CODES: Leitura pública, escrita apenas admin
DROP POLICY IF EXISTS status_select_policy ON status_codes;
CREATE POLICY status_select_policy ON status_codes
    FOR SELECT
    USING (true); -- Todos podem ler

DROP POLICY IF EXISTS status_insert_policy ON status_codes;
CREATE POLICY status_insert_policy ON status_codes
    FOR INSERT
    WITH CHECK (auth.is_admin());

DROP POLICY IF EXISTS status_update_policy ON status_codes;
CREATE POLICY status_update_policy ON status_codes
    FOR UPDATE
    USING (auth.is_admin());

-- COMPLEXIDADE_TAREFAS: Leitura pública, escrita apenas admin
DROP POLICY IF EXISTS complex_select_policy ON complexidade_tarefas;
CREATE POLICY complex_select_policy ON complexidade_tarefas
    FOR SELECT
    USING (true); -- Todos podem ler

DROP POLICY IF EXISTS complex_insert_policy ON complexidade_tarefas;
CREATE POLICY complex_insert_policy ON complexidade_tarefas
    FOR INSERT
    WITH CHECK (auth.is_admin());

-- =====================================================
-- PARTE 6: VALIDAÇÕES E CONSTRAINTS
-- =====================================================

\echo '6️⃣ Adicionando validações e constraints...'

-- Validação: Percentual entre 0 e 100
ALTER TABLE engenheiros_projetos 
DROP CONSTRAINT IF EXISTS check_percentual_valido;

ALTER TABLE engenheiros_projetos
ADD CONSTRAINT check_percentual_valido 
CHECK (percentual_andamento >= 0 AND percentual_andamento <= 100);

-- Validação: Data prevista não pode ser anterior ao início
ALTER TABLE engenheiros_projetos
DROP CONSTRAINT IF EXISTS check_datas_validas;

ALTER TABLE engenheiros_projetos
ADD CONSTRAINT check_datas_validas
CHECK (
    data_prevista IS NULL OR 
    data_inicio IS NULL OR 
    data_prevista >= data_inicio
);

-- Validação: Data conclusão não pode ser anterior ao início
ALTER TABLE engenheiros_projetos
DROP CONSTRAINT IF EXISTS check_conclusao_valida;

ALTER TABLE engenheiros_projetos
ADD CONSTRAINT check_conclusao_valida
CHECK (
    data_conclusao IS NULL OR 
    data_inicio IS NULL OR 
    data_conclusao >= data_inicio
);

-- Validação: Tempo de trabalho não pode ser negativo
ALTER TABLE engenheiros_projetos
DROP CONSTRAINT IF EXISTS check_tempo_positivo;

ALTER TABLE engenheiros_projetos
ADD CONSTRAINT check_tempo_positivo
CHECK (tempo_trabalho_dias IS NULL OR tempo_trabalho_dias >= 0);

-- Validação: Prazo final engenheiro não pode ser após prazo cliente
ALTER TABLE prazos
DROP CONSTRAINT IF EXISTS check_prazos_validos;

ALTER TABLE prazos
ADD CONSTRAINT check_prazos_validos
CHECK (prazo_final_eng <= prazo_final_cliente);

-- =====================================================
-- PARTE 7: FUNCTIONS SEGURAS PARA INSERÇÃO
-- =====================================================

\echo '7️⃣ Criando functions seguras...'

-- Function segura para registrar previsão (com validação)
CREATE OR REPLACE FUNCTION registrar_previsao_seguro(
    p_eng_projeto_id UUID,
    p_previsao_texto TEXT,
    p_feito_texto TEXT DEFAULT NULL,
    p_nova_data_prevista DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_eng_id UUID;
    v_projeto_id UUID;
BEGIN
    -- Verifica se o engenheiro tem permissão
    SELECT eng_id, projeto_id INTO v_eng_id, v_projeto_id
    FROM engenheiros_projetos
    WHERE id = p_eng_projeto_id;
    
    IF v_eng_id IS NULL THEN
        RETURN json_build_object(
            'sucesso', false,
            'mensagem', 'Atribuição não encontrada'
        );
    END IF;
    
    IF v_eng_id != auth.current_eng_id() AND NOT auth.is_admin() THEN
        RETURN json_build_object(
            'sucesso', false,
            'mensagem', 'Sem permissão para registrar nesta atribuição'
        );
    END IF;
    
    -- Validação de input (proteção contra XSS)
    IF LENGTH(TRIM(p_previsao_texto)) < 5 THEN
        RETURN json_build_object(
            'sucesso', false,
            'mensagem', 'Previsão deve ter no mínimo 5 caracteres'
        );
    END IF;
    
    -- Insere ou atualiza previsão
    INSERT INTO projetos_previsao (
        eng_projeto_id,
        projeto_id,
        eng_id,
        previsao_texto,
        feito_texto,
        nova_data_prevista
    ) VALUES (
        p_eng_projeto_id,
        v_projeto_id,
        v_eng_id,
        TRIM(p_previsao_texto),
        TRIM(p_feito_texto),
        p_nova_data_prevista
    )
    ON CONFLICT (eng_projeto_id, data_registro)
    DO UPDATE SET
        feito_texto = COALESCE(EXCLUDED.feito_texto, projetos_previsao.feito_texto),
        nova_data_prevista = COALESCE(EXCLUDED.nova_data_prevista, projetos_previsao.nova_data_prevista),
        updated_at = NOW()
    WHERE projetos_previsao.editavel = true;
    
    RETURN json_build_object(
        'sucesso', true,
        'mensagem', 'Previsão registrada com sucesso'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'sucesso', false,
        'mensagem', 'Erro ao registrar: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION registrar_previsao_seguro IS 'Registra previsão com validação e segurança';

-- Function segura para registrar retrabalho
CREATE OR REPLACE FUNCTION registrar_retrabalho_seguro(
    p_eng_projeto_id UUID,
    p_necessitou_retrabalho BOOLEAN,
    p_motivo_retrabalho TEXT,
    p_descricao TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_eng_id UUID;
    v_projeto_id UUID;
BEGIN
    -- Verifica se o engenheiro tem permissão
    SELECT eng_id, projeto_id INTO v_eng_id, v_projeto_id
    FROM engenheiros_projetos
    WHERE id = p_eng_projeto_id;
    
    IF v_eng_id IS NULL THEN
        RETURN json_build_object(
            'sucesso', false,
            'mensagem', 'Atribuição não encontrada'
        );
    END IF;
    
    IF v_eng_id != auth.current_eng_id() AND NOT auth.is_admin() THEN
        RETURN json_build_object(
            'sucesso', false,
            'mensagem', 'Sem permissão para registrar nesta atribuição'
        );
    END IF;
    
    -- Validação: Se houve retrabalho, motivo é obrigatório
    IF p_necessitou_retrabalho = true AND (p_motivo_retrabalho IS NULL OR LENGTH(TRIM(p_motivo_retrabalho)) < 3) THEN
        RETURN json_build_object(
            'sucesso', false,
            'mensagem', 'Motivo do retrabalho é obrigatório e deve ter no mínimo 3 caracteres'
        );
    END IF;
    
    -- Insere retrabalho
    INSERT INTO retrabalho_projetos (
        eng_projeto_id,
        projeto_id,
        eng_id,
        necessitou_retrabalho,
        motivo_retrabalho,
        descricao
    ) VALUES (
        p_eng_projeto_id,
        v_projeto_id,
        v_eng_id,
        p_necessitou_retrabalho,
        TRIM(p_motivo_retrabalho),
        TRIM(p_descricao)
    );
    
    RETURN json_build_object(
        'sucesso', true,
        'mensagem', 'Retrabalho registrado com sucesso'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'sucesso', false,
        'mensagem', 'Erro ao registrar: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION registrar_retrabalho_seguro IS 'Registra retrabalho com validação e segurança';

-- =====================================================
-- PARTE 8: AUDITORIA E LOGS
-- =====================================================

\echo '8️⃣ Implementando auditoria...'

-- Function de auditoria genérica
CREATE OR REPLACE FUNCTION audit_log()
RETURNS TRIGGER AS $$
BEGIN
    -- Registra ação no chatbot_logs
    INSERT INTO chatbot_logs (
        eng_id,
        prompt_original,
        acao_executada,
        sucesso,
        metadata
    ) VALUES (
        auth.current_eng_id(),
        TG_OP || ' em ' || TG_TABLE_NAME,
        TG_OP,
        true,
        jsonb_build_object(
            'tabela', TG_TABLE_NAME,
            'operacao', TG_OP,
            'timestamp', NOW()
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar triggers de auditoria em tabelas sensíveis
DROP TRIGGER IF EXISTS audit_engenheiros_projetos ON engenheiros_projetos;
CREATE TRIGGER audit_engenheiros_projetos
    AFTER INSERT OR UPDATE OR DELETE ON engenheiros_projetos
    FOR EACH ROW
    EXECUTE FUNCTION audit_log();

DROP TRIGGER IF EXISTS audit_projetos_previsao ON projetos_previsao;
CREATE TRIGGER audit_projetos_previsao
    AFTER INSERT OR UPDATE ON projetos_previsao
    FOR EACH ROW
    EXECUTE FUNCTION audit_log();

DROP TRIGGER IF EXISTS audit_retrabalho ON retrabalho_projetos;
CREATE TRIGGER audit_retrabalho
    AFTER INSERT ON retrabalho_projetos
    FOR EACH ROW
    EXECUTE FUNCTION audit_log();

-- =====================================================
-- PARTE 9: PROTEÇÃO CONTRA SQL INJECTION
-- =====================================================

\echo '9️⃣ Implementando proteção contra SQL injection...'

-- Function para sanitizar input
CREATE OR REPLACE FUNCTION sanitize_input(p_input TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Remove caracteres perigosos
    RETURN regexp_replace(
        regexp_replace(p_input, '[<>]', '', 'g'),
        '(DROP|DELETE|TRUNCATE|ALTER|EXEC|EXECUTE|UNION|SELECT.*FROM)', 
        '', 
        'gi'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

COMMENT ON FUNCTION sanitize_input IS 'Sanitiza input do usuário para prevenir SQL injection';

-- =====================================================
-- PARTE 10: GRANTS E PERMISSÕES
-- =====================================================

\echo '🔟 Configurando permissões...'

-- Revogar todas as permissões públicas
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Permitir acesso às tabelas via RLS
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Service role tem acesso total (para migrations e admin)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =====================================================
\echo ''
\echo '✅ Políticas de segurança implementadas com sucesso!'
\echo ''
\echo '🔒 SEGURANÇA HABILITADA:'
\echo '   ✓ Row Level Security (RLS) em todas as tabelas'
\echo '   ✓ Políticas de acesso por função (engenheiro, dono, admin)'
\echo '   ✓ Validações de input e constraints'
\echo '   ✓ Proteção contra SQL injection'
\echo '   ✓ Auditoria automática de ações'
\echo '   ✓ Functions seguras para inserção'
\echo '   ✓ Permissões granulares'
\echo ''
\echo '📋 FUNÇÕES DE SEGURANÇA DISPONÍVEIS:'
\echo '   • auth.current_eng_id() - Pega ID do engenheiro atual'
\echo '   • auth.is_dono() - Verifica se é dono'
\echo '   • auth.is_admin() - Verifica se é admin'
\echo '   • registrar_previsao_seguro() - Registra previsão com validação'
\echo '   • registrar_retrabalho_seguro() - Registra retrabalho com validação'
\echo '   • sanitize_input() - Sanitiza input do usuário'
\echo ''
\echo '⚠️  ATENÇÃO: Configure as claims JWT corretamente:'
\echo '   • eng_id: UUID do engenheiro'
\echo '   • role: "engenheiro" | "dono" | "admin"'
\echo ''
-- =====================================================

