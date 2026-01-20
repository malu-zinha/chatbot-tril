-- =====================================================
-- CRIAR PROJETOS DE TESTE
-- =====================================================
-- Use este script para criar projetos rapidamente para testes
-- =====================================================

-- Projeto 1: Residencial
INSERT INTO projetos (codigo_projeto, cliente, descricao)
VALUES ('PRJ-RES-001', 'Cliente Residencial A', 'Projeto residencial completo com todas as instalações')
ON CONFLICT (codigo_projeto) DO NOTHING;

-- Projeto 2: Comercial
INSERT INTO projetos (codigo_projeto, cliente, descricao)
VALUES ('PRJ-COM-001', 'Cliente Comercial B', 'Edificio comercial - instalações elétricas e hidráulicas')
ON CONFLICT (codigo_projeto) DO NOTHING;

-- Projeto 3: Industrial
INSERT INTO projetos (codigo_projeto, cliente, descricao)
VALUES ('PRJ-IND-001', 'Cliente Industrial C', 'Projeto industrial com automação completa')
ON CONFLICT (codigo_projeto) DO NOTHING;

-- Projeto 4: Infraestrutura
INSERT INTO projetos (codigo_projeto, cliente, descricao)
VALUES ('PRJ-INF-001', 'Cliente Infraestrutura D', 'Projeto de infraestrutura urbana')
ON CONFLICT (codigo_projeto) DO NOTHING;

-- Projeto 5: Teste Geral
INSERT INTO projetos (codigo_projeto, cliente, descricao)
VALUES ('PRJ-TESTE', 'Cliente Teste', 'Projeto para testes do sistema')
ON CONFLICT (codigo_projeto) DO NOTHING;

-- =====================================================
-- VERIFICAR PROJETOS CRIADOS
-- =====================================================

SELECT 
    projeto_id,
    codigo_projeto,
    cliente,
    descricao,
    ativo,
    created_at
FROM projetos
WHERE ativo = true
ORDER BY created_at DESC;

SELECT '✅ Projetos de teste criados com sucesso!' as mensagem;

