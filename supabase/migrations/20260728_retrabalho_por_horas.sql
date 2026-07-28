-- Ajusta retrabalho para percentuais por horas trabalhadas.
-- Registros historicos sem horas permanecem sem backfill numerico.

ALTER TABLE retrabalho_projetos
    ADD COLUMN IF NOT EXISTS horas_trabalhadas_total NUMERIC,
    ADD COLUMN IF NOT EXISTS horas_retrabalho NUMERIC;

UPDATE retrabalho_projetos
SET motivo_retrabalho = CASE
    WHEN motivo_retrabalho = 'Falta de informações' THEN 'Falta de informação (Construtora)'
    WHEN motivo_retrabalho = 'Mudança de requisitos' THEN 'Alteração de projeto (Construtora)'
    WHEN motivo_retrabalho = 'Erro de dimensionamento' THEN 'Erro de projeto (TecPred)'
    ELSE motivo_retrabalho
END
WHERE motivo_retrabalho IN (
    'Falta de informações',
    'Mudança de requisitos',
    'Erro de dimensionamento'
);

ALTER TABLE retrabalho_projetos
    DROP CONSTRAINT IF EXISTS chk_retrabalho_motivo_padrao,
    DROP CONSTRAINT IF EXISTS chk_retrabalho_horas_nao_negativas,
    DROP CONSTRAINT IF EXISTS chk_retrabalho_horas_consistentes,
    DROP CONSTRAINT IF EXISTS chk_retrabalho_sem_retrabalho_horas_zero;

ALTER TABLE retrabalho_projetos
    ADD CONSTRAINT chk_retrabalho_motivo_padrao
        CHECK (
            motivo_retrabalho IS NULL OR motivo_retrabalho IN (
                'Falta de informação (Construtora)',
                'Alteração de projeto (Construtora)',
                'Erro de projeto (TecPred)',
                'Projeto Suspenso',
                'Erro de comunicação',
                'Outro'
            )
        ) NOT VALID,
    ADD CONSTRAINT chk_retrabalho_horas_nao_negativas
        CHECK (
            (horas_trabalhadas_total IS NULL OR horas_trabalhadas_total >= 0)
            AND (horas_retrabalho IS NULL OR horas_retrabalho >= 0)
        ) NOT VALID,
    ADD CONSTRAINT chk_retrabalho_horas_consistentes
        CHECK (
            horas_trabalhadas_total IS NULL
            OR horas_retrabalho IS NULL
            OR horas_retrabalho <= horas_trabalhadas_total
        ) NOT VALID,
    ADD CONSTRAINT chk_retrabalho_sem_retrabalho_horas_zero
        CHECK (
            necessitou_retrabalho = true
            OR horas_retrabalho IS NULL
            OR horas_retrabalho = 0
        ) NOT VALID;

DROP FUNCTION IF EXISTS registrar_retrabalho_dia(UUID, BOOLEAN, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION registrar_retrabalho_dia(
    p_atribuicao_id UUID,
    p_necessitou_retrabalho BOOLEAN,
    p_motivo_retrabalho TEXT DEFAULT NULL,
    p_tipo_retrabalho TEXT DEFAULT NULL,
    p_descricao TEXT DEFAULT NULL,
    p_horas_trabalhadas_total NUMERIC DEFAULT NULL,
    p_horas_retrabalho NUMERIC DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_retrabalho_id UUID;
    v_projeto_id UUID;
    v_eng_id UUID;
    v_status_id INTEGER;
    v_quantidade INTEGER;
    v_existe_hoje BOOLEAN;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM engenheiros_projetos WHERE id = p_atribuicao_id AND ativo = true) THEN
        RETURN json_build_object('sucesso', false, 'mensagem', 'Atribuição não encontrada');
    END IF;

    IF p_horas_trabalhadas_total IS NOT NULL AND p_horas_trabalhadas_total < 0 THEN
        RETURN json_build_object('sucesso', false, 'mensagem', 'Horas trabalhadas totais não podem ser negativas');
    END IF;

    IF p_horas_retrabalho IS NOT NULL AND p_horas_retrabalho < 0 THEN
        RETURN json_build_object('sucesso', false, 'mensagem', 'Horas de retrabalho não podem ser negativas');
    END IF;

    IF p_horas_trabalhadas_total IS NOT NULL
       AND p_horas_retrabalho IS NOT NULL
       AND p_horas_retrabalho > p_horas_trabalhadas_total THEN
        RETURN json_build_object('sucesso', false, 'mensagem', 'Horas de retrabalho não podem exceder as horas trabalhadas totais');
    END IF;

    IF p_necessitou_retrabalho = false THEN
        p_motivo_retrabalho := NULL;
        p_tipo_retrabalho := NULL;
        p_horas_retrabalho := COALESCE(p_horas_retrabalho, 0);
    END IF;

    IF p_necessitou_retrabalho = true AND (p_motivo_retrabalho IS NULL OR TRIM(p_motivo_retrabalho) = '') THEN
        RETURN json_build_object('sucesso', false, 'mensagem', 'Motivo do retrabalho é obrigatório');
    END IF;

    SELECT projeto_id, eng_id, status_id
    INTO v_projeto_id, v_eng_id, v_status_id
    FROM engenheiros_projetos
    WHERE id = p_atribuicao_id;

    SELECT EXISTS (
        SELECT 1
        FROM retrabalho_projetos
        WHERE eng_projeto_id = p_atribuicao_id
          AND data_retrabalho = CURRENT_DATE
    ) INTO v_existe_hoje;

    IF v_existe_hoje THEN
        UPDATE retrabalho_projetos
        SET
            necessitou_retrabalho = p_necessitou_retrabalho,
            motivo_retrabalho = p_motivo_retrabalho,
            tipo_retrabalho = p_tipo_retrabalho,
            descricao = p_descricao,
            horas_trabalhadas_total = p_horas_trabalhadas_total,
            horas_retrabalho = p_horas_retrabalho
        WHERE eng_projeto_id = p_atribuicao_id
          AND data_retrabalho = CURRENT_DATE
        RETURNING id INTO v_retrabalho_id;
    ELSE
        INSERT INTO retrabalho_projetos (
            eng_projeto_id,
            projeto_id,
            eng_id,
            necessitou_retrabalho,
            motivo_retrabalho,
            tipo_retrabalho,
            descricao,
            horas_trabalhadas_total,
            horas_retrabalho,
            data_retrabalho,
            status_id
        ) VALUES (
            p_atribuicao_id,
            v_projeto_id,
            v_eng_id,
            p_necessitou_retrabalho,
            p_motivo_retrabalho,
            p_tipo_retrabalho,
            p_descricao,
            p_horas_trabalhadas_total,
            p_horas_retrabalho,
            CURRENT_DATE,
            v_status_id
        )
        RETURNING id INTO v_retrabalho_id;
    END IF;

    SELECT COUNT(*) INTO v_quantidade
    FROM retrabalho_projetos
    WHERE eng_projeto_id = p_atribuicao_id
      AND necessitou_retrabalho = true;

    RETURN json_build_object(
        'sucesso', true,
        'mensagem', CASE
            WHEN v_existe_hoje THEN 'Registro de retrabalho atualizado'
            ELSE 'Registro de retrabalho criado'
        END,
        'retrabalho_id', v_retrabalho_id,
        'necessitou_retrabalho', p_necessitou_retrabalho,
        'quantidade_total_retrabalhos', v_quantidade,
        'horas_trabalhadas_total', p_horas_trabalhadas_total,
        'horas_retrabalho', p_horas_retrabalho,
        'data', CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION registrar_retrabalho_dia IS 'Registra ou atualiza retrabalho do dia com horas totais e horas de retrabalho';

CREATE OR REPLACE VIEW vw_quantidade_retrabalhos AS
SELECT
    eng_projeto_id,
    COUNT(*) FILTER (WHERE necessitou_retrabalho = true) AS quantidade_retrabalhos,
    COUNT(*) AS total_dias_registrados,
    ROUND(
        (
            SUM(COALESCE(horas_retrabalho, 0)) /
            NULLIF(SUM(COALESCE(horas_trabalhadas_total, 0)), 0)
        ) * 100,
        2
    ) AS percentual_retrabalhos,
    COALESCE(SUM(COALESCE(horas_trabalhadas_total, 0)), 0)::NUMERIC AS horas_trabalhadas_total,
    COALESCE(SUM(COALESCE(horas_retrabalho, 0)), 0)::NUMERIC AS horas_retrabalho_total
FROM retrabalho_projetos
GROUP BY eng_projeto_id;

COMMENT ON VIEW vw_quantidade_retrabalhos IS 'Retrabalho por atribuicao: percentual por horas de retrabalho / horas trabalhadas totais';

CREATE OR REPLACE VIEW vw_retrabalho_geral AS
SELECT
    COUNT(r.id) FILTER (WHERE r.necessitou_retrabalho = true) AS total_retrabalhos_geral,
    COUNT(DISTINCT p.projeto_id) FILTER (WHERE p.ativo = true) AS total_projetos_ativos,
    COALESCE(
        ROUND(
            (
                SUM(COALESCE(r.horas_retrabalho, 0)) /
                NULLIF(SUM(COALESCE(r.horas_trabalhadas_total, 0)), 0)
            ) * 100,
            2
        ),
        0
    ) AS percentual_geral_retrabalho,
    COALESCE(SUM(COALESCE(r.horas_trabalhadas_total, 0)), 0)::NUMERIC AS horas_trabalhadas_total,
    COALESCE(SUM(COALESCE(r.horas_retrabalho, 0)), 0)::NUMERIC AS horas_retrabalho_total
FROM projetos p
LEFT JOIN retrabalho_projetos r ON r.projeto_id = p.projeto_id
WHERE p.ativo = true;

CREATE OR REPLACE VIEW vw_retrabalho_por_projeto AS
WITH retrabalho_projeto AS (
    SELECT
        projeto_id,
        COUNT(id) FILTER (WHERE necessitou_retrabalho = true) AS total_retrabalhos_projeto,
        COALESCE(SUM(COALESCE(horas_trabalhadas_total, 0)), 0)::NUMERIC AS horas_trabalhadas_total,
        COALESCE(SUM(COALESCE(horas_retrabalho, 0)), 0)::NUMERIC AS horas_retrabalho_total
    FROM retrabalho_projetos
    GROUP BY projeto_id
),
engenheiros_projeto AS (
    SELECT
        projeto_id,
        COUNT(DISTINCT eng_id) AS total_engenheiros_projeto
    FROM engenheiros_projetos
    WHERE ativo = true
    GROUP BY projeto_id
)
SELECT
    p.projeto_id,
    p.codigo_projeto,
    p.cliente,
    COALESCE(rp.total_retrabalhos_projeto, 0) AS total_retrabalhos_projeto,
    COALESCE(ep.total_engenheiros_projeto, 0) AS total_engenheiros_projeto,
    COALESCE(
        ROUND(
            (
                rp.horas_retrabalho_total /
                NULLIF(rp.horas_trabalhadas_total, 0)
            ) * 100,
            2
        ),
        0
    ) AS percentual_retrabalho_projeto,
    COALESCE(rp.horas_trabalhadas_total, 0) AS horas_trabalhadas_total,
    COALESCE(rp.horas_retrabalho_total, 0) AS horas_retrabalho_total
FROM projetos p
LEFT JOIN retrabalho_projeto rp ON rp.projeto_id = p.projeto_id
LEFT JOIN engenheiros_projeto ep ON ep.projeto_id = p.projeto_id
WHERE p.ativo = true
  AND COALESCE(rp.total_retrabalhos_projeto, 0) > 0;

CREATE OR REPLACE VIEW vw_retrabalho_por_area_projeto AS
SELECT
    p.projeto_id,
    p.codigo_projeto,
    p.cliente,
    a.area_id,
    a.codigo AS area_codigo,
    a.descricao AS area,
    COUNT(r.id) FILTER (WHERE r.necessitou_retrabalho = true) AS total_retrabalhos_area,
    COALESCE(SUM(COALESCE(r.horas_trabalhadas_total, 0)), 0)::NUMERIC AS horas_trabalhadas_total,
    COALESCE(SUM(COALESCE(r.horas_retrabalho, 0)), 0)::NUMERIC AS horas_retrabalho_total,
    COALESCE(
        ROUND(
            (
                SUM(COALESCE(r.horas_retrabalho, 0)) /
                NULLIF(SUM(COALESCE(r.horas_trabalhadas_total, 0)), 0)
            ) * 100,
            2
        ),
        0
    ) AS percentual_retrabalho_disciplina
FROM projetos p
JOIN engenheiros_projetos ep ON ep.projeto_id = p.projeto_id AND ep.ativo = true
JOIN areas a ON a.area_id = ep.area_id
LEFT JOIN retrabalho_projetos r ON r.eng_projeto_id = ep.id
WHERE p.ativo = true
GROUP BY p.projeto_id, p.codigo_projeto, p.cliente, a.area_id, a.codigo, a.descricao
HAVING COUNT(r.id) FILTER (WHERE r.necessitou_retrabalho = true) > 0;

CREATE OR REPLACE VIEW vw_retrabalho_taxa_area_projeto AS
SELECT
    projeto_id,
    codigo_projeto,
    cliente,
    area_id,
    area_codigo,
    area,
    total_retrabalhos_area,
    0::BIGINT AS dias_com_registro,
    percentual_retrabalho_disciplina AS taxa_retrabalho_por_dia,
    horas_trabalhadas_total,
    horas_retrabalho_total,
    percentual_retrabalho_disciplina
FROM vw_retrabalho_por_area_projeto
ORDER BY percentual_retrabalho_disciplina DESC;

CREATE OR REPLACE VIEW vw_retrabalho_detalhes_projeto AS
SELECT
    r.id AS retrabalho_id,
    r.projeto_id,
    p.codigo_projeto,
    p.cliente,
    r.data_retrabalho,
    ep.eng_id,
    e.nome AS engenheiro_nome,
    r.motivo_retrabalho,
    ep.area_id,
    a.codigo AS area_codigo,
    a.descricao AS area_descricao,
    r.horas_trabalhadas_total,
    r.horas_retrabalho
FROM retrabalho_projetos r
JOIN projetos p ON p.projeto_id = r.projeto_id
JOIN engenheiros_projetos ep ON ep.id = r.eng_projeto_id
JOIN engenheiros e ON e.eng_id = ep.eng_id
JOIN areas a ON a.area_id = ep.area_id
WHERE r.necessitou_retrabalho = true
ORDER BY p.codigo_projeto, a.codigo, r.data_retrabalho DESC;

CREATE OR REPLACE VIEW vw_retrabalho_motivos_por_projeto AS
SELECT
    p.projeto_id,
    p.codigo_projeto,
    p.cliente,
    r.motivo_retrabalho,
    COUNT(*) AS quantidade,
    COALESCE(SUM(COALESCE(r.horas_retrabalho, 0)), 0)::NUMERIC AS horas_retrabalho_total
FROM retrabalho_projetos r
JOIN projetos p ON p.projeto_id = r.projeto_id
WHERE r.necessitou_retrabalho = true
  AND r.motivo_retrabalho IS NOT NULL
GROUP BY p.projeto_id, p.codigo_projeto, p.cliente, r.motivo_retrabalho
ORDER BY p.codigo_projeto, quantidade DESC;

CREATE OR REPLACE VIEW vw_dono_retrabalhos_por_motivo AS
SELECT
    motivo_retrabalho,
    COUNT(*) AS quantidade,
    COUNT(DISTINCT eng_id) AS engenheiros_afetados,
    COUNT(DISTINCT projeto_id) AS projetos_afetados,
    COALESCE(SUM(COALESCE(horas_retrabalho, 0)), 0)::NUMERIC AS horas_retrabalho_total
FROM retrabalho_projetos
WHERE necessitou_retrabalho = true
  AND motivo_retrabalho IS NOT NULL
GROUP BY motivo_retrabalho
ORDER BY quantidade DESC;

CREATE OR REPLACE VIEW vw_bloco5_retrabalho_engenheiro AS
SELECT
    e.eng_id,
    e.nome AS engenheiro,
    COUNT(DISTINCT ep.area_id) FILTER (WHERE r.necessitou_retrabalho = true) AS qtde_areas_retrabalho,
    COUNT(r.id) FILTER (WHERE r.necessitou_retrabalho = true) AS total_retrabalhos,
    COALESCE(
        ROUND(
            (
                SUM(COALESCE(r.horas_retrabalho, 0)) /
                NULLIF(SUM(COALESCE(r.horas_trabalhadas_total, 0)), 0)
            ) * 100,
            2
        ),
        0
    ) AS retrabalho_medio_percentual,
    COUNT(DISTINCT r.projeto_id) FILTER (WHERE r.necessitou_retrabalho = true) AS projetos_com_retrabalho,
    COALESCE(SUM(COALESCE(r.horas_trabalhadas_total, 0)), 0)::NUMERIC AS horas_trabalhadas_total,
    COALESCE(SUM(COALESCE(r.horas_retrabalho, 0)), 0)::NUMERIC AS horas_retrabalho_total
FROM engenheiros e
LEFT JOIN engenheiros_projetos ep ON ep.eng_id = e.eng_id AND ep.ativo = true
LEFT JOIN retrabalho_projetos r ON r.eng_projeto_id = ep.id
WHERE e.ativo = true
GROUP BY e.eng_id, e.nome
HAVING COUNT(r.id) FILTER (WHERE r.necessitou_retrabalho = true) > 0
ORDER BY total_retrabalhos DESC;

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
    pr.data_inicio_projeto,
    pr.data_inicio_esperada_cliente,
    pr.prazo_final_eng,
    pr.prazo_final_cliente,
    pr.prazo_interno_dias,
    pr.prazo_cliente_dias,
    COALESCE(vr.quantidade_retrabalhos, 0) AS quantidade_retrabalhos,
    COALESCE(vr.percentual_retrabalhos, 0) AS percentual_retrabalhos,
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
    CASE
        WHEN ep.data_prevista < CURRENT_DATE AND COALESCE(ep.percentual_ponderado, 0) < 100
        THEN (CURRENT_DATE - ep.data_prevista)::INTEGER
        ELSE 0
    END AS dias_atraso,
    p.descricao,
    ep.instancia_label,
    COALESCE(vr.horas_trabalhadas_total, 0) AS horas_trabalhadas_total,
    COALESCE(vr.horas_retrabalho_total, 0) AS horas_retrabalho_total
FROM engenheiros_projetos ep
JOIN engenheiros e ON e.eng_id = ep.eng_id
JOIN projetos p ON p.projeto_id = ep.projeto_id
JOIN areas a ON a.area_id = ep.area_id
LEFT JOIN prazos pr ON pr.eng_projeto_id = ep.id
LEFT JOIN vw_quantidade_retrabalhos vr ON vr.eng_projeto_id = ep.id
WHERE ep.ativo = true;

COMMENT ON VIEW vw_projetos_completo IS 'Visao consolidada com retrabalho calculado por horas e status derivado do percentual ponderado';
