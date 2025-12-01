# 🤖 Chatbot Tril Consult - Sistema de Gestão de Projetos

Sistema integrado de gestão de projetos de engenharia via WhatsApp, com armazenamento em Supabase e sincronização com Google Sheets.

## 🎯 Visão Geral

Engenheiros registram execução diária e retrabalhos pelo WhatsApp. O sistema processa, valida e armazena os dados no Supabase, e sincroniza automaticamente com a planilha do CEO para acompanhamento consolidado.

## ✨ Funcionalidades

### Para Engenheiros (via WhatsApp)
- 📊 **Registrar Execução Diária**: Percentual previsto, realizado e observações
- 🔧 **Registrar Retrabalhos**: Motivo, descrição e impacto
- 📈 **Consultar Status**: Progresso do projeto, estatísticas e tendências
- 🤖 **Conversação Natural**: Fluxos guiados em português

### Para Gestores
- 📋 **Dashboard CEO**: Planilha consolidada com progresso de todos os projetos
- 📊 **Análise de Retrabalhos**: Categorização automática e sugestões preventivas
- 🎯 **Indicadores**: Fase do projeto, tendência, dias restantes

### Recursos Técnicos
- 💬 **WhatsApp**: Interface principal de comunicação
- 🗄️ **Supabase**: Banco PostgreSQL com RLS
- ⚡ **Edge Functions**: APIs serverless (Deno)
- 🔄 **Google Sheets**: Sincronização bidirecional
- 🤖 **OpenAI**: Processamento de linguagem natural

---

## 🏗️ Estrutura do Repositório

```
chatbot-tril/
│
├── supabase/                    # 👤 ÁREA: Iza (Banco + APIs)
│   ├── db_schema.sql           # Schema de tabelas
│   ├── policies.sql            # Políticas RLS
│   ├── views.sql               # Views agregadas
│   └── edge_functions/         # APIs serverless
│       ├── registrarExecucao/
│       ├── registrarRetrabalho/
│       └── statusProjeto/
│
├── integrations/               # 👤 ÁREA: Iza (Integrações)
│   └── sheets/
│       ├── engineer_sync.ts    # Planilhas → Supabase
│       ├── ceo_sync.ts         # Supabase → Planilha CEO
│       ├── googleSheetsService.ts
│       └── sheetSyncService.ts
│
├── logic/                      # 👤 ÁREA: Colega (Lógica)
│   ├── execucao/
│   │   └── calculateProgress.ts    # Cálculos de progresso
│   ├── retrabalho/
│   │   └── calculateRework.ts      # Análise de retrabalho
│   └── validation/
│       └── validateInput.ts        # Validações
│
├── chatbot/                    # 👤 ÁREA: Colega (Chatbot)
│   ├── flows/
│   │   ├── registerProgress.ts     # Fluxo: registrar execução
│   │   ├── registerRework.ts       # Fluxo: registrar retrabalho
│   │   └── checkStatus.ts          # Fluxo: consultar status
│   └── handlers/
│       ├── messageHandler.ts       # Orquestrador principal
│       ├── sheetsBot.ts
│       ├── commandService.ts
│       ├── queryService.ts
│       └── whisperService.ts
│
├── docs/                       # 📚 Documentação
│   ├── architecture.md         # Arquitetura do sistema
│   ├── api.md                  # Documentação das APIs
│   ├── business_rules.md       # Regras de negócio
│   └── data_flow.md            # Fluxos de dados
│
├── tests/                      # 🧪 Testes
│   ├── test-query.js
│   ├── test-sheet-update.js
│   └── ...
│
├── src/
│   └── index.ts                # Entry point
│
├── package.json
├── tsconfig.json
└── README.md                   # Este arquivo
```

---

## 🚀 Instalação e Configuração

### 1. Pré-requisitos

- Node.js v18+
- npm ou yarn
- Conta Supabase
- Conta Google Cloud (para Sheets API)
- WhatsApp ativo

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz:

```env
# OpenAI
OPENAI_API_KEY=sua-chave-openai

# Supabase
SUPABASE_URL=https://[seu-projeto].supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
SUPABASE_FUNCTIONS_URL=https://[seu-projeto].supabase.co/functions/v1

# Google Sheets
GOOGLE_SHEETS_ID=id-da-planilha
GOOGLE_SHEETS_RANGE=A1:Z1000
GOOGLE_APPLICATION_CREDENTIALS=./path/to/credentials.json
```

### 4. Configurar Supabase

#### 4.1 Criar Tabelas

```bash
# Executar no Supabase SQL Editor
psql < supabase/db_schema.sql
psql < supabase/policies.sql
psql < supabase/views.sql
```

#### 4.2 Fazer Deploy das Edge Functions

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Deploy das functions
supabase functions deploy registrarExecucao
supabase functions deploy registrarRetrabalho
supabase functions deploy statusProjeto
```

### 5. Configurar Google Sheets API

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto
3. Ative a **Google Sheets API**
4. Crie credenciais **Service Account**
5. Baixe o JSON de credenciais
6. Compartilhe suas planilhas com o email da service account

### 6. Executar

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

---

## 💬 Como Usar o Chatbot

### Comandos Principais

**Menu**:
```
Usuário: "menu" ou "oi"
Bot: [Exibe menu de opções]
```

**Registrar Execução**:
```
Usuário: "registrar execução"
Bot: "Qual projeto?"
Usuário: "PRJ-001"
Bot: "Percentual previsto?"
Usuário: "10"
Bot: "Percentual realizado?"
Usuário: "8"
Bot: "Observações?"
Usuário: "Chuva atrasou"
Bot: [Resumo] "Confirmar?"
Usuário: "sim"
Bot: "✅ Registrado! Acumulado: 45%"
```

**Registrar Retrabalho**:
```
Usuário: "registrar retrabalho"
Bot: [Fluxo guiado para coletar motivo, descrição, impacto]
```

**Consultar Status**:
```
Usuário: "consultar status"
Bot: "Qual projeto?"
Usuário: "PRJ-001"
Bot: [Exibe progresso, estatísticas, execuções recentes]
```

---

## 📡 APIs (Edge Functions)

### POST /registrarExecucao

```json
{
  "projeto_id": "uuid",
  "percentual_realizado": 8,
  "percentual_previsto": 10,
  "observacoes": "..."
}
```

### POST /registrarRetrabalho

```json
{
  "projeto_id": "uuid",
  "motivo": "Erro de Projeto",
  "descricao": "...",
  "impacto_percentual": 5
}
```

### GET /statusProjeto?codigo=PRJ-001

Retorna progresso completo, execuções recentes e retrabalhos.

📖 **Documentação completa**: `docs/api.md`

---

## 🗄️ Banco de Dados

### Tabelas Principais

- **engenheiros**: Cadastro de engenheiros
- **projetos**: Cadastro de projetos
- **execucao_diaria**: Registros diários de execução
- **retrabalhos**: Registros de retrabalhos

### Views

- **view_progresso_geral**: Dados consolidados
- **view_dashboard_ceo**: View para planilha CEO
- **view_retrabalhos_resumo**: Análise de retrabalhos

📖 **Schema completo**: `supabase/db_schema.sql`

---

## 🔄 Sincronização com Google Sheets

### Engenheiros → Supabase

```typescript
import { sincronizarEngenheiro } from './integrations/sheets/engineer_sync';

await sincronizarEngenheiro(
  '+5511999999999',
  'spreadsheet-id',
  'Projetos'
);
```

### Supabase → CEO

```typescript
import { sincronizarParaCEO } from './integrations/sheets/ceo_sync';

// Manual
await sincronizarParaCEO('spreadsheet-id-ceo', 'Dashboard');

// Automática (a cada 30min)
await iniciarSincronizacaoAutomatica('spreadsheet-id-ceo', 'Dashboard', 30);
```

---

## 🧪 Testes

```bash
# Teste de consulta com IA
npm run test:query

# Teste de consulta simples
npm run test:simple

# Teste de edição
npm run test:update
```

---

## 📚 Documentação Completa

- [**Arquitetura**](docs/architecture.md) - Componentes e fluxos do sistema
- [**APIs**](docs/api.md) - Documentação dos endpoints
- [**Regras de Negócio**](docs/business_rules.md) - Lógica e cálculos
- [**Fluxo de Dados**](docs/data_flow.md) - Transformações e integrações

---

## 👥 Divisão de Responsabilidades

### Iza (Backend + Integrações)
- ✅ Schema do banco de dados
- ✅ Políticas de segurança (RLS)
- ✅ Edge Functions (APIs)
- ✅ Sincronização Google Sheets ↔ Supabase
- ✅ Views agregadas

### Colega (Frontend + Lógica)
- ✅ Fluxos conversacionais do WhatsApp
- ✅ Lógica de cálculos de progresso
- ✅ Lógica de análise de retrabalho
- ✅ Validações de input
- ✅ Message Handler (orquestrador)

---

## 📦 Dependências Principais

```json
{
  "whatsapp-web.js": "^1.34.2",
  "@supabase/supabase-js": "^2.x",
  "googleapis": "^164.1.0",
  "openai": "^4.20.0",
  "axios": "^1.13.2"
}
```

---

## 🔐 Segurança

- **RLS (Row Level Security)**: Engenheiros veem apenas seus projetos
- **API Keys**: Armazenadas em variáveis de ambiente
- **Service Account**: Google Sheets com permissões restritas
- **Validação em Camadas**: Chatbot → Lógica → API → Banco

---

## 🚧 Roadmap

- [ ] Notificações proativas (lembretes diários)
- [ ] Relatórios automáticos por email
- [ ] Dashboard web complementar
- [ ] Analytics e BI (Metabase/Grafana)
- [ ] Multi-idioma (EN, ES)
- [ ] Integração com outras ferramentas (Trello, Jira)

---

## 📝 Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Desenvolvimento com hot reload |
| `npm start` | Produção |
| `npm run build` | Build TypeScript |
| `npm run test:query` | Teste de consulta com IA |
| `npm run test:simple` | Teste de busca simples |
| `npm run test:update` | Teste de edição |

---

## 🐛 Troubleshooting

### Erro ao conectar WhatsApp
- Verificar se o QR Code foi escaneado
- Tentar excluir pasta `.wwebjs_auth` e reconectar

### Erro ao acessar Supabase
- Verificar credenciais no `.env`
- Verificar se as Edge Functions foram deployadas

### Erro ao acessar Google Sheets
- Verificar se a planilha foi compartilhada com a service account
- Verificar caminho do arquivo de credenciais

---

## 📄 Licença

Este projeto é propriedade de **Tril Consult**.

---

## 🤝 Contribuindo

Para contribuir:
1. Crie uma branch: `git checkout -b feat/nova-feature`
2. Commit suas mudanças: `git commit -m 'feat: Nova feature'`
3. Push para a branch: `git push origin feat/nova-feature`
4. Abra um Pull Request

---

## 📧 Suporte

Para dúvidas ou suporte, contate a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ usando TypeScript + Supabase + WhatsApp + Google Sheets**

**Última atualização**: Novembro 2024 | **Versão**: 2.0.0
