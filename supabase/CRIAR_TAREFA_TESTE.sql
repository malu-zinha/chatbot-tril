-- =====================================================
-- CRIAR TAREFA DE TESTE PARA ENGENHEIRO 4
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- Primeiro, verificar o que existe
SELECT 'Verificando dados existentes...' as info;

-- Ver engenheiro
SELECT eng_id, nome, telefone FROM engenheiros 
WHERE telefone = '+5583991977942';

-- Ver projetos disponíveis
SELECT projeto_id, codigo_projeto, cliente FROM projetos WHERE ativo = true LIMIT 5;

-- Ver áreas disponíveis
SELECT area_id, codigo, descricao FROM areas WHERE ativo = true LIMIT 5;

-- Ver status disponíveis
SELECT status_id, codigo, descricao FROM status_codes WHERE ativo = true;

-- =====================================================
-- AGORA INSERIR A TAREFA
-- =====================================================

-- Opção 1: Usar qualquer projeto e área que existir
INSERT INTO engenheiros_projetos (
  eng_id,
  projeto_id,
  area_id,
  data_inicio,
  data_prevista,
  status_id,
  percentual_andamento,
  tempo_trabalho_dias,
  observacoes,
  ativo
)
SELECT 
  e.eng_id,
  p.projeto_id,
  a.area_id,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  s.status_id,
  0,
  30,
  'Tarefa de teste para validar fluxo do engenheiro',
  true
FROM engenheiros e
CROSS JOIN (SELECT projeto_id FROM projetos WHERE ativo = true LIMIT 1) p
CROSS JOIN (SELECT area_id FROM areas WHERE ativo = true LIMIT 1) a
CROSS JOIN (SELECT status_id FROM status_codes WHERE codigo = 'AGUARDANDO_INICIO' LIMIT 1) s
WHERE e.telefone = '+5583991977942'
LIMIT 1
ON CONFLICT (eng_id, projeto_id, area_id) DO UPDATE
SET 
  data_inicio = EXCLUDED.data_inicio,
  data_prevista = EXCLUDED.data_prevista,
  status_id = EXCLUDED.status_id,
  observacoes = EXCLUDED.observacoes,
  ativo = true,
  updated_at = CURRENT_TIMESTAMP;

-- Verificar se foi criado
SELECT 'Tarefa criada! Verificando...' as info;

SELECT 
  ep.id as eng_projeto_id,
  e.nome as engenheiro,
  p.codigo_projeto,
  p.cliente,
  a.descricao as area,
  s.descricao as status,
  ep.percentual_andamento,
  ep.data_inicio,
  ep.data_prevista
FROM engenheiros_projetos ep
JOIN engenheiros e ON e.eng_id = ep.eng_id
JOIN projetos p ON p.projeto_id = ep.projeto_id
JOIN areas a ON a.area_id = ep.area_id
LEFT JOIN status_codes s ON s.status_id = ep.status_id
WHERE e.telefone = '+5583991977942'
  AND ep.ativo = true;

-- Se não aparecer nada acima, criar projeto e área genéricos
DO $$
DECLARE
  v_projeto_id UUID;
  v_area_id UUID;
  v_eng_id UUID;
  v_status_id INTEGER;
BEGIN
  -- Buscar ou criar projeto de teste
  SELECT projeto_id INTO v_projeto_id
  FROM projetos 
  WHERE codigo_projeto = 'PRJ-TESTE'
  LIMIT 1;
  
  IF v_projeto_id IS NULL THEN
    INSERT INTO projetos (codigo_projeto, cliente, descricao, ativo)
    VALUES ('PRJ-TESTE', 'Cliente Teste', 'Projeto para testes do sistema', true)
    RETURNING projeto_id INTO v_projeto_id;
    
    RAISE NOTICE 'Projeto de teste criado: %', v_projeto_id;
  END IF;
  
  -- Buscar primeira área disponível
  SELECT area_id INTO v_area_id
  FROM areas 
  WHERE ativo = true
  LIMIT 1;
  
  -- Buscar engenheiro
  SELECT eng_id INTO v_eng_id
  FROM engenheiros
  WHERE telefone = '+5583991977942'
  LIMIT 1;
  
  -- Buscar status
  SELECT status_id INTO v_status_id
  FROM status_codes
  WHERE codigo = 'AGUARDANDO_INICIO'
  LIMIT 1;
  
  -- Criar atribuição
  IF v_eng_id IS NOT NULL AND v_projeto_id IS NOT NULL AND v_area_id IS NOT NULL THEN
    INSERT INTO engenheiros_projetos (
      eng_id,
      projeto_id,
      area_id,
      data_inicio,
      data_prevista,
      status_id,
      percentual_andamento,
      tempo_trabalho_dias,
      observacoes,
      ativo
    )
    VALUES (
      v_eng_id,
      v_projeto_id,
      v_area_id,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      v_status_id,
      0,
      30,
      'Tarefa de teste criada automaticamente',
      true
    )
    ON CONFLICT (eng_id, projeto_id, area_id) DO UPDATE
    SET 
      ativo = true,
      updated_at = CURRENT_TIMESTAMP;
    
    RAISE NOTICE 'Atribuição criada com sucesso!';
  END IF;
END $$;

-- Verificação final
SELECT 'RESULTADO FINAL:' as info;

SELECT 
  ep.id as eng_projeto_id,
  e.nome as engenheiro,
  e.telefone,
  p.codigo_projeto,
  p.cliente,
  a.descricao as area,
  s.descricao as status,
  ep.percentual_andamento || '%' as progresso,
  ep.data_inicio,
  ep.data_prevista,
  ep.ativo
FROM engenheiros_projetos ep
JOIN engenheiros e ON e.eng_id = ep.eng_id
JOIN projetos p ON p.projeto_id = ep.projeto_id
JOIN areas a ON a.area_id = ep.area_id
LEFT JOIN status_codes s ON s.status_id = ep.status_id
WHERE e.telefone = '+5583991977942'
  AND ep.ativo = true;

