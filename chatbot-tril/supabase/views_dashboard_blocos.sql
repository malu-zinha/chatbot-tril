-- =====================================================
-- VIEWS PARA DASHBOARD - 6 BLOCOS
-- Sistema de Gestão de Projetos via Chatbot WhatsApp
-- =====================================================
-- 
-- Este arquivo cria as views necessárias para os 6 blocos
-- do dashboard conforme documentação:
-- 
-- Bloco 1: Visão Geral da Produção
-- Bloco 2: Atrasos (por Engenheiro e por Área)
-- Bloco 3: Carga de Trabalho
-- Bloco 4: Execução Média por Engenheiro
-- Bloco 5: Retrabalho (por Engenheiro e por Área)
-- Bloco 6: Gráficos Recomendados
--
-- Execute APÓS: MASTER_SCHEMA_COMPLETO.sql e tabela_evandro_dono.sql
-- =====================================================

\echo '📊 Criando views para os 6 blocos do dashboard...'

-- =====================================================
-- VIEW AUXILIAR: vw_quantidade_retrabalhos
-- =====================================================
-- Contador de retrabalhos por atribuição
-- =====================================================

CREATE OR REPLACE VIEW vw_quantidade_retrabalhos AS
SELECT 
    eng_projeto_id,
    COUNT(*) FILTER (WHERE necessitou_retrabalho = true) AS quantidade_retrabalhos,
    COUNT(*) AS total_dias_registrados,
    ROUND(
        (COUNT(*) FILTER (WHERE necessitou_retrabalho = true)::NUMERIC / 
         NULLIF(COUNT(*), 0)::NUMERIC) * 100, 
        2
    ) AS percentual_retrabalhos
FROM retrabalho_projetos
GROUP BY eng_projeto_id;

COMMENT ON VIEW vw_quantidade_retrabalhos IS 'Contador automático de retrabalhos por atribuição';

-- =====================================================
-- BLOCO 1: VISÃO GERAL DA PRODUÇÃO
-- =====================================================
-- Total de Projetos, Projetos Concluídos, Projetos em Execução, 
-- Projetos Atrasados, % Concluído (média geral)
-- =====================================================

CREATE OR REPLACE VIEW vw_bloco1_visao_geral AS
SELECT 
    -- Total de Projetos
    COUNT(DISTINCT p.projeto_id) AS total_projetos,
    
    -- Projetos Concluídos
    COUNT(DISTINCT p.projeto_id) FILTER (
        WHERE NOT EXISTS (
            SELECT 1 FROM engenheiros_projetos ep2 
            WHERE ep2.projeto_id = p.projeto_id 
            AND ep2.data_conclusao IS NULL 
            AND ep2.ativo = true
        )
    ) AS projetos_concluidos,
    
    -- Projetos em Execução (tem pelo menos uma área ativa)
    COUNT(DISTINCT p.projeto_id) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM engenheiros_projetos ep2 
            WHERE ep2.projeto_id = p.projeto_id 
            AND ep2.data_conclusao IS NULL 
            AND ep2.ativo = true
        )
    ) AS projetos_em_execucao,
    
    -- Projetos Atrasados (tem pelo menos uma área atrasada)
    COUNT(DISTINCT p.projeto_id) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM engenheiros_projetos ep2 
            WHERE ep2.projeto_id = p.projeto_id 
            AND ep2.data_prevista < CURRENT_DATE
            AND ep2.data_conclusao IS NULL 
            AND ep2.ativo = true
        )
    ) AS projetos_atrasados,
    
    -- % Concluído (média geral de todas as áreas ativas)
    ROUND(AVG(ep.percentual_andamento), 2) AS percentual_concluido_medio,
    
    -- Total de Áreas
    COUNT(ep.id) AS total_areas,
    
    -- Áreas Concluídas
    COUNT(ep.id) FILTER (WHERE ep.data_conclusao IS NOT NULL) AS areas_concluidas,
    
    -- Áreas Ativas
    COUNT(ep.id) FILTER (WHERE ep.data_conclusao IS NULL AND ep.ativo = true) AS areas_ativas

FROM projetos p
LEFT JOIN engenheiros_projetos ep ON ep.projeto_id = p.projeto_id AND ep.ativo = true
WHERE p.ativo = true;

COMMENT ON VIEW vw_bloco1_visao_geral IS 'Bloco 1: Visão geral da produção - KPIs principais';

-- =====================================================
-- BLOCO 2.1: ATRASOS POR ENGENHEIRO
-- =====================================================
-- Engenheiro, Qtde projetos atrasados, Dias médios de atraso
-- =====================================================

CREATE OR REPLACE VIEW vw_bloco2_atrasos_engenheiro AS
SELECT 
    e.eng_id,
    e.nome AS engenheiro,
    
    -- Quantidade de projetos atrasados
    COUNT(DISTINCT ep.projeto_id) FILTER (
        WHERE ep.data_prevista < CURRENT_DATE 
        AND ep.data_conclusao IS NULL
    ) AS qtde_projetos_atrasados,
    
    -- Quantidade de áreas atrasadas
    COUNT(ep.id) FILTER (
        WHERE ep.data_prevista < CURRENT_DATE 
        AND ep.data_conclusao IS NULL
    ) AS qtde_areas_atrasadas,
    
    -- Dias médios de atraso
    ROUND(AVG(
        CASE 
            WHEN ep.data_prevista < CURRENT_DATE AND ep.data_conclusao IS NULL 
            THEN EXTRACT(DAY FROM (CURRENT_DATE - ep.data_prevista))
            ELSE NULL
        END
    ), 2) AS dias_medios_atraso,
    
    -- Atraso máximo
    MAX(
        CASE 
            WHEN ep.data_prevista < CURRENT_DATE AND ep.data_conclusao IS NULL 
            THEN EXTRACT(DAY FROM (CURRENT_DATE - ep.data_prevista))::INTEGER
            ELSE 0
        END
    ) AS atraso_maximo_dias

FROM engenheiros e
LEFT JOIN engenheiros_projetos ep ON ep.eng_id = e.eng_id AND ep.ativo = true
WHERE e.ativo = true
GROUP BY e.eng_id, e.nome
HAVING COUNT(ep.id) FILTER (
    WHERE ep.data_prevista < CURRENT_DATE 
    AND ep.data_conclusao IS NULL
) > 0
ORDER BY dias_medios_atraso DESC;

COMMENT ON VIEW vw_bloco2_atrasos_engenheiro IS 'Bloco 2.1: Atrasos por engenheiro';

-- =====================================================
-- BLOCO 2.2: ATRASOS POR ÁREA
-- =====================================================
-- Área, Qtde atrasados, Dias médio de atraso
-- =====================================================

CREATE OR REPLACE VIEW vw_bloco2_atrasos_area AS
SELECT 
    a.area_id,
    a.codigo AS area_codigo,
    a.descricao AS area,
    
    -- Quantidade atrasada
    COUNT(ep.id) FILTER (
        WHERE ep.data_prevista < CURRENT_DATE 
        AND ep.data_conclusao IS NULL
    ) AS qtde_atrasados,
    
    -- Dias médio de atraso
    ROUND(AVG(
        CASE 
            WHEN ep.data_prevista < CURRENT_DATE AND ep.data_conclusao IS NULL 
            THEN EXTRACT(DAY FROM (CURRENT_DATE - ep.data_prevista))
            ELSE NULL
        END
    ), 2) AS dias_medio_atraso,
    
    -- Total de projetos nesta área
    COUNT(DISTINCT ep.projeto_id) AS total_projetos_area

FROM areas a
LEFT JOIN engenheiros_projetos ep ON ep.area_id = a.area_id AND ep.ativo = true
WHERE a.ativo = true
GROUP BY a.area_id, a.codigo, a.descricao
HAVING COUNT(ep.id) FILTER (
    WHERE ep.data_prevista < CURRENT_DATE 
    AND ep.data_conclusao IS NULL
) > 0
ORDER BY dias_medio_atraso DESC;

COMMENT ON VIEW vw_bloco2_atrasos_area IS 'Bloco 2.2: Atrasos por área';

-- =====================================================
-- BLOCO 3: CARGA DE TRABALHO POR ENGENHEIRO
-- =====================================================
-- Engenheiro, Dias Estimados Totais, % Execução Média, Dias Restantes
-- =====================================================

CREATE OR REPLACE VIEW vw_bloco3_carga_trabalho AS
SELECT 
    e.eng_id,
    e.nome AS engenheiro,
    e.exclusivo,
    
    -- Dias Estimados Totais (soma dos tempos de trabalho das áreas ativas)
    COALESCE(SUM(ep.tempo_trabalho_dias) FILTER (
        WHERE ep.data_conclusao IS NULL AND ep.ativo = true
    ), 0) AS dias_estimados_totais,
    
    -- % Execução Média
    ROUND(AVG(ep.percentual_andamento) FILTER (
        WHERE ep.data_conclusao IS NULL AND ep.ativo = true
    ), 2) AS percentual_execucao_media,
    
    -- Dias Restantes (estimativa baseada no % faltante)
    ROUND(
        COALESCE(SUM(
            ep.tempo_trabalho_dias * (100 - ep.percentual_andamento) / 100.0
        ) FILTER (WHERE ep.data_conclusao IS NULL AND ep.ativo = true), 0)
    , 0) AS dias_restantes,
    
    -- Total de áreas ativas
    COUNT(ep.id) FILTER (WHERE ep.data_conclusao IS NULL AND ep.ativo = true) AS areas_ativas,
    
    -- Total de projetos ativos
    COUNT(DISTINCT ep.projeto_id) FILTER (WHERE ep.data_conclusao IS NULL AND ep.ativo = true) AS projetos_ativos

FROM engenheiros e
LEFT JOIN engenheiros_projetos ep ON ep.eng_id = e.eng_id
WHERE e.ativo = true
GROUP BY e.eng_id, e.nome, e.exclusivo
ORDER BY dias_restantes DESC;

COMMENT ON VIEW vw_bloco3_carga_trabalho IS 'Bloco 3: Carga de trabalho por engenheiro - dias estimados × concluídos';

-- =====================================================
-- BLOCO 4: EXECUÇÃO MÉDIA POR ENGENHEIRO
-- =====================================================
-- Engenheiro, Dias Estimados Totais, Dias Executados, % Execução Média
-- =====================================================

CREATE OR REPLACE VIEW vw_bloco4_execucao_media AS
SELECT 
    e.eng_id,
    e.nome AS engenheiro,
    
    -- Dias Estimados Totais
    COALESCE(SUM(a.tempo_trabalho_dias), 0) AS dias_estimados_totais,
    
    -- Dias Executados (estimativa: dias estimados × % andamento)
    ROUND(
        COALESCE(SUM(a.tempo_trabalho_dias * ep.percentual_andamento / 100.0), 0)
    , 0) AS dias_executados,
    
    -- % Execução Média
    ROUND(AVG(ep.percentual_andamento), 2) AS percentual_execucao_media,
    
    -- Dias Restantes
    ROUND(
        COALESCE(SUM(a.tempo_trabalho_dias * (100 - ep.percentual_andamento) / 100.0), 0)
    , 0) AS dias_restantes

FROM engenheiros e
LEFT JOIN engenheiros_projetos ep ON ep.eng_id = e.eng_id AND ep.ativo = true
LEFT JOIN areas a ON a.area_id = ep.area_id
WHERE e.ativo = true
GROUP BY e.eng_id, e.nome
ORDER BY percentual_execucao_media DESC;

COMMENT ON VIEW vw_bloco4_execucao_media IS 'Bloco 4: Execução média por engenheiro com dias restantes';

-- =====================================================
-- BLOCO 5.1: RETRABALHO POR ENGENHEIRO (MELHORADO)
-- =====================================================
-- Engenheiro, Qtde projetos atrasados, Retrabalho Médio (%)
-- =====================================================

CREATE OR REPLACE VIEW vw_bloco5_retrabalho_engenheiro AS
SELECT 
    e.eng_id,
    e.nome AS engenheiro,
    
    -- Qtde de áreas com retrabalho
    COUNT(DISTINCT r.eng_projeto_id) AS qtde_areas_retrabalho,
    
    -- Total de retrabalhos
    COUNT(r.id) FILTER (WHERE r.necessitou_retrabalho = true) AS total_retrabalhos,
    
    -- Retrabalho Médio (%)
    ROUND(
        AVG(vr.percentual_retrabalhos) FILTER (WHERE vr.quantidade_retrabalhos > 0)
    , 2) AS retrabalho_medio_percentual,
    
    -- Projetos afetados por retrabalho
    COUNT(DISTINCT ep.projeto_id) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM retrabalho_projetos r2 
            WHERE r2.eng_projeto_id = ep.id 
            AND r2.necessitou_retrabalho = true
        )
    ) AS projetos_com_retrabalho

FROM engenheiros e
LEFT JOIN engenheiros_projetos ep ON ep.eng_id = e.eng_id AND ep.ativo = true
LEFT JOIN retrabalho_projetos r ON r.eng_projeto_id = ep.id
LEFT JOIN vw_quantidade_retrabalhos vr ON vr.eng_projeto_id = ep.id
WHERE e.ativo = true
GROUP BY e.eng_id, e.nome
HAVING COUNT(r.id) FILTER (WHERE r.necessitou_retrabalho = true) > 0
ORDER BY total_retrabalhos DESC;

COMMENT ON VIEW vw_bloco5_retrabalho_engenheiro IS 'Bloco 5.1: Retrabalho por engenheiro';

-- =====================================================
-- BLOCO 5.2: RETRABALHO POR ÁREA
-- =====================================================
-- Área, Qtde atrasados, Atraso médio
-- =====================================================

CREATE OR REPLACE VIEW vw_bloco5_retrabalho_area AS
SELECT 
    a.area_id,
    a.codigo AS area_codigo,
    a.descricao AS area,
    
    -- Qtde de retrabalhos nesta área
    COUNT(r.id) FILTER (WHERE r.necessitou_retrabalho = true) AS qtde_retrabalhos,
    
    -- Projetos afetados
    COUNT(DISTINCT ep.projeto_id) AS projetos_afetados,
    
    -- % de áreas com retrabalho
    ROUND(
        (COUNT(DISTINCT r.eng_projeto_id)::NUMERIC / 
         NULLIF(COUNT(DISTINCT ep.id), 0)) * 100
    , 2) AS percentual_areas_retrabalho,
    
    -- Motivo mais comum
    (
        SELECT motivo_retrabalho 
        FROM retrabalho_projetos r2 
        JOIN engenheiros_projetos ep2 ON ep2.id = r2.eng_projeto_id
        WHERE ep2.area_id = a.area_id 
        AND r2.necessitou_retrabalho = true
        AND r2.motivo_retrabalho IS NOT NULL
        GROUP BY motivo_retrabalho 
        ORDER BY COUNT(*) DESC 
        LIMIT 1
    ) AS motivo_mais_comum

FROM areas a
LEFT JOIN engenheiros_projetos ep ON ep.area_id = a.area_id AND ep.ativo = true
LEFT JOIN retrabalho_projetos r ON r.eng_projeto_id = ep.id
WHERE a.ativo = true
GROUP BY a.area_id, a.codigo, a.descricao
HAVING COUNT(r.id) FILTER (WHERE r.necessitou_retrabalho = true) > 0
ORDER BY qtde_retrabalhos DESC;

COMMENT ON VIEW vw_bloco5_retrabalho_area IS 'Bloco 5.2: Retrabalho por área';

-- =====================================================
-- BLOCO 6: GRÁFICOS RECOMENDADOS
-- =====================================================

-- =====================================================
-- GRÁFICO 1: Projetos por Status (Pizza dinâmica)
-- =====================================================

CREATE OR REPLACE VIEW vw_grafico_projetos_status AS
SELECT 
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM engenheiros_projetos ep2 
            WHERE ep2.projeto_id = p.projeto_id 
            AND ep2.data_conclusao IS NULL 
            AND ep2.ativo = true
        ) THEN 'Concluído'
        WHEN EXISTS (
            SELECT 1 FROM engenheiros_projetos ep2 
            WHERE ep2.projeto_id = p.projeto_id 
            AND ep2.data_prevista < CURRENT_DATE
            AND ep2.data_conclusao IS NULL 
            AND ep2.ativo = true
        ) THEN 'Atrasado'
        WHEN EXISTS (
            SELECT 1 FROM engenheiros_projetos ep2 
            WHERE ep2.projeto_id = p.projeto_id 
            AND ep2.data_inicio <= CURRENT_DATE
            AND ep2.data_conclusao IS NULL 
            AND ep2.ativo = true
        ) THEN 'Em Andamento'
        ELSE 'Aguardando'
    END AS status,
    
    COUNT(DISTINCT p.projeto_id) AS quantidade,
    
    ROUND(
        (COUNT(DISTINCT p.projeto_id)::NUMERIC / 
         (SELECT COUNT(DISTINCT projeto_id) FROM projetos WHERE ativo = true)) * 100
    , 2) AS percentual

FROM projetos p
WHERE p.ativo = true
GROUP BY 
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM engenheiros_projetos ep2 
            WHERE ep2.projeto_id = p.projeto_id 
            AND ep2.data_conclusao IS NULL 
            AND ep2.ativo = true
        ) THEN 'Concluído'
        WHEN EXISTS (
            SELECT 1 FROM engenheiros_projetos ep2 
            WHERE ep2.projeto_id = p.projeto_id 
            AND ep2.data_prevista < CURRENT_DATE
            AND ep2.data_conclusao IS NULL 
            AND ep2.ativo = true
        ) THEN 'Atrasado'
        WHEN EXISTS (
            SELECT 1 FROM engenheiros_projetos ep2 
            WHERE ep2.projeto_id = p.projeto_id 
            AND ep2.data_inicio <= CURRENT_DATE
            AND ep2.data_conclusao IS NULL 
            AND ep2.ativo = true
        ) THEN 'Em Andamento'
        ELSE 'Aguardando'
    END
ORDER BY quantidade DESC;

COMMENT ON VIEW vw_grafico_projetos_status IS 'Gráfico 1: Projetos por Status (Pizza)';

-- =====================================================
-- GRÁFICO 2: Atrasos por Engenheiro (Colunas horizontais)
-- =====================================================

CREATE OR REPLACE VIEW vw_grafico_atrasos_engenheiro AS
SELECT 
    e.nome AS engenheiro,
    COUNT(ep.id) FILTER (
        WHERE ep.data_prevista < CURRENT_DATE 
        AND ep.data_conclusao IS NULL
    ) AS qtde_atrasados
FROM engenheiros e
LEFT JOIN engenheiros_projetos ep ON ep.eng_id = e.eng_id AND ep.ativo = true
WHERE e.ativo = true
GROUP BY e.eng_id, e.nome
ORDER BY qtde_atrasados DESC;

COMMENT ON VIEW vw_grafico_atrasos_engenheiro IS 'Gráfico 2: Atrasos por Engenheiro (Colunas)';

-- =====================================================
-- GRÁFICO 3: Carga de Trabalho por Engenheiro (Barras empilhadas)
-- =====================================================

CREATE OR REPLACE VIEW vw_grafico_carga_trabalho AS
SELECT 
    e.nome AS engenheiro,
    ROUND(
        COALESCE(SUM(ep.tempo_trabalho_dias * ep.percentual_andamento / 100.0) FILTER (
            WHERE ep.data_conclusao IS NULL AND ep.ativo = true
        ), 0)
    , 0) AS dias_concluidos,
    ROUND(
        COALESCE(SUM(ep.tempo_trabalho_dias * (100 - ep.percentual_andamento) / 100.0) FILTER (
            WHERE ep.data_conclusao IS NULL AND ep.ativo = true
        ), 0)
    , 0) AS dias_restantes
FROM engenheiros e
LEFT JOIN engenheiros_projetos ep ON ep.eng_id = e.eng_id
WHERE e.ativo = true
GROUP BY e.eng_id, e.nome
ORDER BY (dias_concluidos + dias_restantes) DESC;

COMMENT ON VIEW vw_grafico_carga_trabalho IS 'Gráfico 3: Carga de Trabalho por Engenheiro (Barras empilhadas: Dias concluídos × Dias restantes)';

-- =====================================================
-- GRÁFICO 4: Retrabalho por Área (Colunas)
-- =====================================================

CREATE OR REPLACE VIEW vw_grafico_retrabalho_area AS
SELECT 
    a.descricao AS area,
    COUNT(r.id) FILTER (WHERE r.necessitou_retrabalho = true) AS qtde_retrabalhos
FROM areas a
LEFT JOIN engenheiros_projetos ep ON ep.area_id = a.area_id AND ep.ativo = true
LEFT JOIN retrabalho_projetos r ON r.eng_projeto_id = ep.id
WHERE a.ativo = true
GROUP BY a.area_id, a.descricao
ORDER BY qtde_retrabalhos DESC;

COMMENT ON VIEW vw_grafico_retrabalho_area IS 'Gráfico 4: Retrabalho por Área (Colunas)';

-- =====================================================
\echo '✅ Views dos 6 blocos criadas com sucesso!'
\echo ''
\echo '📊 BLOCOS DISPONÍVEIS:'
\echo '   Bloco 1: vw_bloco1_visao_geral'
\echo '   Bloco 2.1: vw_bloco2_atrasos_engenheiro'
\echo '   Bloco 2.2: vw_bloco2_atrasos_area'
\echo '   Bloco 3: vw_bloco3_carga_trabalho'
\echo '   Bloco 4: vw_bloco4_execucao_media'
\echo '   Bloco 5.1: vw_bloco5_retrabalho_engenheiro'
\echo '   Bloco 5.2: vw_bloco5_retrabalho_area'
\echo ''
\echo '📈 GRÁFICOS DISPONÍVEIS:'
\echo '   Gráfico 1: vw_grafico_projetos_status'
\echo '   Gráfico 2: vw_grafico_atrasos_engenheiro'
\echo '   Gráfico 3: vw_grafico_carga_trabalho'
\echo '   Gráfico 4: vw_grafico_retrabalho_area'
\echo ''
\echo '🎯 Para testar, execute: SELECT * FROM vw_bloco1_visao_geral;'
-- =====================================================

