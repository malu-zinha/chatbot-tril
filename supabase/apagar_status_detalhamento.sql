-- =====================================================
-- SCRIPT PARA APAGAR status_detalhamento
-- =====================================================
-- Remove a tabela status_detalhamento e suas views
-- =====================================================

-- Remove as views que dependem da tabela
DROP VIEW IF EXISTS vw_sugestoes_previsao CASCADE;
DROP VIEW IF EXISTS vw_sugestoes_feito CASCADE;
DROP VIEW IF EXISTS vw_significado_status CASCADE;

-- Remove as functions que usam a tabela
DROP FUNCTION IF EXISTS buscar_sugestoes_previsao(TEXT);
DROP FUNCTION IF EXISTS buscar_sugestoes_feito(TEXT);

-- Remove a tabela
DROP TABLE IF EXISTS status_detalhamento CASCADE;

-- Verificação
SELECT '✅ Tabela status_detalhamento removida com sucesso!' AS resultado;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

