-- =====================================================
-- MIGRACAO: Dashboard/Chatbot - Alteracao Energisa
-- =====================================================
-- Adiciona a disciplina auxiliar Alteracao Energisa e
-- cria um template global simples de progresso.
-- =====================================================

INSERT INTO areas (codigo, descricao, tempo_trabalho_dias, ativo)
VALUES ('ALTERACAO_ENERGISA', 'Alteração Energisa', 0, true)
ON CONFLICT (codigo) DO UPDATE SET
    descricao = EXCLUDED.descricao,
    tempo_trabalho_dias = EXCLUDED.tempo_trabalho_dias,
    ativo = EXCLUDED.ativo;

INSERT INTO area_etapas_template (area_id, nome, tipo, ordem, ativo)
SELECT
    a.area_id,
    'Alteração Energisa',
    'global',
    1,
    true
FROM areas a
WHERE a.codigo = 'ALTERACAO_ENERGISA'
ON CONFLICT (area_id, tipo, nome) DO UPDATE SET
    ordem = EXCLUDED.ordem,
    ativo = EXCLUDED.ativo;
