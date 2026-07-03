-- =====================================================
-- MIGRACAO: Corrige percentual de retrabalho por engenheiro
-- =====================================================
-- Antes, retrabalho_medio_percentual podia repetir o percentual geral
-- TecPred para todos os engenheiros. Esta view calcula o percentual por
-- engenheiro: retrabalhos do engenheiro / projetos ativos do engenheiro.
-- =====================================================

CREATE OR REPLACE VIEW vw_bloco5_retrabalho_engenheiro AS
SELECT
    e.eng_id,
    e.nome AS engenheiro,
    COUNT(DISTINCT r.eng_projeto_id) FILTER (
        WHERE r.necessitou_retrabalho = true
    ) AS qtde_areas_retrabalho,
    COUNT(r.id) FILTER (
        WHERE r.necessitou_retrabalho = true
    ) AS total_retrabalhos,
    ROUND(
        (
            COUNT(r.id) FILTER (WHERE r.necessitou_retrabalho = true)::NUMERIC
            / NULLIF(COUNT(DISTINCT ep.projeto_id), 0)
        ) * 100,
        2
    ) AS retrabalho_medio_percentual,
    COUNT(DISTINCT ep.projeto_id) FILTER (
        WHERE EXISTS (
            SELECT 1
            FROM retrabalho_projetos r2
            WHERE r2.eng_projeto_id = ep.id
              AND r2.necessitou_retrabalho = true
        )
    ) AS projetos_com_retrabalho
FROM engenheiros e
LEFT JOIN engenheiros_projetos ep
    ON ep.eng_id = e.eng_id
   AND ep.ativo = true
LEFT JOIN retrabalho_projetos r
    ON r.eng_projeto_id = ep.id
WHERE e.ativo = true
GROUP BY e.eng_id, e.nome
HAVING COUNT(r.id) FILTER (WHERE r.necessitou_retrabalho = true) > 0
ORDER BY total_retrabalhos DESC;
