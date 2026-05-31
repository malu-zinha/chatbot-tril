-- =====================================================
-- ⚠️ MIGRAÇÃO OBSOLETA — NÃO EXECUTAR
-- =====================================================
-- Esta migração espelhava o percentual ponderado em
-- engenheiros_projetos.percentual_andamento e mexia no status.
--
-- Foi SUBSTITUÍDA por:
--   20260530_status_por_ponderado.sql
--
-- Na nova arquitetura, projetos.percentual_ponderado é a fonte única e o
-- status é derivado dele. A coluna engenheiros_projetos.percentual_andamento
-- ficou morta. Executar este arquivo não tem efeito útil.
-- =====================================================

SELECT '⚠️ Arquivo obsoleto. Use 20260530_status_por_ponderado.sql' AS aviso;
