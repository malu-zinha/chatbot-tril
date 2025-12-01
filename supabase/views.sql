-- =====================================================
-- VIEWS - AGREGAÇÃO DE DADOS PARA DASHBOARDS
-- =====================================================
-- Responsabilidade: Iza (Banco de Dados)
-- 
-- Este arquivo define views otimizadas para consultas
-- agregadas, especialmente para a planilha do CEO
-- =====================================================

-- =====================================================
-- VIEW: view_progresso_geral
-- =====================================================
-- Agrega dados de todos os projetos para visualização do CEO
-- Mostra o progresso total, retrabalhos e status de cada projeto
-- =====================================================

CREATE OR REPLACE VIEW view_progresso_geral AS
SELECT 
    -- Dados do Projeto
    p.id AS projeto_id,
    p.codigo AS projeto_codigo,
    p.nome AS projeto_nome,
    p.cliente,
    p.area,
    p.tipo_obra,
    p.status,
    p.percentual_total,
    p.data_inicio,
    p.data_previsao_termino,
    
    -- Dados do Engenheiro
    e.id AS engenheiro_id,
    e.nome AS engenheiro_nome,
    e.whatsapp AS engenheiro_whatsapp,
    
    -- Estatísticas de Execução
    COUNT(DISTINCT ed.id) AS total_dias_registrados,
    MAX(ed.data) AS ultima_atualizacao,
    AVG(ed.percentual_realizado) AS media_percentual_diario,
    SUM(ed.percentual_realizado) AS soma_percentual_realizado,
    
    -- Comparação Previsto vs Realizado
    AVG(CASE 
        WHEN ed.percentual_previsto IS NOT NULL 
        THEN ed.percentual_realizado - ed.percentual_previsto 
        ELSE NULL 
    END) AS media_diferenca_previsto_realizado,
    
    -- Estatísticas de Retrabalho
    COUNT(DISTINCT r.id) AS total_retrabalhos,
    COALESCE(SUM(r.impacto_percentual), 0) AS soma_impacto_retrabalho,
    COALESCE(SUM(r.tempo_perdido_horas), 0) AS soma_horas_perdidas,
    
    -- Categorização de Retrabalhos (últimos 3 motivos)
    STRING_AGG(DISTINCT r.motivo, ', ' ORDER BY r.motivo) AS motivos_retrabalho,
    
    -- Status de Atividade
    CASE 
        WHEN MAX(ed.data) >= CURRENT_DATE - INTERVAL '3 days' THEN 'Ativo'
        WHEN MAX(ed.data) >= CURRENT_DATE - INTERVAL '7 days' THEN 'Pouco Ativo'
        WHEN MAX(ed.data) IS NULL THEN 'Sem Registro'
        ELSE 'Inativo'
    END AS status_atividade,
    
    -- Indicadores de Performance
    CASE 
        WHEN p.percentual_total >= 100 THEN 'Concluído'
        WHEN p.percentual_total >= 75 THEN 'Em Fase Final'
        WHEN p.percentual_total >= 50 THEN 'Em Andamento'
        WHEN p.percentual_total >= 25 THEN 'Em Início'
        ELSE 'Iniciando'
    END AS fase_projeto,
    
    -- Metadados
    p.created_at AS projeto_criado_em,
    p.updated_at AS projeto_atualizado_em

FROM projetos p
INNER JOIN engenheiros e ON p.engenheiro_id = e.id
LEFT JOIN execucao_diaria ed ON p.id = ed.projeto_id
LEFT JOIN retrabalhos r ON p.id = r.projeto_id

WHERE p.ativo = true

GROUP BY 
    p.id, p.codigo, p.nome, p.cliente, p.area, p.tipo_obra, 
    p.status, p.percentual_total, p.data_inicio, p.data_previsao_termino,
    e.id, e.nome, e.whatsapp,
    p.created_at, p.updated_at

ORDER BY 
    p.percentual_total DESC, 
    p.updated_at DESC;

-- Comentários descritivos
COMMENT ON VIEW view_progresso_geral IS 'Visão consolidada de todos os projetos para dashboard do CEO';


-- =====================================================
-- VIEW: view_progresso_por_engenheiro
-- =====================================================
-- Agrega projetos por engenheiro para análise de performance
-- =====================================================

CREATE OR REPLACE VIEW view_progresso_por_engenheiro AS
SELECT 
    -- Dados do Engenheiro
    e.id AS engenheiro_id,
    e.nome AS engenheiro_nome,
    e.whatsapp,
    e.email,
    
    -- Estatísticas de Projetos
    COUNT(DISTINCT p.id) AS total_projetos,
    COUNT(DISTINCT CASE WHEN p.status = 'Em Execução' THEN p.id END) AS projetos_em_execucao,
    COUNT(DISTINCT CASE WHEN p.status = 'Concluído' THEN p.id END) AS projetos_concluidos,
    COUNT(DISTINCT CASE WHEN p.status LIKE '%Parado%' THEN p.id END) AS projetos_parados,
    
    -- Performance Geral
    AVG(p.percentual_total) AS media_percentual_projetos,
    SUM(p.percentual_total) AS soma_percentual_total,
    
    -- Estatísticas de Execução
    COUNT(DISTINCT ed.id) AS total_execucoes_registradas,
    MAX(ed.data) AS ultima_execucao_registrada,
    
    -- Estatísticas de Retrabalho
    COUNT(DISTINCT r.id) AS total_retrabalhos,
    COALESCE(SUM(r.impacto_percentual), 0) AS impacto_total_retrabalho,
    
    -- Indicador de Atividade
    CASE 
        WHEN MAX(ed.data) >= CURRENT_DATE - INTERVAL '3 days' THEN 'Ativo'
        WHEN MAX(ed.data) >= CURRENT_DATE - INTERVAL '7 days' THEN 'Pouco Ativo'
        WHEN MAX(ed.data) IS NULL THEN 'Sem Registro'
        ELSE 'Inativo'
    END AS status_atividade

FROM engenheiros e
LEFT JOIN projetos p ON e.id = p.engenheiro_id AND p.ativo = true
LEFT JOIN execucao_diaria ed ON p.id = ed.projeto_id
LEFT JOIN retrabalhos r ON p.id = r.projeto_id

WHERE e.ativo = true

GROUP BY e.id, e.nome, e.whatsapp, e.email

ORDER BY total_projetos DESC, media_percentual_projetos DESC;

-- Comentários descritivos
COMMENT ON VIEW view_progresso_por_engenheiro IS 'Visão consolidada por engenheiro para análise de performance';


-- =====================================================
-- VIEW: view_retrabalhos_resumo
-- =====================================================
-- Análise de retrabalhos por motivo/categoria
-- =====================================================

CREATE OR REPLACE VIEW view_retrabalhos_resumo AS
SELECT 
    -- Classificação
    r.motivo,
    r.categoria,
    
    -- Estatísticas
    COUNT(*) AS total_ocorrencias,
    COUNT(DISTINCT r.projeto_id) AS projetos_afetados,
    COALESCE(SUM(r.impacto_percentual), 0) AS impacto_total_percentual,
    COALESCE(SUM(r.tempo_perdido_horas), 0) AS tempo_total_perdido_horas,
    COALESCE(AVG(r.impacto_percentual), 0) AS impacto_medio_percentual,
    COALESCE(AVG(r.tempo_perdido_horas), 0) AS tempo_medio_perdido_horas,
    
    -- Status de Resolução
    COUNT(CASE WHEN r.resolvido = true THEN 1 END) AS total_resolvidos,
    COUNT(CASE WHEN r.resolvido = false THEN 1 END) AS total_pendentes,
    
    -- Temporal
    MIN(r.data) AS primeira_ocorrencia,
    MAX(r.data) AS ultima_ocorrencia,
    
    -- Engenheiros Afetados
    COUNT(DISTINCT p.engenheiro_id) AS engenheiros_afetados

FROM retrabalhos r
INNER JOIN projetos p ON r.projeto_id = p.id

GROUP BY r.motivo, r.categoria

ORDER BY total_ocorrencias DESC, impacto_total_percentual DESC;

-- Comentários descritivos
COMMENT ON VIEW view_retrabalhos_resumo IS 'Análise agregada de retrabalhos por motivo e categoria';


-- =====================================================
-- VIEW: view_execucao_semanal
-- =====================================================
-- Análise de execução agregada por semana
-- Útil para análise de tendências e planejamento
-- =====================================================

CREATE OR REPLACE VIEW view_execucao_semanal AS
SELECT 
    -- Identificação Temporal
    DATE_TRUNC('week', ed.data) AS semana,
    EXTRACT(YEAR FROM ed.data) AS ano,
    EXTRACT(WEEK FROM ed.data) AS numero_semana,
    
    -- Dados do Projeto
    p.id AS projeto_id,
    p.codigo AS projeto_codigo,
    p.nome AS projeto_nome,
    
    -- Estatísticas da Semana
    COUNT(*) AS dias_trabalhados,
    AVG(ed.percentual_previsto) AS media_previsto,
    AVG(ed.percentual_realizado) AS media_realizado,
    SUM(ed.percentual_realizado) AS total_realizado_semana,
    
    -- Performance
    AVG(ed.percentual_realizado - ed.percentual_previsto) AS media_variacao,
    
    -- Engenheiro
    e.nome AS engenheiro_nome

FROM execucao_diaria ed
INNER JOIN projetos p ON ed.projeto_id = p.id
INNER JOIN engenheiros e ON p.engenheiro_id = e.id

GROUP BY 
    DATE_TRUNC('week', ed.data),
    EXTRACT(YEAR FROM ed.data),
    EXTRACT(WEEK FROM ed.data),
    p.id, p.codigo, p.nome,
    e.nome

ORDER BY semana DESC, projeto_codigo;

-- Comentários descritivos
COMMENT ON VIEW view_execucao_semanal IS 'Análise de execução agregada por semana para tendências';


-- =====================================================
-- VIEW: view_dashboard_ceo (Simplificada para Planilha)
-- =====================================================
-- View otimizada especificamente para exportação à planilha do CEO
-- Campos simples e diretos
-- =====================================================

CREATE OR REPLACE VIEW view_dashboard_ceo AS
SELECT 
    p.codigo AS "Código Projeto",
    p.nome AS "Nome Projeto",
    p.cliente AS "Cliente",
    e.nome AS "Engenheiro",
    p.area AS "Área",
    p.tipo_obra AS "Tipo Obra",
    p.status AS "Status",
    ROUND(p.percentual_total, 2) AS "% Concluído",
    p.data_inicio AS "Data Início",
    p.data_previsao_termino AS "Previsão Término",
    MAX(ed.data) AS "Última Atualização",
    COUNT(DISTINCT r.id) AS "Total Retrabalhos",
    ROUND(COALESCE(SUM(r.impacto_percentual), 0), 2) AS "Impacto Retrabalho (%)",
    CASE 
        WHEN MAX(ed.data) >= CURRENT_DATE - INTERVAL '3 days' THEN 'Ativo'
        WHEN MAX(ed.data) >= CURRENT_DATE - INTERVAL '7 days' THEN 'Pouco Ativo'
        ELSE 'Inativo'
    END AS "Situação"

FROM projetos p
INNER JOIN engenheiros e ON p.engenheiro_id = e.id
LEFT JOIN execucao_diaria ed ON p.id = ed.projeto_id
LEFT JOIN retrabalhos r ON p.id = r.projeto_id

WHERE p.ativo = true

GROUP BY 
    p.id, p.codigo, p.nome, p.cliente, p.area, p.tipo_obra,
    p.status, p.percentual_total, p.data_inicio, p.data_previsao_termino,
    e.nome

ORDER BY p.percentual_total DESC;

-- Comentários descritivos
COMMENT ON VIEW view_dashboard_ceo IS 'View simplificada para exportação direta à planilha do CEO';


-- =====================================================
-- PERMISSÕES DAS VIEWS
-- =====================================================
-- Garantir que as views respeitem as políticas RLS
-- =====================================================

-- Views herdam automaticamente as permissões das tabelas base
-- CEO e Admin terão acesso completo via suas políticas RLS
-- Engenheiros verão apenas seus dados através das views
