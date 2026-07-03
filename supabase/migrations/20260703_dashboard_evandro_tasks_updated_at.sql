-- =====================================================
-- MIGRACAO: Garante updated_at em evandro_distribuicao_tasks
-- =====================================================
-- As RPCs de transferencia/exclusao sincronizam engenheiros_projetos com
-- evandro_distribuicao_tasks e atualizam updated_at. Alguns bancos antigos
-- nao tinham esta coluna, causando erro ao trocar responsavel no dashboard.
-- =====================================================

ALTER TABLE evandro_distribuicao_tasks
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
