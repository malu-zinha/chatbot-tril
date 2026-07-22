-- Corrige regressao: vw_projetos_completo nao deve exibir status legado
-- de engenheiros_projetos.status_id. A fonte unica do status da disciplina
-- e engenheiros_projetos.percentual_ponderado.

DROP TRIGGER IF EXISTS trg_sync_status_previsao_to_engenheiros ON projetos_previsao;
DROP FUNCTION IF EXISTS sync_status_previsao_to_engenheiros();

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
    ep.status_id,
    CASE
        WHEN COALESCE(ep.percentual_ponderado, 0) >= 100 THEN 'Concluído'
        WHEN COALESCE(ep.percentual_ponderado, 0) > 0 THEN 'Em Andamento'
        ELSE 'Aguardando Início'
    END AS status_descricao,
    (COALESCE(ep.percentual_ponderado, 0))::NUMERIC(5,2) AS percentual_andamento,
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
        WHEN ep.data_prevista < CURRENT_DATE AND COALESCE(ep.percentual_ponderado, 0) < 100
        THEN (CURRENT_DATE - ep.data_prevista)::INTEGER
        ELSE 0
    END AS dias_atraso,

    -- Campos de display usados pelo chatbot/dashboard
    p.descricao,
    ep.instancia_label

FROM engenheiros_projetos ep
JOIN engenheiros e ON e.eng_id = ep.eng_id
JOIN projetos p ON p.projeto_id = ep.projeto_id
JOIN areas a ON a.area_id = ep.area_id
LEFT JOIN prazos pr ON pr.eng_projeto_id = ep.id
LEFT JOIN vw_quantidade_retrabalhos vr ON vr.eng_projeto_id = ep.id
WHERE ep.ativo = true;

COMMENT ON VIEW vw_projetos_completo IS 'Visao consolidada com status e percentual derivados de engenheiros_projetos.percentual_ponderado';
