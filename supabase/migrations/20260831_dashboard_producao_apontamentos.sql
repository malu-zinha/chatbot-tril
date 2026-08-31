CREATE OR REPLACE VIEW vw_dashboard_producao_apontamentos AS
SELECT
    r.id AS apontamento_id,
    r.data_retrabalho,
    r.eng_id,
    e.nome AS engenheiro,
    r.projeto_id,
    p.codigo_projeto,
    p.cliente,
    ep.id AS eng_projeto_id,
    ep.area_id,
    a.codigo AS area_codigo,
    a.descricao AS area_descricao,
    ep.instancia_label,
    r.necessitou_retrabalho,
    COALESCE(r.horas_trabalhadas_total, 0)::NUMERIC AS horas_trabalhadas_total,
    COALESCE(r.horas_retrabalho, 0)::NUMERIC AS horas_retrabalho
FROM retrabalho_projetos r
JOIN engenheiros_projetos ep ON ep.id = r.eng_projeto_id
JOIN engenheiros e ON e.eng_id = r.eng_id
JOIN projetos p ON p.projeto_id = r.projeto_id
JOIN areas a ON a.area_id = ep.area_id;

COMMENT ON VIEW vw_dashboard_producao_apontamentos IS
'Apontamentos diarios do WhatsApp para o dashboard de producao por periodo, detalhados por engenheiro, projeto e disciplina.';
