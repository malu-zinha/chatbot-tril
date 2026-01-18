# Integração do Novo Banco de Dados N:N ao Chatbot

## Visão Geral

Este documento explica como o novo schema de banco de dados (relacionamento N:N entre engenheiros, projetos e áreas) foi integrado ao chatbot de gestão de projetos.

## Mudanças Principais

### 1. Estrutura do Banco de Dados

#### Schema Anterior (1:N)
- `projetos.engenheiro_id` → relacionamento direto 1:N
- `projetos.area` → campo VARCHAR simples
- `projetos.status` → campo VARCHAR simples
- Um projeto = um engenheiro = uma área

#### Novo Schema (N:N)
- `engenheiros_projetos` → tabela de relacionamento N:N
- `areas` → tabela de decodificação com `tempo_trabalho_dias`
- `status_codes` → tabela de decodificação com `percentual_base`
- Um projeto pode ter múltiplas áreas
- Um engenheiro pode trabalhar em múltiplas áreas do mesmo projeto
- Cada atribuição (engenheiro + projeto + área) tem seu próprio status e progresso

### 2. Autenticação via WhatsApp

#### Tabela `engenheiros_auth`
Para manter compatibilidade com o chatbot atual que identifica engenheiros via WhatsApp, foi criada a tabela `engenheiros_auth` que mapeia:
- `whatsapp` → `eng_id`

**Fluxo de autenticação:**
```
WhatsApp → engenheiros_auth → eng_id → engenheiros
```

**Métodos no SupabaseService:**
- `buscarEngenheiroPorWhatsapp(whatsapp)` - busca engenheiro via WhatsApp
- `criarEngenheiroComAuth(nome, whatsapp, exclusivo)` - cria engenheiro + auth
- `criarOuBuscarEngenheiro(whatsapp, nome)` - compatibilidade com código antigo

### 3. Fluxo de Criação de Projeto

#### Antes
1. Preencher dados do projeto (incluindo área)
2. Criar projeto com `engenheiro_id` e `area` diretamente

#### Agora
1. Preencher dados básicos do projeto (cliente, contato, obra, tipo)
2. Preencher datas (início, previsão interna, final cliente)
3. **Escolher áreas** (pode ser múltiplas)
4. Para cada área:
   - Data de início da área
   - Data prevista da área
   - Status inicial da área
5. Criar projeto básico em `projetos`
6. Criar atribuições em `engenheiros_projetos` (uma por área)

**Exemplo:**
```
Projeto PRJ-001 criado
  → Atribuição 1: Engenheiro João + PRJ-001 + Elétrico (E1)
  → Atribuição 2: Engenheiro João + PRJ-001 + Hidráulico (H1)
```

### 4. Listagem de Projetos

#### Antes
- Retornava lista de projetos únicos
- Cada projeto aparecia uma vez

#### Agora
- Retorna lista de atribuições (projeto + área)
- Mesmo projeto pode aparecer múltiplas vezes (uma por área)
- Cada entrada mostra: código do projeto, cliente, área, status da área

**Exemplo de resposta:**
```
1. PRJ-001 - Cliente ABC - Elétrico (35%)
2. PRJ-001 - Cliente ABC - Hidráulico (20%)
3. PRJ-002 - Cliente XYZ - Climatização (50%)
```

### 5. Notificações Diárias

#### Antes
- Trabalhava com `projeto_id`
- Uma atualização por projeto

#### Agora
- Trabalha com `eng_projeto_id` (ID da atribuição)
- Uma atualização por atribuição (projeto + área)
- Engenheiro pode atualizar cada área separadamente

**Tabelas utilizadas:**
- `projetos_previsao` - previsões e feitos do dia (manhã/noite)
- `retrabalho_projetos` - retrabalhos por atribuição

### 6. Sincronização com Google Sheets

#### Antes
- Uma linha na planilha = um projeto
- Coluna "Área" com texto livre

#### Agora
- Uma linha na planilha = uma atribuição (projeto + área)
- Mesmo projeto pode ter múltiplas linhas (uma por área)
- Coluna "Área" preenchida com descrição da tabela `areas`
- Coluna "Status" preenchida com descrição da tabela `status_codes`

**Mapeamento:**
- `area_id` → busca em `areas` → coluna "Área" da planilha
- `status_id` → busca em `status_codes` → coluna "Status do projeto" da planilha

## Arquivos Modificados

### 1. `supabase/engenheiros_auth.sql` (NOVO)
Tabela de autenticação WhatsApp → eng_id

### 2. `integrations/supabase/supabaseService.ts`
**Mudanças principais:**
- Adicionado `buscarEngenheiroPorWhatsapp()` - autenticação via WhatsApp
- Adicionado `criarEngenheiroComAuth()` - criar engenheiro com auth
- Adicionado `listarAreasDisponiveis()` - listar áreas da tabela `areas`
- Adicionado `listarStatusDisponiveis()` - listar status da tabela `status_codes`
- Adicionado `atribuirAreaProjeto()` - criar atribuição em `engenheiros_projetos`
- Adicionado `listarAtribuicoesEngenheiro()` - listar atribuições do engenheiro
- Adicionado `registrarPrevisaoDia()` - usar `eng_projeto_id` em vez de `projeto_id`
- Adicionado `registrarFeitoDia()` - usar `eng_projeto_id` em vez de `projeto_id`
- Adicionado `buscarUltimaPrevisao()`, `buscarUltimoRetrabalho()`, `buscarPrazos()` - métodos auxiliares
- Modificado `criarProjeto()` - criar apenas dados básicos (sem engenheiro_id)
- Modificado `listarProjetosEngenheiro()` - retornar atribuições em vez de projetos

### 3. `chatbot/flows/engineerProjectFlow.ts`
**Mudanças principais:**
- Adicionado step `escolher_areas` - escolher quais áreas trabalhar (múltiplas)
- Adicionado step `dados_area` - preencher dados de cada área (data_inicio, data_prevista, status)
- Modificado `stepDataFinalCliente()` - após preencher datas, perguntar áreas
- Modificado `salvar()` - criar projeto básico + múltiplas atribuições
- Modificado `generateSummary()` - mostrar todas as áreas selecionadas

### 4. `integrations/sheets/engineerSheetService.ts`
**Mudanças principais:**
- Modificado `listAllProjects()` - agrupar por código+área (múltiplas linhas do mesmo projeto)
- Modificado `getProject()` - aceitar parâmetro `area` opcional para buscar linha específica

### 5. `integrations/cron/syncDatabaseToSheets.ts`
**Mudanças principais:**
- Buscar atribuições via `listarAtribuicoesEngenheiro()` ou `listarTodasAtribuicoes()`
- Para cada atribuição, criar uma linha na planilha
- Mapear `area_id` → descrição da área
- Mapear `status_id` → descrição do status
- Buscar previsões via `buscarUltimaPrevisao()`
- Buscar retrabalhos via `buscarUltimoRetrabalho()`

## Fluxo de Dados

### Criação de Projeto

```
1. Engenheiro escolhe "Criar novo projeto"
   ↓
2. Preenche: Cliente, Contato, Obra, Tipo
   ↓
3. Preenche: Data início, Data previsão interna, Data final cliente
   ↓
4. Escolhe áreas (ex: Elétrico, Hidráulico)
   ↓
5. Para cada área:
   - Data início da área
   - Data prevista da área
   - Status inicial
   ↓
6. Confirma dados
   ↓
7. Sistema cria:
   - 1 registro em `projetos` (dados básicos)
   - N registros em `engenheiros_projetos` (uma por área)
   ↓
8. Triggers automáticos:
   - `tempo_trabalho_dias` preenchido da tabela `areas`
   - `percentual_andamento` preenchido da tabela `status_codes`
```

### Notificação Diária (Manhã)

```
1. Engenheiro escolhe "Notificações diárias" → "Manhã"
   ↓
2. Escolhe atribuição (projeto + área)
   ↓
3. Informa status atual
   ↓
4. Informa previsão para o dia
   ↓
5. Sistema cria/atualiza em `projetos_previsao`:
   - eng_projeto_id (ID da atribuição)
   - previsao_texto
   - status_id (mapeado do status informado)
```

### Notificação Diária (Noite)

```
1. Engenheiro escolhe "Notificações diárias" → "Noite"
   ↓
2. Escolhe atribuição (projeto + área)
   ↓
3. Informa status atual
   ↓
4. Informa feito do dia
   ↓
5. Informa se teve retrabalho (e motivo se sim)
   ↓
6. Sistema atualiza `projetos_previsao`:
   - feito_texto
   - editavel = false (torna imutável)
   ↓
7. Se teve retrabalho, cria em `retrabalho_projetos`:
   - eng_projeto_id
   - necessitou_retrabalho = true
   - motivo_retrabalho
```

### Sincronização BD → Planilha

```
1. Cron job executa a cada 5 minutos
   ↓
2. Para cada planilha configurada:
   - Buscar engenheiro por WhatsApp (se filtro especificado)
   - Buscar atribuições do engenheiro (ou todas)
   ↓
3. Para cada atribuição:
   - Buscar projeto por projeto_id
   - Buscar área por area_id
   - Buscar status por status_id
   - Buscar última previsão
   - Buscar último retrabalho
   - Buscar prazos
   ↓
4. Criar linha na planilha com:
   - Código do projeto
   - Cliente
   - Área (descrição da tabela areas)
   - Status (descrição da tabela status_codes)
   - Previsão do dia
   - Feito do dia
   - etc.
   ↓
5. Limpar planilha e escrever todas as linhas
```

## Mapeamento de Dados

### Áreas
A planilha usa nomes como "elétrica", "hidrossanitário", mas o banco usa códigos como "E1", "H1", etc.

**Solução atual:**
- Durante criação, o chatbot mapeia nome → código (mapeamento básico)
- Durante sincronização, o banco mapeia código → descrição para a planilha

**Melhoria futura:**
- Criar tabela de mapeamento nome_planilha → codigo_banco
- Ou padronizar nomes entre planilha e banco

### Status
A planilha usa textos como "em execução", "parado cliente", mas o banco usa códigos como "EM_EXECUCAO", "PARADO_CLIENTE".

**Solução atual:**
- Durante criação/atualização, o chatbot mapeia texto → código
- Durante sincronização, o banco mapeia código → descrição para a planilha

## Triggers Automáticos

O novo schema inclui triggers que calculam automaticamente:

1. **`tempo_trabalho_dias`** - Preenchido da tabela `areas` quando área é atribuída
2. **`percentual_andamento`** - Preenchido da tabela `status_codes` quando status é atualizado
3. **`updated_at`** - Atualizado automaticamente em todas as tabelas

## Compatibilidade

Para manter compatibilidade com código antigo, foram mantidos métodos legados:

- `listarProjetosEngenheiro()` - retorna formato antigo (agrupa atribuições por projeto)
- `buscarProjetoPorCodigoLegacy()` - retorna formato antigo
- `registrarAtualizacaoManha()` - compatibilidade (usa primeira atribuição do projeto)
- `registrarAtualizacaoNoite()` - compatibilidade (usa primeira atribuição do projeto)

## Próximos Passos

1. **Melhorar mapeamento área nome → código** - criar tabela de mapeamento ou padronizar
2. **Adicionar método `listarProjetosComAreas()`** - retornar projetos com suas áreas agrupadas
3. **Otimizar queries** - usar views do banco em vez de múltiplas queries
4. **Adicionar validações** - garantir que área existe antes de atribuir
5. **Melhorar tratamento de erros** - mensagens mais claras quando área/status não encontrado

