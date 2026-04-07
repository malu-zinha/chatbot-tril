-- ================================================================
-- SETUP COMPLETO DO BANCO DE DADOS PARA O DASHBOARD TECPRED
-- ================================================================
-- Este script deve ser executado no SQL Editor do Supabase
-- Ele criará todas as tabelas, views e funções necessárias
-- ================================================================

-- IMPORTANTE: Execute este script em um banco de dados VAZIO ou
-- certifique-se de que não há conflitos com tabelas existentes

-- ================================================================
-- PARTE 1: VERIFICAR EXTENSÕES
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================================================================
-- PARTE 2: LIMPAR VIEWS E FUNÇÕES EXISTENTES (SE NECESSÁRIO)
-- ================================================================
-- Descomente as linhas abaixo se precisar recriar tudo do zero

/*
DROP VIEW IF EXISTS vw_bloco1_visao_geral CASCADE;
DROP VIEW IF EXISTS vw_bloco2_atrasos_engenheiro CASCADE;
DROP VIEW IF EXISTS vw_bloco2_atrasos_area CASCADE;
DROP VIEW IF EXISTS vw_bloco3_carga_trabalho CASCADE;
DROP VIEW IF EXISTS vw_bloco4_execucao_media CASCADE;
DROP VIEW IF EXISTS vw_bloco5_retrabalho_engenheiro CASCADE;
DROP VIEW IF EXISTS vw_bloco5_retrabalho_area CASCADE;
DROP VIEW IF EXISTS vw_grafico_projetos_status CASCADE;
DROP VIEW IF EXISTS vw_grafico_atrasos_engenheiro CASCADE;
DROP VIEW IF EXISTS vw_grafico_carga_trabalho CASCADE;
DROP VIEW IF EXISTS vw_grafico_retrabalho_area CASCADE;
DROP VIEW IF EXISTS vw_dono_visao_geral CASCADE;
DROP VIEW IF EXISTS vw_dono_engenheiro_detalhado CASCADE;
DROP VIEW IF EXISTS vw_dono_retrabalhos_historico CASCADE;
DROP VIEW IF EXISTS vw_dono_retrabalhos_por_motivo CASCADE;
DROP VIEW IF EXISTS vw_dono_taxa_execucao_ranking CASCADE;
*/

-- ================================================================
-- PARTE 3: MENSAGEM DE INÍCIO
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '🚀 Iniciando setup do banco de dados TecPred...';
END $$;

-- ================================================================
-- PARTE 4: INSTRUÇÕES DE EXECUÇÃO DOS SCRIPTS
-- ================================================================
-- Agora você precisa executar os seguintes scripts NA ORDEM:
-- 
-- 1. MASTER_SCHEMA_COMPLETO.sql
--    (Cria todas as tabelas principais e seed data)
-- 
-- 2. views_dashboard_blocos.sql
--    (Cria as views para os blocos do dashboard)
-- 
-- 3. tabela_evandro_dono.sql
--    (Cria tabelas e views específicas do dono)
-- 
-- 4. functions_dono.sql
--    (Cria funções para distribuição de tarefas)
-- 
-- 5. security_policies.sql (OPCIONAL)
--    (Implementa Row Level Security)
-- ================================================================

-- ================================================================
-- VERIFICAÇÃO FINAL
-- ================================================================
-- Execute esta query após rodar todos os scripts para verificar:

DO $$
DECLARE
  v_count_tables INT;
  v_count_views INT;
  v_count_functions INT;
BEGIN
  -- Contar tabelas
  SELECT COUNT(*) INTO v_count_tables
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';
  
  -- Contar views
  SELECT COUNT(*) INTO v_count_views
  FROM information_schema.views
  WHERE table_schema = 'public';
  
  -- Contar funções
  SELECT COUNT(*) INTO v_count_functions
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION';
  
  RAISE NOTICE '✅ Setup concluído!';
  RAISE NOTICE '📊 Tabelas criadas: %', v_count_tables;
  RAISE NOTICE '📈 Views criadas: %', v_count_views;
  RAISE NOTICE '⚙️  Funções criadas: %', v_count_functions;
  
  IF v_count_views < 11 THEN
    RAISE WARNING '⚠️  Esperado pelo menos 11 views. Verifique se todos os scripts foram executados.';
  END IF;
END $$;

-- ================================================================
-- LISTA DE VIEWS ESPERADAS
-- ================================================================
-- Execute esta query para listar todas as views criadas:

SELECT 
  table_name as view_name,
  CASE 
    WHEN table_name LIKE 'vw_bloco%' THEN '📊 Dashboard'
    WHEN table_name LIKE 'vw_dono%' THEN '👔 Dono'
    WHEN table_name LIKE 'vw_grafico%' THEN '📈 Gráficos'
    ELSE '❓ Outros'
  END as categoria
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY categoria, table_name;

-- ================================================================
-- DADOS DE TESTE (OPCIONAL)
-- ================================================================
-- Descomente para inserir dados de teste

/*
-- Engenheiro de teste
INSERT INTO engenheiros_projetos (eng_id, nome_eng, exclusivo, whatsapp)
VALUES 
  ('ENG001', 'João Silva', false, '+5511999999999'),
  ('ENG002', 'Maria Santos', true, '+5511988888888'),
  ('ENG003', 'Pedro Oliveira', false, '+5511977777777')
ON CONFLICT (eng_id) DO NOTHING;

-- Projetos de teste
INSERT INTO projetos_previsao (
  codigo_projeto,
  eng_id,
  area_id,
  complexidade_id,
  dias_estimados,
  percentual_execucao,
  status_id,
  data_inicio,
  data_prevista_fim
)
SELECT 
  'PROJ' || LPAD(generate_series::TEXT, 3, '0'),
  CASE WHEN random() < 0.5 THEN 'ENG001' ELSE 'ENG002' END,
  (SELECT area_id FROM areas_bd ORDER BY RANDOM() LIMIT 1),
  (SELECT complexidade_id FROM complexidade_tarefas ORDER BY RANDOM() LIMIT 1),
  (random() * 20 + 5)::INT,
  (random() * 100)::INT,
  (SELECT status_id FROM status_bd ORDER BY RANDOM() LIMIT 1),
  CURRENT_DATE - (random() * 30)::INT,
  CURRENT_DATE + (random() * 30)::INT
FROM generate_series(1, 20);

-- Retrabalhos de teste
INSERT INTO retrabalho_projetos (
  projeto_id,
  area_id,
  percentual_retrabalho,
  motivo_retrabalho,
  data_identificacao
)
SELECT 
  projeto_id,
  area_id,
  (random() * 30 + 5)::NUMERIC(5,2),
  CASE (random() * 3)::INT
    WHEN 0 THEN 'Erro de medição'
    WHEN 1 THEN 'Alteração de escopo'
    ELSE 'Problema técnico'
  END,
  data_inicio + (random() * 10)::INT
FROM projetos_previsao
WHERE random() < 0.3
LIMIT 10;
*/

-- ================================================================
-- FIM DO SCRIPT
-- ================================================================
