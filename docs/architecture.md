# 🏗️ Arquitetura do Sistema - Chatbot Tril Consult

## 📋 Visão Geral

Sistema de gestão de projetos de engenharia através de WhatsApp, integrando chatbot conversacional com banco de dados Supabase e sincronização com Google Sheets.

## 🎯 Objetivos

- **Engenheiros**: Registrar execução diária e retrabalhos via WhatsApp
- **Sistema**: Processar, validar e armazenar dados no Supabase
- **CEO**: Visualizar progresso consolidado em planilha Google Sheets

---

## 🧩 Componentes Principais

### 1. **Chatbot WhatsApp** 🤖
- **Responsabilidade**: Colega (Chatbot + Lógica)
- **Tecnologia**: whatsapp-web.js + Node.js + TypeScript
- **Função**: Interface conversacional com engenheiros

#### Subcomponentes:
- **Message Handler**: Orquestra fluxos conversacionais
- **Flows**: 
  - `registerProgress.ts` - Registrar execução diária
  - `registerRework.ts` - Registrar retrabalho
  - `checkStatus.ts` - Consultar status do projeto

### 2. **Lógica de Negócio** 🧮
- **Responsabilidade**: Colega (Lógica)
- **Localização**: `logic/`
- **Função**: Cálculos, validações e classificações

#### Subcomponentes:
- **Execução**: Cálculo de progresso e projeções
- **Retrabalho**: Classificação de motivos e análise de impacto
- **Validação**: Validação de inputs antes de enviar à API

### 3. **Backend (Edge Functions)** ⚡
- **Responsabilidade**: Iza (Backend)
- **Tecnologia**: Supabase Edge Functions (Deno)
- **Função**: APIs REST para operações no banco

#### Endpoints:
- `POST /registrarExecucao` - Registrar execução diária
- `POST /registrarRetrabalho` - Registrar retrabalho
- `GET /statusProjeto` - Consultar status do projeto

### 4. **Banco de Dados** 🗄️
- **Responsabilidade**: Iza (Banco)
- **Tecnologia**: Supabase (PostgreSQL)
- **Função**: Armazenamento persistente de dados

#### Tabelas:
- `engenheiros` - Cadastro de engenheiros
- `projetos` - Cadastro de projetos
- `execucao_diaria` - Registros diários de execução
- `retrabalhos` - Registros de retrabalhos

#### Views:
- `view_progresso_geral` - Dados consolidados para planilha CEO
- `view_progresso_por_engenheiro` - Análise por engenheiro
- `view_retrabalhos_resumo` - Análise de retrabalhos
- `view_dashboard_ceo` - View simplificada para exportação

### 5. **Integrações** 🔗
- **Responsabilidade**: Iza (Integrações)
- **Função**: Sincronização bidirecional com Google Sheets

#### Serviços:
- **Engineer Sync**: Planilhas engenheiros → Supabase
- **CEO Sync**: Supabase → Planilha CEO (dashboard consolidado)

---

## 🔄 Fluxo de Dados

### Fluxo 1: Registro de Execução Diária

```
┌──────────────┐
│  Engenheiro  │
│  (WhatsApp)  │
└──────┬───────┘
       │ "Registrar execução"
       ▼
┌──────────────┐
│  Chatbot     │ ← messageHandler.ts
│  Handler     │
└──────┬───────┘
       │ Inicia fluxo
       ▼
┌──────────────────┐
│ Register         │
│ Progress Flow    │ ← registerProgress.ts
│ (Conversação)    │
└──────┬───────────┘
       │ Coleta dados
       ▼
┌──────────────────┐
│  Validação       │ ← validateInput.ts
│  de Inputs       │
└──────┬───────────┘
       │ Dados validados
       ▼
┌──────────────────┐
│  Edge Function   │ ← registrarExecucao/index.ts
│  (Supabase)      │
└──────┬───────────┘
       │ Insere dados
       ▼
┌──────────────────┐
│    Banco de      │
│    Dados         │ ← Tabela: execucao_diaria
│   (Supabase)     │
└──────┬───────────┘
       │ Trigger atualiza
       ▼
┌──────────────────┐
│    Projeto       │ ← Tabela: projetos
│ (% atualizado)   │    (percentual_total)
└──────────────────┘
```

### Fluxo 2: Sincronização para CEO

```
┌──────────────────┐
│    Banco de      │
│    Dados         │
│   (Supabase)     │
└──────┬───────────┘
       │ Query
       ▼
┌──────────────────┐
│ view_dashboard   │ ← View agregada
│      _ceo        │
└──────┬───────────┘
       │ Dados consolidados
       ▼
┌──────────────────┐
│   CEO Sync       │ ← ceo_sync.ts
│   Service        │
└──────┬───────────┘
       │ Escreve dados
       ▼
┌──────────────────┐
│  Google Sheets   │
│  (Planilha CEO)  │ ← Dashboard consolidado
└──────────────────┘
```

### Fluxo 3: Sincronização de Engenheiros

```
┌──────────────────┐
│  Google Sheets   │
│ (Planilha Eng.)  │
└──────┬───────────┘
       │ Lê dados
       ▼
┌──────────────────┐
│  Engineer Sync   │ ← engineer_sync.ts
│    Service       │
└──────┬───────────┘
       │ Valida e insere
       ▼
┌──────────────────┐
│    Banco de      │
│    Dados         │ ← Tabela: projetos
│   (Supabase)     │
└──────────────────┘
```

---

## 🔐 Segurança e Permissões

### Row Level Security (RLS)

- **Engenheiros**: Acesso apenas aos seus próprios projetos
- **CEO/Admin**: Acesso completo a todos os dados
- **Service Role**: Edge Functions executam com permissões elevadas

### Políticas Implementadas:

```sql
-- Engenheiro vê apenas seus projetos
CREATE POLICY "Engenheiros podem ver apenas seus projetos"
    ON projetos FOR SELECT
    USING (auth.uid() = engenheiro_id);

-- CEO vê todos os projetos
CREATE POLICY "CEO e Admin podem ver todos os projetos"
    ON projetos FOR SELECT
    USING (auth.jwt() -> 'user_metadata' ->> 'role' IN ('admin', 'ceo'));
```

---

## 📊 Estrutura de Diretórios

```
chatbot-tril/
│
├── supabase/                    # ÁREA: Iza
│   ├── db_schema.sql           # Schema de tabelas
│   ├── policies.sql            # Políticas RLS
│   ├── views.sql               # Views agregadas
│   └── edge_functions/         # APIs serverless
│       ├── registrarExecucao/
│       ├── registrarRetrabalho/
│       └── statusProjeto/
│
├── integrations/               # ÁREA: Iza
│   └── sheets/
│       ├── engineer_sync.ts    # Sync planilhas → BD
│       ├── ceo_sync.ts         # Sync BD → planilha CEO
│       ├── googleSheetsService.ts
│       └── sheetSyncService.ts
│
├── logic/                      # ÁREA: Colega
│   ├── execucao/
│   │   └── calculateProgress.ts
│   ├── retrabalho/
│   │   └── calculateRework.ts
│   └── validation/
│       └── validateInput.ts
│
├── chatbot/                    # ÁREA: Colega
│   ├── flows/
│   │   ├── registerProgress.ts
│   │   ├── registerRework.ts
│   │   └── checkStatus.ts
│   └── handlers/
│       ├── messageHandler.ts
│       ├── sheetsBot.ts
│       ├── commandService.ts
│       ├── queryService.ts
│       └── whisperService.ts
│
├── docs/                       # Documentação
│   ├── architecture.md         # Este arquivo
│   ├── api.md                  # Documentação das APIs
│   ├── business_rules.md       # Regras de negócio
│   └── data_flow.md            # Fluxos de dados
│
└── src/
    └── index.ts                # Entry point
```

---

## 🚀 Tecnologias Utilizadas

### Frontend (Chatbot)
- **Node.js** v18+
- **TypeScript** v5+
- **whatsapp-web.js** - Integração WhatsApp
- **axios** - HTTP client

### Backend
- **Supabase Edge Functions** (Deno runtime)
- **PostgreSQL** via Supabase
- **Row Level Security** (RLS)

### Integrações
- **Google Sheets API** v4
- **googleapis** - Cliente Node.js

### IA/ML
- **OpenAI GPT-4** - Processamento de linguagem natural
- **Whisper API** - Transcrição de áudio

---

## 🔄 Padrões de Design

### 1. **Flow Pattern** (Fluxos Conversacionais)
- Máquina de estados para cada fluxo
- Steps sequenciais com validação
- Possibilidade de voltar e cancelar

### 2. **Service Layer**
- Separação entre lógica de negócio e persistência
- Serviços reutilizáveis e testáveis

### 3. **Validation Layer**
- Validação centralizada antes de enviar dados
- Normalização de dados (datas, WhatsApp, etc)

### 4. **Repository Pattern**
- Edge Functions como camada de acesso a dados
- Views do PostgreSQL como queries pré-computadas

---

## 📈 Escalabilidade

### Estratégias Implementadas:

1. **Edge Functions**: Serverless, escala automaticamente
2. **Views Materializadas**: Reduz carga de queries complexas
3. **Índices**: Otimização de queries frequentes
4. **Cache de Sessões**: Gerenciamento eficiente de sessões do chatbot

### Limites e Considerações:

- **WhatsApp**: Limitado pela API do WhatsApp Web
- **Supabase**: Free tier tem limites de requests/mês
- **Google Sheets API**: Quota de 100 requests/100 segundos/usuário

---

## 🎯 Próximos Passos

1. **Notificações Proativas**: Lembretes diários via WhatsApp
2. **Relatórios Automáticos**: Envio semanal de resumo por email
3. **Dashboard Web**: Interface visual complementar
4. **Analytics**: Dashboards de BI (Metabase, Grafana)
5. **Multi-idioma**: Suporte a inglês e espanhol

---

## 👥 Divisão de Responsabilidades

### Iza (Backend + Integrações)
- ✅ Schema do banco de dados
- ✅ Políticas de segurança (RLS)
- ✅ Edge Functions (APIs)
- ✅ Sincronização Google Sheets
- ✅ Views agregadas

### Colega (Frontend + Lógica)
- ✅ Fluxos conversacionais
- ✅ Lógica de cálculos
- ✅ Validações de input
- ✅ Message Handler
- ✅ Integração WhatsApp

---

**Última atualização**: Novembro 2024
**Versão**: 1.0.0

