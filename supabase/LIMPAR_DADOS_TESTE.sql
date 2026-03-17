-- =====================================================
-- LIMPAR DADOS DE TESTE
-- =====================================================
-- Este script LIMPA os dados de teste mas MANTÉM:
-- - Engenheiros cadastrados
-- - Áreas (seed)
-- - Status codes (seed)
-- - Complexidades (seed)
-- - Tipos de projeto (seed)
-- - Dono da empresa (Evandro)
-- =====================================================

-- =====================================================
-- ORDEM DE DELEÇÃO (respeita foreign keys)
-- =====================================================

-- 1. Notificações WhatsApp (não tem dependentes)
DELETE FROM notificacoes_whatsapp;

-- 2. Logs do chatbot (não tem dependentes)
DELETE FROM chatbot_logs;

-- 3. Retrabalhos (depende de eng_projeto_id)
DELETE FROM retrabalho_projetos;

-- 4. Previsões diárias (depende de eng_projeto_id)
DELETE FROM projetos_previsao;

-- 5. Prazos (depende de eng_projeto_id)
DELETE FROM prazos;

-- 6. Tasks de distribuição do Evandro (depende de eng_projeto_id)
DELETE FROM evandro_distribuicao_tasks;

-- 7. Atribuições engenheiro-projeto (depende de projeto_id e eng_id)
DELETE FROM engenheiros_projetos;

-- 8. Projetos (tabela principal)
DELETE FROM projetos;

-- =====================================================
-- VERIFICAR O QUE FOI DELETADO
-- =====================================================

SELECT 'Dados deletados com sucesso!' as status;

-- Mostrar contagens atuais
SELECT 
    'notificacoes_whatsapp' as tabela,
    COUNT(*) as registros
FROM notificacoes_whatsapp
UNION ALL
SELECT 
    'chatbot_logs' as tabela,
    COUNT(*) as registros
FROM chatbot_logs
UNION ALL
SELECT 
    'retrabalho_projetos' as tabela,
    COUNT(*) as registros
FROM retrabalho_projetos
UNION ALL
SELECT 
    'projetos_previsao' as tabela,
    COUNT(*) as registros
FROM projetos_previsao
UNION ALL
SELECT 
    'prazos' as tabela,
    COUNT(*) as registros
FROM prazos
UNION ALL
SELECT 
    'evandro_distribuicao_tasks' as tabela,
    COUNT(*) as registros
FROM evandro_distribuicao_tasks
UNION ALL
SELECT 
    'engenheiros_projetos' as tabela,
    COUNT(*) as registros
FROM engenheiros_projetos
UNION ALL
SELECT 
    'projetos' as tabela,
    COUNT(*) as registros
FROM projetos
ORDER BY tabela;

-- =====================================================
-- VERIFICAR DADOS MANTIDOS
-- =====================================================

SELECT 'Dados mantidos (seed):' as info;

SELECT 
    'engenheiros' as tabela,
    COUNT(*) as registros
FROM engenheiros
WHERE ativo = true
UNION ALL
SELECT 
    'areas' as tabela,
    COUNT(*) as registros
FROM areas
WHERE ativo = true
UNION ALL
SELECT 
    'status_codes' as tabela,
    COUNT(*) as registros
FROM status_codes
WHERE ativo = true
UNION ALL
SELECT 
    'complexidade_tarefas' as tabela,
    COUNT(*) as registros
FROM complexidade_tarefas
WHERE ativo = true
UNION ALL
SELECT 
    'dono_empresa' as tabela,
    COUNT(*) as registros
FROM dono_empresa
WHERE ativo = true
ORDER BY tabela;

-- =====================================================
-- RESET DE SEQUÊNCIAS (opcional)
-- =====================================================
-- Se você quiser resetar os IDs sequenciais, descomente:

-- ALTER SEQUENCE IF EXISTS areas_area_id_seq RESTART WITH 26;
-- ALTER SEQUENCE IF EXISTS status_codes_status_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS complexidade_tarefas_complexidade_id_seq RESTART WITH 1;

-- =====================================================
-- FIM
-- =====================================================

SELECT '✅ Limpeza concluída! Você pode começar a testar do zero.' as mensagem;

