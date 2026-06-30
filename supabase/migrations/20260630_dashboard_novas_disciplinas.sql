-- =====================================================
-- MIGRACAO: Novas disciplinas do dashboard
-- =====================================================
-- Adiciona disciplinas auxiliares para atribuicao de projetos
-- e cria um template simples de progresso para cada uma.
-- =====================================================

INSERT INTO areas (codigo, descricao, tempo_trabalho_dias, ativo)
VALUES
    ('LIMP_ARQ', 'Limpeza de Arquitetura', 0, true),
    ('LIMP_EST', 'Limpeza de Estrutura', 0, true),
    ('COMPLEMENTO', 'Complemento', 0, true)
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
        ('LIMP_ARQ', 'Limpeza de Arquitetura'),
        ('LIMP_EST', 'Limpeza de Estrutura'),
        ('COMPLEMENTO', 'Complemento')
) AS v(codigo, descricao)
JOIN areas a ON a.codigo = v.codigo
ON CONFLICT (area_id, tipo, nome) DO UPDATE SET
    ordem = EXCLUDED.ordem,
    ativo = EXCLUDED.ativo;
