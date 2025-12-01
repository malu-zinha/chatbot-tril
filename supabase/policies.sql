-- =====================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY) - CHATBOT TRIL CONSULT
-- =====================================================
-- Responsabilidade: Iza (Banco de Dados)
-- 
-- Este arquivo define as políticas de segurança em nível de linha
-- para garantir que cada engenheiro tenha acesso apenas aos seus
-- próprios dados.
-- =====================================================

-- =====================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

ALTER TABLE engenheiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE execucao_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE retrabalhos ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- POLÍTICAS: engenheiros
-- =====================================================

-- Engenheiro pode ver apenas seu próprio cadastro
CREATE POLICY "Engenheiros podem ver apenas seus próprios dados"
    ON engenheiros
    FOR SELECT
    USING (auth.uid() = id);

-- Engenheiro pode atualizar apenas seus próprios dados
CREATE POLICY "Engenheiros podem atualizar apenas seus próprios dados"
    ON engenheiros
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Apenas admins podem inserir novos engenheiros (comentado - ajustar conforme necessidade)
-- CREATE POLICY "Apenas admins podem criar engenheiros"
--     ON engenheiros
--     FOR INSERT
--     WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');


-- =====================================================
-- POLÍTICAS: projetos
-- =====================================================

-- Engenheiro pode ver apenas seus próprios projetos
CREATE POLICY "Engenheiros podem ver apenas seus projetos"
    ON projetos
    FOR SELECT
    USING (auth.uid() = engenheiro_id);

-- Engenheiro pode inserir projetos para si mesmo
CREATE POLICY "Engenheiros podem criar projetos para si mesmos"
    ON projetos
    FOR INSERT
    WITH CHECK (auth.uid() = engenheiro_id);

-- Engenheiro pode atualizar apenas seus próprios projetos
CREATE POLICY "Engenheiros podem atualizar apenas seus projetos"
    ON projetos
    FOR UPDATE
    USING (auth.uid() = engenheiro_id)
    WITH CHECK (auth.uid() = engenheiro_id);

-- Engenheiro pode deletar apenas seus próprios projetos
CREATE POLICY "Engenheiros podem deletar apenas seus projetos"
    ON projetos
    FOR DELETE
    USING (auth.uid() = engenheiro_id);


-- =====================================================
-- POLÍTICAS: execucao_diaria
-- =====================================================

-- Engenheiro pode ver execuções apenas de seus projetos
CREATE POLICY "Engenheiros podem ver execuções de seus projetos"
    ON execucao_diaria
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projetos
            WHERE projetos.id = execucao_diaria.projeto_id
            AND projetos.engenheiro_id = auth.uid()
        )
    );

-- Engenheiro pode inserir execuções apenas em seus projetos
CREATE POLICY "Engenheiros podem registrar execuções em seus projetos"
    ON execucao_diaria
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projetos
            WHERE projetos.id = execucao_diaria.projeto_id
            AND projetos.engenheiro_id = auth.uid()
        )
    );

-- Engenheiro pode atualizar execuções apenas de seus projetos
CREATE POLICY "Engenheiros podem atualizar execuções de seus projetos"
    ON execucao_diaria
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM projetos
            WHERE projetos.id = execucao_diaria.projeto_id
            AND projetos.engenheiro_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projetos
            WHERE projetos.id = execucao_diaria.projeto_id
            AND projetos.engenheiro_id = auth.uid()
        )
    );

-- Engenheiro pode deletar execuções apenas de seus projetos
CREATE POLICY "Engenheiros podem deletar execuções de seus projetos"
    ON execucao_diaria
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projetos
            WHERE projetos.id = execucao_diaria.projeto_id
            AND projetos.engenheiro_id = auth.uid()
        )
    );


-- =====================================================
-- POLÍTICAS: retrabalhos
-- =====================================================

-- Engenheiro pode ver retrabalhos apenas de seus projetos
CREATE POLICY "Engenheiros podem ver retrabalhos de seus projetos"
    ON retrabalhos
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projetos
            WHERE projetos.id = retrabalhos.projeto_id
            AND projetos.engenheiro_id = auth.uid()
        )
    );

-- Engenheiro pode inserir retrabalhos apenas em seus projetos
CREATE POLICY "Engenheiros podem registrar retrabalhos em seus projetos"
    ON retrabalhos
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projetos
            WHERE projetos.id = retrabalhos.projeto_id
            AND projetos.engenheiro_id = auth.uid()
        )
    );

-- Engenheiro pode atualizar retrabalhos apenas de seus projetos
CREATE POLICY "Engenheiros podem atualizar retrabalhos de seus projetos"
    ON retrabalhos
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM projetos
            WHERE projetos.id = retrabalhos.projeto_id
            AND projetos.engenheiro_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projetos
            WHERE projetos.id = retrabalhos.projeto_id
            AND projetos.engenheiro_id = auth.uid()
        )
    );

-- Engenheiro pode deletar retrabalhos apenas de seus projetos
CREATE POLICY "Engenheiros podem deletar retrabalhos de seus projetos"
    ON retrabalhos
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projetos
            WHERE projetos.id = retrabalhos.projeto_id
            AND projetos.engenheiro_id = auth.uid()
        )
    );


-- =====================================================
-- POLÍTICAS ESPECIAIS: Visualização para CEO/Admin
-- =====================================================
-- Estas políticas permitem que usuários com role 'admin' ou 'ceo'
-- vejam todos os dados de todos os engenheiros
-- =====================================================

-- CEO/Admin pode ver todos os engenheiros
CREATE POLICY "CEO e Admin podem ver todos os engenheiros"
    ON engenheiros
    FOR SELECT
    USING (
        auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'ceo')
    );

-- CEO/Admin pode ver todos os projetos
CREATE POLICY "CEO e Admin podem ver todos os projetos"
    ON projetos
    FOR SELECT
    USING (
        auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'ceo')
    );

-- CEO/Admin pode ver todas as execuções
CREATE POLICY "CEO e Admin podem ver todas as execuções"
    ON execucao_diaria
    FOR SELECT
    USING (
        auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'ceo')
    );

-- CEO/Admin pode ver todos os retrabalhos
CREATE POLICY "CEO e Admin podem ver todos os retrabalhos"
    ON retrabalhos
    FOR SELECT
    USING (
        auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'ceo')
    );


-- =====================================================
-- POLÍTICAS: Service Role (Edge Functions)
-- =====================================================
-- Edge Functions executam com service_role e precisam
-- ter acesso total para operações do sistema
-- =====================================================

-- NOTA: Service role bypassa automaticamente o RLS
-- Não é necessário criar políticas específicas
-- As Edge Functions devem usar o service_role key

-- =====================================================
-- TESTE DAS POLÍTICAS
-- =====================================================
-- Para testar se as políticas estão funcionando corretamente:
--
-- 1. Conecte como um engenheiro específico
-- 2. Tente SELECT em projetos - deve ver apenas os seus
-- 3. Tente INSERT em projetos de outro engenheiro - deve falhar
-- 4. Tente UPDATE em projeto de outro engenheiro - deve falhar
-- 5. Conecte como CEO/Admin - deve ver todos os dados
-- =====================================================

-- Exemplo de query de teste:
-- SELECT * FROM projetos; -- Deve retornar apenas projetos do engenheiro logado
-- SELECT * FROM execucao_diaria; -- Deve retornar apenas execuções dos projetos do engenheiro logado
