# 📘 Instruções e Estrutura do Projeto - Chatbot Tril Consult

## 🎯 Visão Geral do Projeto

Este é um **sistema completo de gestão de projetos de engenharia via WhatsApp**, integrando chatbot conversacional, banco de dados Supabase e sincronização com Google Sheets para dashboard do CEO.

---

## 👥 Divisão de Responsabilidades

### 🔵 **Malu Liaa - Backend, Banco de Dados e Integrações**

**Responsabilidades:**
- 🗄️ **Banco de Dados (Supabase/PostgreSQL)**
  - Schema de tabelas (`db_schema.sql`)
  - Políticas de segurança RLS (`policies.sql`)
  - Views agregadas para dashboards (`views.sql`)
  
- ⚡ **Edge Functions (APIs Serverless)**
  - `registrarExecucao` - API para registrar execução diária
  - `registrarRetrabalho` - API para registrar retrabalhos
  - `statusProjeto` - API para consultar status do projeto
  
- 🔗 **Integrações com Google Sheets**
  - `ceo_sync.ts` - Sincronização Supabase → Planilha CEO
  - `engineer_sync.ts` - Sincronização Planilhas → Supabase
  - `googleSheetsService.ts` - Serviço genérico de Sheets
  - `sheetSyncService.ts` - Sincronização entre abas

**Habilidades Necessárias:**
- SQL (PostgreSQL)
- TypeScript/Deno (Edge Functions)
- Google Sheets API
- Arquitetura de APIs REST

---

### 🟢 **Malu Log - Chatbot, Fluxos Conversacionais e Lógica de Negócio**

**Responsabilidades:**
- 💬 **Chatbot WhatsApp**
  - `sheetsBot.ts` - Bot principal com WhatsApp Web
  - `messageHandler.ts` - Orquestrador de fluxos
  - `queryService.ts` - Consultas com IA (OpenAI)
  - `commandService.ts` - Comandos de edição
  - `whisperService.ts` - Transcrição de áudio

- 🔄 **Fluxos Conversacionais**
  - `registerProgress.ts` - Fluxo para registrar execução
  - `registerRework.ts` - Fluxo para registrar retrabalho
  - `checkStatus.ts` - Fluxo para consultar status

- 🧮 **Lógica de Negócio**
  - `calculateProgress.ts` - Cálculos de progresso e projeções
  - `calculateRework.ts` - Análise de retrabalhos
  - `validateInput.ts` - Validações de entrada

**Habilidades Necessárias:**
- TypeScript/Node.js
- WhatsApp Web.js
- OpenAI API
- Máquinas de estado (fluxos conversacionais)
- Lógica de negócio e validações

---

## 📁 Estrutura Detalhada do Repositório

```
chatbot-tril/
├── 📂 supabase/                    👤 ÁREA: malulia
├── 📂 integrations/                👤 ÁREA: malulia
├── 📂 chatbot/                     👤 ÁREA: malu log
├── 📂 logic/                       👤 ÁREA: malulog
├── 📂 docs/                        📚 Documentação (ambas)
├── 📂 tests/                       🧪 Testes (ambas)
├── 📂 src/                         🚀 Entry point
└── 📄 Arquivos de config           ⚙️ Configuração
```

---

## 📂 Detalhamento de Cada Pasta

### 1. `supabase/` 👤 Maluliaa

#### 📄 `db_schema.sql` (229 linhas)
**O que é:** Schema completo do banco de dados PostgreSQL

**Tabelas criadas:**
1. **`engenheiros`** - Cadastro dos engenheiros que usam o sistema
   - Campos: id, nome, whatsapp, email, ativo
   - WhatsApp é a identificação principal no chatbot

2. **`projetos`** - Projetos vinculados a cada engenheiro
   - Campos: codigo, nome, cliente, engenheiro_id, area, tipo_obra, status, percentual_total, datas
   - Cada projeto pertence a um único engenheiro

3. **`execucao_diaria`** - Registros diários de execução
   - Campos: projeto_id, data, percentual_previsto, percentual_realizado, percentual_acumulado, observacoes
   - UNIQUE constraint em (projeto_id, data) - não permite duplicatas

4. **`retrabalhos`** - Registros de retrabalhos
   - Campos: projeto_id, data, motivo, categoria, descricao, impacto_percentual, tempo_perdido_horas

**Triggers criados:**
- `update_updated_at_column()` - Atualiza `updated_at` automaticamente
- `atualizar_percentual_projeto()` - Quando registra execução, atualiza `percentual_total` do projeto automaticamente

**Índices:** Criados em todas as chaves estrangeiras e campos de busca frequente

---

#### 📄 `policies.sql` (261 linhas)
**O que é:** Políticas de segurança RLS (Row Level Security)

**Políticas implementadas:**

**Para Engenheiros:**
- ✅ Ver apenas seus próprios projetos
- ✅ Criar/Editar/Deletar apenas seus projetos
- ✅ Ver/Registrar execuções apenas de seus projetos
- ✅ Ver/Registrar retrabalhos apenas de seus projetos

**Para CEO/Admin:**
- ✅ Ver TODOS os projetos de TODOS os engenheiros
- ✅ Acesso read-only via planilha consolidada

**Para Service Role (Edge Functions):**
- ✅ Bypass automático de RLS (permissões totais)

**Como funciona:**
```sql
-- Exemplo: Engenheiro vê só seus projetos
CREATE POLICY "Engenheiros podem ver apenas seus projetos"
    ON projetos FOR SELECT
    USING (auth.uid() = engenheiro_id);
```

---

#### 📄 `views.sql` (299 linhas)
**O que é:** Views agregadas para consultas otimizadas

**5 Views criadas:**

1. **`view_progresso_geral`**
   - Agrega TODOS os dados: projetos + execuções + retrabalhos
   - Calcula: total_dias_registrados, media_diaria, total_retrabalhos, status_atividade, fase_projeto
   - Usado para: análises gerais e dashboards

2. **`view_progresso_por_engenheiro`**
   - Agrupa projetos por engenheiro
   - Estatísticas: total_projetos, projetos_em_execucao, projetos_concluidos, media_percentual

3. **`view_retrabalhos_resumo`**
   - Análise de retrabalhos por motivo/categoria
   - Estatísticas: total_ocorrencias, impacto_total, tempo_perdido, projetos_afetados

4. **`view_execucao_semanal`**
   - Agrupa execuções por semana
   - Útil para: análise de tendências

5. **`view_dashboard_ceo`** ⭐ **MAIS IMPORTANTE**
   - View simplificada para exportar direto para planilha
   - Campos: Código, Nome, Cliente, Engenheiro, Área, % Concluído, Última Atualização, Situação
   - É essa view que o `ceo_sync.ts` usa

---

#### 📂 `edge_functions/` (3 funções)

##### 📄 `registrarExecucao/index.ts` (306 linhas)
**O que é:** API POST para registrar execução diária

**Request:**
```json
{
  "projeto_id": "uuid",
  "data": "2024-01-15",           // opcional, default: hoje
  "percentual_previsto": 10,      // opcional
  "percentual_realizado": 8,      // obrigatório
  "observacoes": "Chuva atrasou"  // opcional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Execução registrada com sucesso",
  "data": {
    "id": "uuid-da-execucao",
    "projeto": "Nome do Projeto",
    "percentual_acumulado": 45
  }
}
```

**Fluxo interno:**
1. Valida método POST
2. Valida campos obrigatórios e ranges (0-100%)
3. Verifica se projeto existe
4. Calcula `percentual_acumulado` (soma de todas execuções até a data)
5. Faz `upsert` em `execucao_diaria` (insere ou atualiza se já existe)
6. Trigger automático atualiza `projetos.percentual_total`
7. Retorna sucesso

---

##### 📄 `registrarRetrabalho/index.ts`
**O que é:** API POST para registrar retrabalhos

**Request:**
```json
{
  "projeto_id": "uuid",
  "motivo": "Erro de Projeto",
  "descricao": "Erro no dimensionamento...",
  "impacto_percentual": 5,
  "tempo_perdido_horas": 8
}
```

**Funcionalidade especial:**
- Classifica automaticamente a categoria (Técnico, Cliente, Fornecedor, etc) se não fornecida

---

##### 📄 `statusProjeto/index.ts`
**O que é:** API GET para consultar status completo

**Request:**
```
GET /statusProjeto?codigo=PRJ-001
```

**Response:**
```json
{
  "projeto": { ... },
  "progresso": { percentual_total: 45.5, fase: "Em Andamento" },
  "execucoes_recentes": [ ... ],
  "retrabalhos": [ ... ],
  "estatisticas": { ... }
}
```

---

### 2. `integrations/sheets/` 👤 Maluliaa

#### 📄 `ceo_sync.ts` (426 linhas)
**O que é:** Sincronização Supabase → Planilha do CEO

**Classe principal:** `CEOSyncService`

**Funções:**

1. **`buscarDadosConsolidados()`**
   - Busca dados da view `view_dashboard_ceo`
   - Retorna array de objetos com todos os projetos

2. **`formatarParaPlanilha()`**
   - Converte dados para formato de planilha (array de arrays)
   - Adiciona cabeçalho

3. **`aplicarFormatacao()`**
   - Cabeçalho azul com texto branco e negrito
   - Congela primeira linha
   - Formata coluna de % como número

4. **`sincronizarParaCEO()`** ⭐ **PRINCIPAL**
   - Busca dados → Formata → Limpa planilha → Escreve → Aplica formatação → Adiciona timestamp
   - Chamada manual: `await sincronizarParaCEO(spreadsheetId, 'Dashboard')`

5. **`iniciarSincronizacaoAutomatica()`**
   - Roda sincronização automaticamente a cada X minutos (padrão: 30min)
   - Executa primeira vez imediatamente, depois agenda

**Exemplo de uso:**
```typescript
import { sincronizarParaCEO, iniciarSincronizacaoAutomatica } from './ceo_sync';

// Manual
await sincronizarParaCEO('spreadsheet-id', 'Dashboard Geral');

// Automática (a cada 30min)
await iniciarSincronizacaoAutomatica('spreadsheet-id', 'Dashboard Geral', 30);
```

---

#### 📄 `engineer_sync.ts`
**O que é:** Sincronização Planilhas dos Engenheiros → Supabase

**Fluxo:**
1. Lê dados das planilhas individuais dos engenheiros
2. Valida formato e consistência
3. Cria ou atualiza projetos no banco
4. Se projeto já existe (por código): ATUALIZA
5. Se projeto novo: CRIA

---

#### 📄 `googleSheetsService.ts`
**O que é:** Serviço genérico para Google Sheets API

**Funções principais:**
- `readSheet()` - Ler dados de uma planilha
- `readSheetAsObjects()` - Ler e converter em array de objetos
- `writeSheet()` - Escrever dados
- `updateRowByID()` - Atualizar linha específica por ID
- `clearSheet()` - Limpar dados

---

#### 📄 `sheetSyncService.ts`
**O que é:** Sincronização entre abas "Engenheiro" e "Evandro"

**Funções:**
- `syncProjectToEvandro()` - Copia projeto da aba Engenheiro para aba Evandro
- `createProjectInBothSheets()` - Cria projeto simultaneamente em ambas abas

---

### 3. `chatbot/` 👤 Malulog

#### 📂 `handlers/`

##### 📄 `sheetsBot.ts` (564 linhas)
**O que é:** Bot principal - integração WhatsApp Web.js

**Funcionalidades:**

1. **Cache de dados da planilha**
   - Atualiza a cada 5 minutos automaticamente
   - `updateSheetCache()` - busca dados da aba Engenheiro

2. **Processamento de áudio**
   - `processAudio()` - Salva áudio → Transcreve com Whisper → Limpa arquivo

3. **Processamento de perguntas**
   - `processQuestion()` - Usa QueryService + OpenAI para responder

4. **Processamento de comandos**
   - `processCommand()` - Parseia comando de edição
   - Sistema de confirmação (pede "sim" ou "não")

5. **Comandos suportados:**
   - Menu/Ajuda: "menu", "oi", "ajuda"
   - Atualizar cache: "atualizar", "refresh"
   - Consultas: "Qual o status do PRJ-001?"
   - Comandos: "Mude PRJ-001 para Em Execução"

**Fluxo de mensagem:**
```
1. Recebe mensagem (texto ou áudio)
2. Se áudio → transcreve
3. Classifica intent (consulta vs comando)
4. Se comando → parseia → valida → pede confirmação
5. Se consulta → usa OpenAI → responde
```

---

##### 📄 `messageHandler.ts` (390 linhas)
**O que é:** Orquestrador dos fluxos conversacionais

**Classe principal:** `MessageHandler`

**Gerenciamento de sessões:**
- Cada usuário tem uma sessão (Map por WhatsApp)
- Sessão contém: fluxo_ativo, instancia_fluxo, ultima_interacao
- Timeout: 15 minutos de inatividade
- Limpeza automática a cada 5 minutos

**Classificação de intenções:**
```typescript
// Palavras-chave detectadas:
"registrar", "executar", "progresso" → registrar_execucao
"retrabalho", "refazer", "erro" → registrar_retrabalho
"status", "consultar", "andamento" → consultar_status
"menu", "oi", "olá" → menu
```

**Fluxo:**
1. Usuário envia mensagem
2. Classifica intenção
3. Inicia fluxo apropriado (RegisterProgressFlow, etc)
4. Mantém fluxo ativo até finalizar
5. Retorna resposta formatada

---

##### 📄 `queryService.ts`
**O que é:** Serviço de consultas com IA

**Funções:**
- `classifyIntent()` - Classifica se é consulta ou comando
- `querySheet()` - Usa OpenAI para responder perguntas sobre planilha
- `querySheetOptimized()` - Versão otimizada para planilhas grandes (>100 linhas)

**Exemplo:**
```
Usuário: "Quantos projetos em execução?"
→ OpenAI analisa planilha + responde: "Há 5 projetos em execução"
```

---

##### 📄 `commandService.ts`
**O que é:** Serviço de comandos de edição

**Funções:**
- `parseCommand()` - Parseia texto do usuário em estrutura de comando
- `validateCommand()` - Valida se comando é válido
- `generatePreview()` - Gera preview das mudanças
- `formatPreviewMessage()` - Formata mensagem de confirmação

**Exemplo:**
```
Usuário: "Mude PRJ-001 para Em Execução"
→ Parseia: { action: 'update', projectId: 'PRJ-001', fields: { Status: 'Em Execução' } }
→ Gera preview → Pede confirmação
```

---

##### 📄 `whisperService.ts`
**O que é:** Serviço de transcrição de áudio

**Função:**
- `transcribe(audioPath)` - Envia áudio para Whisper API → Retorna texto

---

#### 📂 `flows/`

##### 📄 `registerProgress.ts` (440 linhas)
**O que é:** Fluxo conversacional para registrar execução diária

**Máquina de estados:** `inicio → projeto → previsto → realizado → observacoes → confirmacao → fim`

**Steps:**

1. **inicio** - Mensagem de boas-vindas
2. **projeto** - "Qual projeto?" → Valida código
3. **previsto** - "Percentual previsto?" → Permite pular
4. **realizado** - "Percentual realizado?" → Valida 0-100%
5. **observacoes** - "Observações?" → Opcional
6. **confirmacao** - Mostra resumo → "Confirmar?"
7. **fim** - Envia para API → Retorna sucesso

**Validações:**
- Código do projeto mínimo 3 caracteres
- Percentuais entre 0 e 100
- Extrai números de textos como "10%", "10,5", "10.5"

**Comandos especiais:**
- "cancelar" - Sai do fluxo
- "pular" - Pula step de previsto
- "não" - Sem observações

**Comparação automática:**
```
Se previsto = 10% e realizado = 8%:
→ "⚠️ Atrasado (-2%)"

Se previsto = 10% e realizado = 12%:
→ "🚀 Adiantado! (+2%)"
```

**Envio para API:**
```typescript
POST /registrarExecucao
{
  projeto_id: "uuid",
  percentual_previsto: 10,
  percentual_realizado: 8,
  observacoes: "Chuva atrasou"
}
```

---

##### 📄 `registerRework.ts`
**O que é:** Fluxo para registrar retrabalho

**Steps:**
1. Qual projeto?
2. Qual motivo? (lista de opções)
3. Descrição detalhada
4. Impacto em % ?
5. Tempo perdido em horas?
6. Confirmação → Envia para API

---

##### 📄 `checkStatus.ts`
**O que é:** Fluxo para consultar status

**Steps:**
1. Qual projeto?
2. Busca na API GET /statusProjeto
3. Formata resposta bonita
4. Mostra: % concluído, fase, execuções recentes, retrabalhos

---

### 4. `logic/` 👤 Malulog

#### 📂 `execucao/`

##### 📄 `calculateProgress.ts` (348 linhas)
**O que é:** Lógica de cálculos de progresso

**4 Funções principais:**

1. **`calculateDailyProgress(previsto, realizado)`**
   ```typescript
   // Calcula variação entre previsto e realizado
   const variacao = realizado - previsto;
   // Status: no_prazo (±5%), atrasado (<-5%), adiantado (>5%)
   ```

2. **`calculateAccumulatedProgress(execucoes[])`**
   ```typescript
   // Soma todos os percentuais realizados (máximo 100%)
   const percentual_acumulado = Math.min(soma, 100);
   // Calcula média diária
   // Determina tendência (últimas 3 vs média geral)
   ```

3. **`projectCompletion(percentual_atual, media_diaria, data_previsao?)`**
   ```typescript
   // Estima dias restantes
   dias_restantes = CEIL(percentual_restante / media_diaria);
   // Calcula data de conclusão
   // Avalia viabilidade de cumprir prazo
   ```

4. **`validateExecutionData(execucoes[])`**
   ```typescript
   // Verifica duplicatas de data
   // Valida ranges (0-100%)
   // Detecta gaps entre datas (>7 dias)
   // Avisa se acumulado > 100%
   ```

**Exemplo de uso:**
```typescript
const analise = calculateDailyProgress(10, 8);
// { variacao: -2, status: 'atrasado' }

const progresso = calculateAccumulatedProgress(execucoes);
// { percentual_acumulado: 45, tendencia: 'acelerando', ... }
```

---

#### 📂 `retrabalho/`

##### 📄 `calculateRework.ts`
**O que é:** Lógica de análise de retrabalhos

**Funções:**

1. **`classifyRework(motivo, descricao)`**
   - Usa NLP básico (palavras-chave)
   - Categorias: Técnico, Cliente, Fornecedor, Planejamento, Externo

2. **`calculateSeverity(impacto_total, total_retrabalhos)`**
   ```
   Crítica: impacto >= 20% OU total >= 10
   Alta: impacto >= 10% OU total >= 5
   Média: impacto >= 5% OU total >= 3
   Baixa: caso contrário
   ```

3. **`generateRecommendations(categoria, severidade)`**
   - Retorna sugestões preventivas baseadas em severidade e categoria

---

#### 📂 `validation/`

##### 📄 `validateInput.ts`
**O que é:** Validações centralizadas de entrada

**Funções:**

1. **`validateExecution(dados)`**
   - Valida campos obrigatórios
   - Valida ranges (0-100%)
   - Valida datas (não pode ser futuro)
   - Normaliza dados

2. **`validateRework(dados)`**
   - Valida motivo (mínimo 5 caracteres)
   - Valida descrição (mínimo 10 caracteres)
   - Valida impacto (0-100%)

3. **`normalizarWhatsapp(numero)`**
   ```typescript
   // "11999999999" → "+5511999999999"
   // "(11) 99999-9999" → "+5511999999999"
   ```

4. **`normalizarData(data)`**
   ```typescript
   // "15/01/2024" → "2024-01-15"
   // "2024-01-15" → "2024-01-15"
   ```

---

### 5. `docs/` 📚 Ambas

#### 📄 `architecture.md` (346 linhas)
**O que é:** Arquitetura completa do sistema

**Conteúdo:**
- Componentes principais e suas funções
- Diagramas de fluxo de dados
- Tecnologias utilizadas
- Padrões de design (Flow Pattern, Service Layer, Repository Pattern)
- Estratégias de escalabilidade

---

#### 📄 `business_rules.md` (308 linhas)
**O que é:** Regras de negócio detalhadas

**Conteúdo:**
- Cálculo de progresso e percentuais
- Classificação de retrabalhos
- Status e fases do projeto
- Validações de input
- Notificações e alertas
- Sincronização de dados

---

#### 📄 `api.md` (282 linhas)
**O que é:** Documentação das APIs

**Conteúdo:**
- Endpoints das Edge Functions
- Request/Response de cada API
- Códigos de status HTTP
- Exemplos de integração (JS, cURL)
- Tratamento de erros

---

#### 📄 `data_flow.md` (416 linhas)
**O que é:** Fluxos de dados e transformações

**Conteúdo:**
- Fluxo de registro de execução
- Fluxo de sincronização CEO
- Transformações de dados (datas, WhatsApp, percentuais)
- Triggers automáticos
- Validação em camadas

---

### 6. `tests/` 🧪 Ambas

#### 📄 Arquivos de teste

- **`test-query.js`** - Testa consultas com IA (OpenAI)
- **`test-query-simple.js`** - Testa busca simples na planilha
- **`test-sheet-update.js`** - Testa atualização de planilha
- **`test-openai.js`** - Testa integração OpenAI
- **`debug-sheet.js`** - Debug da estrutura da planilha
- **`list-clients.js`** - Lista clientes da planilha

---

### 7. `src/` 🚀 Ambas

#### 📄 `index.ts` (42 linhas)
**O que é:** Entry point do sistema

**Fluxo:**
1. Carrega variáveis de ambiente (.env)
2. Valida que todas as vars necessárias existem:
   - `OPENAI_API_KEY`
   - `GOOGLE_SHEETS_ID`
   - `GOOGLE_APPLICATION_CREDENTIALS`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. Inicia o bot: `startSheetsBot()`

**Para executar:**
```bash
npm run dev  # Desenvolvimento
npm start    # Produção
```

---

### 8. Arquivos de Configuração ⚙️

#### 📄 `package.json` (32 linhas)
**O que é:** Dependências e scripts do projeto

**Dependências principais:**
- `@supabase/supabase-js` - Cliente Supabase
- `whatsapp-web.js` - Integração WhatsApp
- `googleapis` - Google Sheets API
- `openai` - OpenAI API
- `axios` - HTTP client

**Scripts disponíveis:**
```bash
npm start              # Produção
npm run dev            # Desenvolvimento (hot reload)
npm run build          # Build TypeScript
npm run test:query     # Teste de consulta com IA
npm run test:simple    # Teste de busca simples
npm run test:update    # Teste de edição
npm run verificar      # Verificar planilha
npm run copiar:evandro # Copiar para aba Evandro
```

---

#### 📄 `tsconfig.json`
**O que é:** Configuração do TypeScript

**Principais configs:**
- `target: "ES2022"` - JavaScript moderno
- `module: "ESNext"` - Módulos ES6
- `moduleResolution: "node"` - Resolução estilo Node.js

---

#### 📄 `.env` (criar baseado em `.env.example`)
**O que é:** Variáveis de ambiente

**Variáveis necessárias:**
```env
# OpenAI
OPENAI_API_KEY=sk-...

# Supabase
SUPABASE_URL=https://[projeto].supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_FUNCTIONS_URL=https://[projeto].supabase.co/functions/v1

# Google Sheets
GOOGLE_SHEETS_ID=1abc...
GOOGLE_SHEETS_RANGE=A1:Z1000
GOOGLE_SHEETS_ENGINEER_SHEET=Engenheiro
GOOGLE_SHEETS_EVANDRO_SHEET=Evandro
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
```

---

## 🔄 Fluxo Completo do Sistema

### Cenário 1: Engenheiro Registra Execução via WhatsApp

```
1. 👨‍💼 Engenheiro envia mensagem: "registrar execução"
   ↓
2. 📱 sheetsBot.ts recebe mensagem
   ↓
3. 🎯 messageHandler.ts classifica intenção → "registrar_execucao"
   ↓
4. 🔄 Inicia RegisterProgressFlow (registerProgress.ts)
   ↓
5. 💬 Flow guia engenheiro pelos steps:
   - "Qual projeto?" → "PRJ-001"
   - "Percentual previsto?" → "10"
   - "Percentual realizado?" → "8"
   - "Observações?" → "Chuva atrasou"
   - "Confirmar?" → "sim"
   ↓
6. ✅ validateInput.ts valida todos os dados
   ↓
7. 📤 Flow envia POST /registrarExecucao
   ↓
8. ⚡ Edge Function (registrarExecucao/index.ts):
   - Valida projeto existe
   - Calcula percentual_acumulado
   - Insere em execucao_diaria (upsert)
   - Trigger atualiza projetos.percentual_total
   ↓
9. ✅ Retorna sucesso para engenheiro
   ↓
10. ⏰ A cada 30min: ceo_sync.ts sincroniza para planilha CEO
```

---

### Cenário 2: Sincronização Automática para CEO

```
1. ⏰ Timer dispara (a cada 30min)
   ↓
2. 🔄 ceo_sync.ts → sincronizarParaCEO()
   ↓
3. 📊 Busca dados de view_dashboard_ceo
   ↓
4. 🎨 Formata dados (cabeçalho, cores, números)
   ↓
5. 🧹 Limpa planilha CEO
   ↓
6. ✍️ Escreve dados consolidados
   ↓
7. 🎨 Aplica formatação visual
   ↓
8. 📅 Adiciona timestamp de atualização
   ↓
9. ✅ CEO vê dashboard atualizado
```

---

## 🛠️ Como Começar

### Para maluliaa (Backend):

1. **Configurar Supabase:**
   ```bash
   # Executar no Supabase SQL Editor
   psql < supabase/db_schema.sql
   psql < supabase/policies.sql
   psql < supabase/views.sql
   ```

2. **Deploy Edge Functions:**
   ```bash
   supabase functions deploy registrarExecucao
   supabase functions deploy registrarRetrabalho
   supabase functions deploy statusProjeto
   ```

3. **Configurar Google Sheets:**
   - Criar Service Account no Google Cloud
   - Baixar credentials.json
   - Compartilhar planilhas com o email da service account

4. **Testar sincronização:**
   ```bash
   npm run copiar:evandro
   npm run verificar
   ```

---

### Para malulog (Chatbot):

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar .env:**
   - Adicionar OPENAI_API_KEY
   - Adicionar GOOGLE_SHEETS_ID

3. **Testar componentes:**
   ```bash
   npm run test:query       # Testa OpenAI
   npm run test:simple      # Testa busca
   ```

4. **Iniciar bot:**
   ```bash
   npm run dev
   ```
   - Escanear QR Code do WhatsApp
   - Testar fluxos

---

## 🎓 Conceitos Importantes

### Row Level Security (RLS)
- Sistema de segurança do PostgreSQL
- Cada linha tem política de quem pode ver/editar
- Engenheiros veem só seus dados
- CEO vê tudo

### Edge Functions
- APIs serverless (Deno runtime)
- Escalam automaticamente
- Executam com service_role (sem RLS)

### Views Materializadas
- Queries pré-calculadas
- Melhoram performance
- Usadas para dashboards

### Máquina de Estados (Fluxos)
- Sistema de steps sequenciais
- Mantém contexto por usuário
- Permite voltar e cancelar

### Cache com TTL
- Time To Live = 5 minutos
- Evita buscar planilha toda hora
- Atualiza automaticamente

---

## 📊 Estatísticas do Projeto

- **Total de arquivos de código:** ~15 principais
- **Linhas de código:** ~4.500 linhas
- **Tabelas no banco:** 4
- **Views:** 5
- **Edge Functions:** 3
- **Fluxos conversacionais:** 3
- **Arquivos de documentação:** 4
- **Testes:** 6

---

## 🚨 Pontos de Atenção

### Para maluliaa:
- ⚠️ Service Role Key é sensível - nunca commitar
- ⚠️ Validar RLS antes de ir para produção
- ⚠️ Monitorar quotas do Google Sheets API (100 req/100s)
- ⚠️ Fazer backup do banco regularmente

### Para malulog:
- ⚠️ Limpar sessões antigas para evitar memory leak
- ⚠️ Tratar erros de rede (WhatsApp pode cair)
- ⚠️ Validar inputs antes de enviar para API
- ⚠️ Limpar arquivos de áudio temporários

---

## 🎯 Próximos Passos Sugeridos

1. **Notificações Proativas**
   - Lembretes diários: "Registrou a execução de hoje?"
   - Alertas de projeto atrasado

2. **Relatórios Automáticos**
   - Email semanal com resumo
   - PDF com gráficos de progresso

3. **Dashboard Web**
   - Interface visual complementar
   - Visualização de tendências

4. **Analytics e BI**
   - Integração com Metabase/Grafana
   - Dashboards interativos

5. **Multi-idioma**
   - Suporte a inglês e espanhol

---

## 📞 Contato e Suporte

Para dúvidas sobre este projeto, consulte:
- **README.md** - Visão geral e instalação
- **docs/** - Documentação detalhada de cada área
- Este arquivo - Estrutura e divisão de responsabilidades

---

**Última atualização:** Dezembro 2024
**Versão:** 2.0.0
**Desenvolvido por:** Iza (Backend) + Amiga (Chatbot)

