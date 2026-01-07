# 📊 Nova Estrutura do Banco de Dados

## Visão Geral

Este documento descreve a nova estrutura do banco de dados PostgreSQL (Supabase) para o sistema de gestão de projetos de engenharia.

## 🏗️ Estrutura das Tabelas

### 1. **engenheiros**
Cadastro base de engenheiros com informações editáveis.

**Campos:**
- `eng_id` (UUID, PK) - ID único do engenheiro (gerado automaticamente)
- `nome` (TEXT) - Nome do engenheiro (editável pelo próprio)
- `exclusivo` (BOOLEAN) - TRUE se trabalha só na empresa, FALSE se trabalha em outros lugares
- `ativo` (BOOLEAN) - Se o engenheiro está ativo no sistema
- `created_at`, `updated_at` - Timestamps automáticos

**Funcionalidades:**
- ✅ Adicionar novos engenheiros
- ✅ Remover engenheiros (soft delete via `ativo = false`)
- ✅ Engenheiro pode editar seu próprio nome
- ✅ Engenheiro pode alterar status de exclusividade

---

### 2. **areas**
Decodificação de áreas de trabalho.

**Campos:**
- `area_id` (SERIAL, PK) - ID único da área
- `codigo` (TEXT, UNIQUE) - Código da área (ex: ELETRICO, HIDRAULICO)
- `descricao` (TEXT) - Descrição completa
- `tempo_trabalho_dias` (INTEGER) - Tempo estimado em dias
- `ativo` (BOOLEAN)

**Áreas Pré-cadastradas:**
- Elétrico (15 dias)
- Hidráulico (12 dias)
- Estrutural (20 dias)
- Climatização (10 dias)
- Prevenção e Combate a Incêndio (8 dias)
- Gás (5 dias)
- Telefonia e Dados (7 dias)
- SPDA - Para-raios (5 dias)
- Automação (10 dias)

---

### 3. **status_codes**
Decodificação de status/etapas dos projetos.

**Campos:**
- `status_id` (SERIAL, PK)
- `codigo` (TEXT, UNIQUE)
- `descricao` (TEXT)
- `ordem` (INTEGER) - Ordem sequencial da etapa
- `percentual_base` (NUMERIC) - Percentual de conclusão associado

**Status Pré-cadastrados (11 etapas):**
1. Aguardando Início (0%)
2. Em Planejamento (5%)
3. Recebimento da Documentação (10%)
4. Serviços Preliminares e Infraestrutura (20%)
5. Instalações de Primeira Fase - Grosso (35%)
6. Detalhamento e Instalações (55%)
7. Instalações de Segunda Fase - Acabamento (70%)
8. Revisão Interna (75%)
9. Enviado ao Cliente (80%)
10. Aprovado Cliente/Concessionária (90%)
11. Concluído (100%)

---

### 4. **projetos**
Informações base dos projetos.

**Campos:**
- `projeto_id` (UUID, PK) - ID único do projeto
- `codigo_projeto` (TEXT, UNIQUE) - Código identificador (ex: PRJ-001)
- `cliente` (TEXT) - Nome do cliente (preenchido manualmente)
- `descricao` (TEXT) - Descrição do projeto
- `ativo` (BOOLEAN)

---

### 5. **engenheiros_projetos** ⭐ (Tabela Principal)
Relacionamento N:N entre engenheiros, projetos e áreas.

**Campos:**
- `id` (UUID, PK)
- `eng_id` (UUID, FK → engenheiros)
- `projeto_id` (UUID, FK → projetos)
- `area_id` (INTEGER, FK → areas)
- `data_inicio` (DATE) - Preenchido manualmente pelo engenheiro
- `data_prevista` (DATE) - Atualizada diariamente
- `data_conclusao` (DATE)
- `status_id` (INTEGER, FK → status_codes) - Preenchido manualmente
- `percentual_andamento` (NUMERIC) - **Calculado automaticamente** baseado no status
- `tempo_trabalho_dias` (INTEGER) - **Calculado automaticamente** baseado na área
- `observacoes` (TEXT)
- `ativo` (BOOLEAN)

**Regras:**
- ✅ Um engenheiro pode ter **múltiplas áreas** no mesmo projeto
- ✅ Um engenheiro pode ter **múltiplos projetos**
- ✅ Cada combinação `eng_id + projeto_id + area_id` é única
- ✅ Quando uma área é atribuída, `tempo_trabalho_dias` é preenchido automaticamente
- ✅ Quando o status é atualizado, `percentual_andamento` é calculado automaticamente

**Exemplo:**
```
Engenheiro João (eng_id = 1) no Projeto A (projeto_id = 10):
- Área: Elétrico → tempo_trabalho = 15 dias (automático)
- Área: Hidráulico → tempo_trabalho = 12 dias (automático)

Total: 2 registros na tabela engenheiros_projetos
```

---

### 6. **projetos_previsao**
Histórico de previsões para acompanhamento.

**Campos:**
- `eng_projeto_id` (UUID, FK → engenheiros_projetos)
- `data_previsao` (DATE)
- `status_id` (INTEGER)
- `percentual` (NUMERIC)
- `observacao` (TEXT)

**Uso:** Registrar histórico de mudanças de previsão ao longo do tempo.

---

### 7. **retrabalho_projetos**
Registro de retrabalhos.

**Campos:**
- `eng_projeto_id` (UUID, FK → engenheiros_projetos)
- `necessitou_retrabalho` (BOOLEAN)
- `motivo` (TEXT)
- `descricao` (TEXT)
- `data_retrabalho` (DATE)
- `status_id` (INTEGER)

---

### 8. **prazos**
Controle de prazos internos e do cliente.

**Campos:**
- `eng_projeto_id` (UUID, FK → engenheiros_projetos)
- `data_inicio` (DATE)
- `data_cliente` (DATE)
- `prazo_interno_dias` (INTEGER)
- `prazo_cliente_dias` (INTEGER)

---

### 9. **execucao**
Histórico de execução das etapas.

**Campos:**
- `eng_projeto_id` (UUID, FK → engenheiros_projetos)
- `etapa_atual` (INTEGER)
- `etapa_total` (INTEGER)
- `percentual` (NUMERIC)
- `observacoes` (TEXT)

---

## 🔄 Automações (Triggers)

### 1. **Calcular Tempo de Trabalho Automaticamente**
```sql
TRIGGER: trg_calcular_tempo_trabalho
QUANDO: INSERT ou UPDATE de area_id em engenheiros_projetos
AÇÃO: Busca tempo_trabalho_dias da tabela areas e preenche automaticamente
```

**Exemplo:**
```sql
-- Engenheiro atribui área Elétrico
INSERT INTO engenheiros_projetos (eng_id, projeto_id, area_id, data_inicio)
VALUES ('uuid-eng', 'uuid-proj', 1, '2025-01-01');

-- Resultado automático:
-- tempo_trabalho_dias = 15 (buscado da tabela areas)
```

### 2. **Calcular Percentual Automaticamente**
```sql
TRIGGER: trg_calcular_percentual_status
QUANDO: INSERT ou UPDATE de status_id em engenheiros_projetos
AÇÃO: Busca percentual_base da tabela status_codes e atualiza percentual_andamento
```

**Exemplo:**
```sql
-- Engenheiro atualiza status para "Instalações de Primeira Fase"
UPDATE engenheiros_projetos 
SET status_id = 5 
WHERE id = 'uuid-atribuicao';

-- Resultado automático:
-- percentual_andamento = 35.00 (buscado da tabela status_codes)
```

### 3. **Atualizar Timestamps**
```sql
TRIGGER: trg_*_updated_at
QUANDO: UPDATE nas tabelas principais
AÇÃO: Atualiza automaticamente o campo updated_at
```

---

## 📊 Views Disponíveis

### 1. **vw_engenheiros_projetos**
Visão consolidada de engenheiros, projetos e áreas.

**Retorna:**
- Informações do engenheiro (nome, exclusividade)
- Informações do projeto (código, cliente)
- Informações da área (código, descrição)
- Status atual (código, descrição, percentual)
- Datas e prazos
- Tempo de trabalho calculado

**Uso:**
```sql
SELECT * FROM vw_engenheiros_projetos 
WHERE engenheiro_nome = 'João Silva';
```

### 2. **vw_resumo_engenheiros**
Estatísticas por engenheiro.

**Retorna:**
- Total de projetos
- Total de atribuições (áreas)
- Média de percentual de andamento
- Projetos ativos

**Uso:**
```sql
SELECT * FROM vw_resumo_engenheiros 
ORDER BY total_projetos DESC;
```

---

## 🎯 Fluxo de Trabalho

### 1. Cadastrar Novo Engenheiro
```sql
INSERT INTO engenheiros (nome, exclusivo) 
VALUES ('Maria Santos', true);
```

### 2. Cadastrar Novo Projeto
```sql
INSERT INTO projetos (codigo_projeto, cliente, descricao) 
VALUES ('PRJ-2025-001', 'Cliente XYZ', 'Edifício Residencial');
```

### 3. Atribuir Engenheiro ao Projeto com Área
```sql
INSERT INTO engenheiros_projetos (
    eng_id, 
    projeto_id, 
    area_id, 
    data_inicio, 
    data_prevista,
    status_id
) VALUES (
    'uuid-engenheiro',
    'uuid-projeto',
    1, -- Elétrico
    '2025-01-15',
    '2025-02-15',
    4 -- Serviços Preliminares
);

-- Automático:
-- tempo_trabalho_dias = 15
-- percentual_andamento = 20.00
```

### 4. Atribuir Múltiplas Áreas ao Mesmo Engenheiro/Projeto
```sql
-- Área 1: Elétrico
INSERT INTO engenheiros_projetos (...) VALUES (..., 1, ...);

-- Área 2: Hidráulico
INSERT INTO engenheiros_projetos (...) VALUES (..., 2, ...);

-- Resultado: 2 registros separados, cada um com seu tempo_trabalho calculado
```

### 5. Atualizar Status (atualiza percentual automaticamente)
```sql
UPDATE engenheiros_projetos 
SET status_id = 7 -- Instalações de Segunda Fase
WHERE id = 'uuid-atribuicao';

-- Automático: percentual_andamento = 70.00
```

### 6. Atualizar Previsão Diária
```sql
UPDATE engenheiros_projetos 
SET data_prevista = '2025-02-20'
WHERE id = 'uuid-atribuicao';
```

---

## 🔐 Segurança (RLS - Row Level Security)

**A implementar:**
- Engenheiros só podem ver/editar seus próprios projetos
- Gestores podem ver todos os projetos
- Engenheiros podem editar apenas seu nome e exclusividade

---

## 📈 Consultas Úteis

### Ver todos os projetos de um engenheiro
```sql
SELECT * FROM vw_engenheiros_projetos 
WHERE eng_id = 'uuid-engenheiro'
ORDER BY data_inicio DESC;
```

### Ver estatísticas gerais
```sql
SELECT * FROM vw_resumo_engenheiros;
```

### Ver projetos com retrabalho
```sql
SELECT ep.*, r.*
FROM engenheiros_projetos ep
JOIN retrabalho_projetos r ON r.eng_projeto_id = ep.id
WHERE r.necessitou_retrabalho = true;
```

### Calcular dias de atraso
```sql
SELECT 
    ep.*,
    (CURRENT_DATE - ep.data_prevista) AS dias_atraso
FROM engenheiros_projetos ep
WHERE ep.data_prevista < CURRENT_DATE 
  AND ep.data_conclusao IS NULL;
```

---

## ✅ Próximos Passos

Aguardando instruções para:
1. Tabelas de parametrização adicionais
2. Políticas de segurança (RLS)
3. Edge Functions para APIs
4. Sincronização com Google Sheets




