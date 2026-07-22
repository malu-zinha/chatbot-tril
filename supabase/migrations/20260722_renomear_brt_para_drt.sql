-- =====================================================
-- MIGRACAO: Renomear Canteiro de Obra BRT para DRT
-- =====================================================
-- Atualiza codigo e descricao da area CANT_OBRA_BRT.
-- As FKs usam area_id (UUID), entao projetos existentes
-- continuam vinculados corretamente.
-- =====================================================

UPDATE areas
SET codigo = 'DRT',
    descricao = 'DRT'
WHERE codigo = 'CANT_OBRA_BRT';

-- Verificacao
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM areas WHERE codigo = 'DRT') THEN
        RAISE WARNING 'Area DRT nao encontrada apos UPDATE. Verifique se CANT_OBRA_BRT existia no banco.';
    ELSE
        RAISE NOTICE 'Area renomeada com sucesso: DRT';
    END IF;
END $$;
