-- =====================================================
-- MIGRACAO: Disciplinas Administrativo e Energisa
-- =====================================================
-- Adiciona novas disciplinas auxiliares sem alterar a
-- disciplina historica ALTERACAO_ENERGISA.
-- =====================================================

INSERT INTO areas (codigo, descricao, tempo_trabalho_dias, ativo)
VALUES
    ('ADMINISTRATIVO', 'Administrativo', 0, true),
    ('ENERGISA', 'Energisa', 0, true)
ON CONFLICT (codigo) DO UPDATE SET
    descricao = EXCLUDED.descricao,
    tempo_trabalho_dias = EXCLUDED.tempo_trabalho_dias,
    ativo = EXCLUDED.ativo;

INSERT INTO area_etapas_template (area_id, nome, tipo, ordem, ativo)
SELECT
    a.area_id,
    v.descricao,
    'global',
    1,
    true
FROM (
    VALUES
        ('ADMINISTRATIVO', 'Administrativo'),
        ('ENERGISA', 'Energisa')
) AS v(codigo, descricao)
JOIN areas a ON a.codigo = v.codigo
ON CONFLICT (area_id, tipo, nome) DO UPDATE SET
    ordem = EXCLUDED.ordem,
    ativo = EXCLUDED.ativo;
