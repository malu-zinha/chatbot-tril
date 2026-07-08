-- Alinha a view usada pelo chatbot com os campos exibidos no dashboard.
-- Mantem as colunas existentes na mesma ordem e adiciona descricao/instancia_label no fim.

CREATE OR REPLACE VIEW vw_projetos_completo AS
SELECT
    ep.id AS atribuicao_id,
    e.eng_id,
    e.nome AS engenheiro_nome,
    p.projeto_id,
    p.codigo_projeto,
    p.cliente,
    a.area_id,
    a.codigo AS area_codigo,
    a.descricao AS area_descricao,
    ep.data_inicio,
    ep.data_prevista,
    ep.data_conclusao,
    s.status_id,
    s.descricao AS status_descricao,
    ep.percentual_andamento,
    ep.tempo_trabalho_dias,

    -- Prazos
    pr.data_inicio_projeto,
    pr.data_inicio_esperada_cliente,
    pr.prazo_final_eng,
    pr.prazo_final_cliente,
    pr.prazo_interno_dias,
    pr.prazo_cliente_dias,

    -- Retrabalhos
    COALESCE(vr.quantidade_retrabalhos, 0) AS quantidade_retrabalhos,
    COALESCE(vr.percentual_retrabalhos, 0) AS percentual_retrabalhos,

    -- Ultima previsao
    (
        SELECT previsao_texto
        FROM projetos_previsao
        WHERE eng_projeto_id = ep.id
        ORDER BY data_registro DESC
        LIMIT 1
    ) AS ultima_previsao,

    (
        SELECT feito_texto
        FROM projetos_previsao
        WHERE eng_projeto_id = ep.id
        ORDER BY data_registro DESC
        LIMIT 1
    ) AS ultimo_feito,

    -- Calculo de dias de atraso
    CASE
        WHEN ep.data_prevista < CURRENT_DATE AND ep.data_conclusao IS NULL
        THEN (CURRENT_DATE - ep.data_prevista)::INTEGER
        ELSE 0
    END AS dias_atraso,

    -- Campos adicionados para display consistente entre chatbot e dashboard
    p.descricao,
    ep.instancia_label

FROM engenheiros_projetos ep
JOIN engenheiros e ON e.eng_id = ep.eng_id
JOIN projetos p ON p.projeto_id = ep.projeto_id
JOIN areas a ON a.area_id = ep.area_id
LEFT JOIN status_codes s ON s.status_id = ep.status_id
LEFT JOIN prazos pr ON pr.eng_projeto_id = ep.id
LEFT JOIN vw_quantidade_retrabalhos vr ON vr.eng_projeto_id = ep.id
WHERE ep.ativo = true;

COMMENT ON VIEW vw_projetos_completo IS 'Visao consolidada com retrabalhos, prazos, previsoes e campos de display do dashboard';
