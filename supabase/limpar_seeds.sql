-- =====================================================
-- SCRIPT PARA LIMPAR DADOS DOS SEEDS
-- =====================================================
-- ⚠️ ATENÇÃO: Este script apaga dados, use com cuidado!
-- 
-- O que este script faz:
-- 1. Apaga dados de status_detalhamento
-- 2. Apaga dados de tipos_obra
-- 3. Apaga dados de motivos_retrabalho
-- 4. Apaga áreas dos seeds (H1-H6, E1-E4, etc.)
-- 5. NÃO apaga status_codes (projetos dependem disso)
--
-- O que este script NÃO faz:
-- - Não apaga tabelas (estrutura permanece)
-- - Não apaga projetos
-- - Não apaga engenheiros
-- - Não apaga status_codes principais
-- =====================================================

-- =====================================================
-- 1. Limpar status_detalhamento
-- =====================================================
-- Remove todas as sugestões de previsão/feito
DELETE FROM status_detalhamento;

-- =====================================================
-- 2. Limpar tipos_obra
-- =====================================================
-- Remove tipos de obra (Casa, Prédio, etc.)
DELETE FROM tipos_obra;

-- =====================================================
-- 3. Limpar motivos_retrabalho
-- =====================================================
-- Remove motivos de retrabalho
DELETE FROM motivos_retrabalho;

-- =====================================================
-- 4. Limpar áreas dos seeds (tipos de projeto)
-- =====================================================
-- Remove apenas as áreas inseridas pelos seeds
-- Mantém outras áreas que você possa ter criado manualmente
DELETE FROM areas WHERE codigo IN (
    -- Hidráulico
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    -- Elétrico
    'E1', 'E2', 'E3', 'E4',
    -- Telefonia
    'T1', 'T2', 'T3', 'T4',
    -- Gás
    'G1', 'G2', 'G3', 'G4',
    -- Climatização
    'CL1', 'CL2', 'CL3', 'CL4'
);

-- =====================================================
-- 5. NÃO limpar status_codes
-- =====================================================
-- Os status são essenciais para projetos existentes
-- Se você realmente quiser limpá-los, descomente as linhas abaixo:
-- 
-- DELETE FROM status_codes WHERE codigo IN (
--     'AGUARDANDO_INICIO',
--     'EM_EXECUCAO',
--     'PARADO_CLIENTE',
--     'PARADO_TECPRED',
--     'AGUARDANDO_INF_CLIENTE',
--     'EM_APROVACAO',
--     'CONCLUIDO'
-- );

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

SELECT '✅ Dados limpos com sucesso!' AS resultado;

SELECT 
    'status_detalhamento' AS tabela,
    COUNT(*) AS registros_restantes
FROM status_detalhamento
UNION ALL
SELECT 
    'tipos_obra' AS tabela,
    COUNT(*) AS registros_restantes
FROM tipos_obra
UNION ALL
SELECT 
    'motivos_retrabalho' AS tabela,
    COUNT(*) AS registros_restantes
FROM motivos_retrabalho
UNION ALL
SELECT 
    'areas (H1-CL4)' AS tabela,
    COUNT(*) AS registros_restantes
FROM areas
WHERE codigo ~ '^(H|E|T|G|CL)[0-9]+'
UNION ALL
SELECT 
    'status_codes' AS tabela,
    COUNT(*) AS registros_restantes
FROM status_codes;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

