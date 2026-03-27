-- =====================================================
-- DESTRAVA PREVISÕES PARA TESTES
-- =====================================================
-- Use este script para "destrava" previsões que ficaram
-- marcadas como editavel=false, permitindo novos testes
-- =====================================================

-- 1. Ver previsões de hoje que estão travadas
SELECT 
    pp.id,
    e.nome as engenheiro,
    p.codigo_projeto,
    pp.data_registro,
    pp.previsao_texto,
    pp.feito_texto,
    pp.editavel,
    pp.data_fim_dia
FROM projetos_previsao pp
JOIN engenheiros e ON e.eng_id = pp.eng_id
JOIN projetos p ON p.projeto_id = pp.projeto_id
WHERE pp.data_registro = CURRENT_DATE
AND pp.editavel = false
ORDER BY pp.created_at DESC;

-- 2. DESTRAVA todas as previsões de hoje (para testes)
UPDATE projetos_previsao
SET 
    editavel = true,
    data_fim_dia = NULL,
    feito_texto = NULL
WHERE data_registro = CURRENT_DATE
AND editavel = false;

-- 3. OU delete todas as previsões de hoje para começar do zero
-- DELETE FROM projetos_previsao WHERE data_registro = CURRENT_DATE;

-- 4. Verificar resultado
SELECT 
    pp.id,
    e.nome as engenheiro,
    p.codigo_projeto,
    pp.data_registro,
    pp.editavel,
    pp.created_at
FROM projetos_previsao pp
JOIN engenheiros e ON e.eng_id = pp.eng_id
JOIN projetos p ON p.projeto_id = pp.projeto_id
WHERE pp.data_registro = CURRENT_DATE
ORDER BY pp.created_at DESC;

SELECT '✅ Previsões de hoje destravadas!' as mensagem;

