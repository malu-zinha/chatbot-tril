-- =====================================================
-- MIGRACAO: Novas disciplinas + Canteiro de Obra DRT
-- =====================================================
-- 1) Renomeia CANT_OBRA_BT para CANT_OBRA_DRT
--    (Canteiro de Obra DRT). Nao altera a area DRT.
-- 2) Adiciona Cálculo de Áreas e Estação Elevatória
--    de Esgoto com template global simples.
-- As FKs usam area_id (UUID), entao projetos existentes
-- continuam vinculados corretamente.
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM areas WHERE codigo = 'CANT_OBRA_DRT') THEN
        RAISE NOTICE 'Area CANT_OBRA_DRT ja existe. Rename de CANT_OBRA_BT ignorado.';
    ELSIF NOT EXISTS (SELECT 1 FROM areas WHERE codigo = 'CANT_OBRA_BT') THEN
        RAISE NOTICE 'Area CANT_OBRA_BT nao encontrada. Nada a renomear.';
    ELSE
        UPDATE areas
        SET codigo = 'CANT_OBRA_DRT',
            descricao = 'Canteiro de Obra DRT'
        WHERE codigo = 'CANT_OBRA_BT';
        RAISE NOTICE 'Area renomeada com sucesso: CANT_OBRA_DRT';
    END IF;
END $$;

INSERT INTO areas (codigo, descricao, tempo_trabalho_dias, ativo)
VALUES
    ('CALCULO_AREAS', 'Cálculo de Áreas', 0, true),
    ('ESTACAO_ELEVATORIA_ESGOTO', 'Estação Elevatória de Esgoto', 0, true)
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
        ('CALCULO_AREAS', 'Cálculo de Áreas'),
        ('ESTACAO_ELEVATORIA_ESGOTO', 'Estação Elevatória de Esgoto')
) AS v(codigo, descricao)
JOIN areas a ON a.codigo = v.codigo
ON CONFLICT (area_id, tipo, nome) DO UPDATE SET
    ordem = EXCLUDED.ordem,
    ativo = EXCLUDED.ativo;
