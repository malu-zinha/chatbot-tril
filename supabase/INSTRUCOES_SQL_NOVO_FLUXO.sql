-- =====================================================
-- INSTRUÇÕES PARA APLICAR NOVO FLUXO DO DONO
-- =====================================================
-- Execute estes SQLs no Supabase SQL Editor NESTA ORDEM
-- =====================================================

-- =====================================================
-- PASSO 1: EXECUTAR sync_datas_prazos.sql
-- =====================================================
-- Este arquivo cria triggers para sincronizar datas entre
-- engenheiros_projetos e prazos bidirecionalmente
-- 
-- Arquivo: supabase/sync_datas_prazos.sql
-- Copie e cole o conteúdo desse arquivo no SQL Editor
-- =====================================================

-- =====================================================
-- PASSO 2: EXECUTAR auto_conclusao_projeto.sql
-- =====================================================
-- Este arquivo cria trigger para preencher data_conclusao
-- automaticamente quando status = CONCLUIDO
-- 
-- Arquivo: supabase/auto_conclusao_projeto.sql
-- Copie e cole o conteúdo desse arquivo no SQL Editor
-- =====================================================

-- =====================================================
-- PASSO 3: ATUALIZAR functions_dono.sql
-- =====================================================
-- A nova função dono_distribuir_projeto_com_prazos
-- já foi adicionada ao arquivo functions_dono.sql
-- 
-- Execute TODO o arquivo functions_dono.sql novamente
-- (ele tem CREATE OR REPLACE, então é seguro)
-- 
-- Arquivo: supabase/functions_dono.sql
-- =====================================================

-- =====================================================
-- PASSO 4: VERIFICAR SE TUDO FUNCIONOU
-- =====================================================

-- Verificar se os triggers foram criados
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN (
  'trg_sync_datas_para_prazos',
  'trg_sync_datas_de_prazos',
  'trg_auto_conclusao'
)
ORDER BY event_object_table, trigger_name;

-- Resultado esperado: 3 triggers listados

-- Verificar se a função de distribuição existe
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'dono_distribuir_projeto_com_prazos';

-- Resultado esperado: 1 função listada

-- =====================================================
-- PASSO 5: TESTAR MANUALMENTE (OPCIONAL)
-- =====================================================

-- Teste 1: Criar um projeto de teste
SELECT criar_projeto(
  'PRJ-TEST-SYNC',
  'Cliente Teste Sincronização',
  'Projeto para testar sincronização de datas'
);

-- Teste 2: Distribuir com prazos
SELECT dono_distribuir_projeto_com_prazos(
  (SELECT dono_id FROM dono_empresa LIMIT 1), -- dono_id
  (SELECT eng_id FROM engenheiros WHERE ativo = true LIMIT 1), -- eng_id
  (SELECT projeto_id FROM projetos WHERE codigo_projeto = 'PRJ-TEST-SYNC'), -- projeto_id
  'ELETRICO', -- area_codigo
  CURRENT_DATE, -- data_inicio
  CURRENT_DATE + INTERVAL '2 days', -- data_inicio_esperada_cliente
  CURRENT_DATE + INTERVAL '15 days', -- prazo_final_eng
  CURRENT_DATE + INTERVAL '20 days', -- prazo_final_cliente
  'Teste de sincronização de datas' -- observacoes
);

-- Teste 3: Verificar se os dados foram salvos corretamente
SELECT 
  ep.id,
  p.codigo_projeto,
  e.nome as engenheiro,
  ep.data_inicio,
  ep.data_prevista,
  pr.data_inicio_projeto,
  pr.prazo_final_eng,
  pr.prazo_final_cliente,
  pr.prazo_interno_dias,
  pr.prazo_cliente_dias
FROM engenheiros_projetos ep
JOIN projetos p ON p.projeto_id = ep.projeto_id
JOIN engenheiros e ON e.eng_id = ep.eng_id
LEFT JOIN prazos pr ON pr.eng_projeto_id = ep.id
WHERE p.codigo_projeto = 'PRJ-TEST-SYNC';

-- Validar:
-- ✓ ep.data_inicio = pr.data_inicio_projeto
-- ✓ ep.data_prevista = pr.prazo_final_eng
-- ✓ pr.prazo_interno_dias calculado corretamente
-- ✓ pr.prazo_cliente_dias calculado corretamente

-- Teste 4: Testar sincronização (mudar data em engenheiros_projetos)
UPDATE engenheiros_projetos
SET data_inicio = CURRENT_DATE + INTERVAL '1 day'
WHERE id = (
  SELECT ep.id 
  FROM engenheiros_projetos ep
  JOIN projetos p ON p.projeto_id = ep.projeto_id
  WHERE p.codigo_projeto = 'PRJ-TEST-SYNC'
);

-- Verificar se a data foi sincronizada em prazos
SELECT 
  ep.data_inicio as data_eng_projetos,
  pr.data_inicio_projeto as data_prazos,
  ep.data_inicio = pr.data_inicio_projeto as sincronizado
FROM engenheiros_projetos ep
JOIN projetos p ON p.projeto_id = ep.projeto_id
LEFT JOIN prazos pr ON pr.eng_projeto_id = ep.id
WHERE p.codigo_projeto = 'PRJ-TEST-SYNC';

-- Resultado esperado: sincronizado = true

-- Teste 5: Limpar dados de teste (opcional)
DELETE FROM engenheiros_projetos 
WHERE projeto_id = (SELECT projeto_id FROM projetos WHERE codigo_projeto = 'PRJ-TEST-SYNC');

DELETE FROM projetos WHERE codigo_projeto = 'PRJ-TEST-SYNC';

-- =====================================================
-- FIM DAS INSTRUÇÕES
-- =====================================================
-- 
-- PRÓXIMOS PASSOS:
-- 1. Abrir terminal no projeto chatbot-tril
-- 2. Executar: npm run test:bot-completo
-- 3. Digitar número do dono: +5583988990772
-- 4. Testar os 3 fluxos principais:
--    - 1: Visualizar (por projeto, engenheiro, retrabalhos)
--    - 2: Distribuir projeto com prazos
--    - 3: Criar novo projeto
-- 
-- Consulte GUIA_TESTES_NOVO_FLUXO_DONO.md para detalhes
-- =====================================================

