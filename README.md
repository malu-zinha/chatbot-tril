# 🤖 Chatbot Tril Consult - Sistema de Gestão de Projetos

Sistema integrado de gestão de projetos de engenharia via WhatsApp, com armazenamento em Supabase e sincronização com Google Sheets.

## 🎯 Visão Geral

Engenheiros registram execução diária e retrabalhos pelo WhatsApp. O sistema processa, valida e armazena os dados no Supabase, e sincroniza automaticamente com a planilha do CEO para acompanhamento consolidado.

## ✨ Funcionalidades

### Para Engenheiros (via WhatsApp)
- 🆕 **Criar Novo Projeto**: Cadastro completo com dados automáticos e manuais
- ✏️ **Editar Projeto Existente**: Atualização de qualquer campo do projeto
- 📅 **Notificações Diárias**: Registro matinal (status + previsão) e noturno (feito + retrabalho)
- 📊 **Registrar Execução Diária**: Percentual previsto, realizado e observações
- 🔧 **Registrar Retrabalhos**: Motivo, descrição e impacto
- 📈 **Consultar Status**: Progresso do projeto, estatísticas e tendências
- 🤖 **Conversação Natural**: Fluxos guiados em português com menus numerados
- 🔄 **Sincronização Manual**: Comando `sync` para forçar sincronização Supabase → Sheets

### Para Gestores
- 📋 **Dashboard CEO**: Planilha consolidada com progresso de todos os projetos
- 📊 **Análise de Retrabalhos**: Categorização automática e sugestões preventivas
- 🎯 **Indicadores**: Fase do projeto, tendência, dias restantes

### Recursos Técnicos
- 💬 **WhatsApp**: Interface principal de comunicação (suporta formatos @c.us e @lid)
- 🗄️ **Supabase**: Banco PostgreSQL com RLS (armazenamento primário)
- ⚡ **Edge Functions**: APIs serverless (Deno)
- 🔄 **Google Sheets**: Sincronização automática Supabase → Sheets (a cada 5 minutos)
- 🤖 **OpenAI**: Processamento de linguagem natural (opcional)
- ⏰ **Cron Jobs**: Sincronização automática e notificações agendadas

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

# Google Sheets (Obrigatório)
GOOGLE_APPLICATION_CREDENTIALS=./path/to/credentials.json
GOOGLE_SHEETS_ENGINEER_ID=id-da-planilha-do-engenheiro
GOOGLE_SHEETS_ENGINEER_NAME=Nome da aba (ex: "Engenheira(o)")

# Google Sheets - Filtro opcional por WhatsApp
GOOGLE_SHEETS_ENG1_WHATSAPP=+5511999999999  # Filtrar projetos por engenheiro

# Supabase (Opcional - se não configurar, usa apenas Google Sheets)
SUPABASE_URL=https://[seu-projeto].supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role

# Sincronização Automática (Opcional)
SYNC_CRON_SCHEDULE=*/5 * * * *  # Padrão: a cada 5 minutos
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

## 💬 Como Usar

### 🚀 Iniciar o Bot

**Terminal:**
```bash
npm start
```

**WhatsApp:**
1. Escaneie o QR Code que aparece no terminal
2. Aguarde aparecer: `✅ WhatsApp conectado!`
3. Pronto! O bot está funcionando

---

### 📱 Comandos no WhatsApp

#### Menu Principal

Envie **"oi"**, **"menu"** ou **"ajuda"** para ver o menu:

```
🤖 Menu Principal

📋 Gestão de Projetos
1️⃣ Criar novo projeto
2️⃣ Editar projeto existente
3️⃣ Notificações diárias (Manhã/Noite)

❓ Ajuda
Digite "ajuda" para instruções

Digite o número da opção desejada
```

### 1️⃣ Criar Novo Projeto

```
Usuário: 1
Bot: [Fluxo guiado para criar projeto]
  • Código do projeto (gerado automaticamente)
  • Cliente, Contato, Obra, Área
  • Tipo de projeto
  • Datas (início, previsão interna, cliente)
  • Prazos calculados automaticamente
```

### 2️⃣ Editar Projeto Existente

```
Usuário: 2
Bot: "Qual projeto deseja editar?"
Usuário: PRJ-001
Bot: [Menu de categorias para editar]
  • Dados do Cliente
  • Datas e Prazos
  • Status e Etapa
  • Observações
```

### 3️⃣ Notificações Diárias

**Manhã** (Status + Previsão):
```
Usuário: 3 → 1 (Manhã)
Bot: "Qual projeto?"
Usuário: PRJ-001
Bot: "Qual o status do projeto?"
Usuário: [Escolhe status]
Bot: "Etapa definida automaticamente"
Bot: "Previsão para o dia?"
Usuário: "Finalizar dimensionamento"
```

**Noite** (Feito + Retrabalho):
```
Usuário: 3 → 2 (Noite)
Bot: "Qual projeto?"
Usuário: PRJ-001
Bot: "Qual o status do projeto?"
Usuário: [Escolhe status]
Bot: "O que foi feito hoje?"
Usuário: "Dimensionamento concluído"
Bot: "Necessitou retrabalho?"
Usuário: "não"
Bot: "Observações?"
```

#### Comandos Úteis

- **`sync`** ou **`sincronizar`**: Força sincronização manual Supabase → Sheets
- **`cancelar`**: Cancela o fluxo atual
- **`menu`**: Volta ao menu principal
- **`ajuda`**: Mostra instruções completas

---

### 💻 Comandos no Terminal

```bash
# Iniciar bot
npm start

# Sincronização manual
npm run sync

# Testes
npm run test:bot-completo
npm run test:3-modos

# Verificar configuração
npm run check:env-format
```

---

### 💻 Comandos no Terminal

```bash
# Iniciar bot
npm start

# Sincronização manual
npm run sync

# Testes
npm run test:bot-completo
npm run test:3-modos

# Verificar configuração
npm run check:env-format
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

### Arquitetura de Sincronização

O sistema utiliza **Supabase como banco primário** e **Google Sheets para visualização**:

```
WhatsApp Bot → Supabase (armazenamento) → Google Sheets (visualização)
                    ↑                              ↓
                    └──── Sincronização automática (a cada 5 min)
```

### Sincronização Automática

A sincronização **Supabase → Google Sheets** acontece automaticamente:

- ⏰ **A cada 5 minutos** (configurável via `SYNC_CRON_SCHEDULE`)
- 🔄 **Inicia automaticamente** quando o bot é iniciado
- ✅ **Prioriza Supabase**: Dados sempre salvos primeiro no Supabase
- 📊 **Atualiza Sheets**: Planilha sincronizada automaticamente

### Sincronização Manual

Você pode forçar uma sincronização manual de duas formas:

**1. Via WhatsApp:**
```
Usuário: sync
Bot: 🔄 Sincronização iniciada!
```

**2. Via Terminal:**
```bash
npm run sync
```

### Configuração de Filtros

Para sincronizar apenas projetos de um engenheiro específico:

```env
GOOGLE_SHEETS_ENG1_WHATSAPP=+5511999999999
```

Se não configurar, sincroniza **todos os projetos ativos**.

---

## 🧪 Testes

```bash
# Teste completo do bot (terminal)
npm run test:bot-completo

# Teste dos 3 modos (criar, editar, notificações)
npm run test:3-modos

# Sincronização manual
npm run sync

# Verificar variáveis de ambiente
npm run check:env-format
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
| `npm start` | Inicia o bot em produção |
| `npm run dev` | Desenvolvimento com hot reload |
| `npm run build` | Build TypeScript |
| `npm run sync` | Sincronização manual Supabase → Sheets |
| `npm run test:bot-completo` | Teste completo do bot (terminal) |
| `npm run test:3-modos` | Teste dos 3 modos (criar, editar, notificações) |
| `npm run check:env-format` | Verifica formatação do `.env` |
| `npm run debug:numero` | Diagnóstico de número específico |

---

## 🐛 Troubleshooting

### Erro ao conectar WhatsApp
- ✅ Verificar se o QR Code foi escaneado
- ✅ Tentar excluir pasta `.wwebjs_auth` e reconectar
- ✅ Verificar se o WhatsApp Web não está bloqueado

### Bot não responde para um número específico

**Problema**: Mensagem chega mas bot não responde

**Causa comum**: Formato `@lid` (Linked Device ID) não reconhecido

**Solução**: ✅ **Já corrigido!** O bot agora aceita ambos os formatos:
- `@c.us` (formato padrão)
- `@lid` (Linked Device ID)

Se ainda não funcionar:
1. Verifique os logs no terminal
2. Procure por `🔴 MENSAGEM DO NÚMERO PROBLEMÁTICO`
3. Verifique se aparece `✅ Número real obtido`

### Erro ao acessar Supabase
- ✅ Verificar credenciais no `.env`
- ✅ Verificar se `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão configurados
- ✅ Se não configurar Supabase, o bot funciona apenas com Google Sheets

### Erro ao acessar Google Sheets
- ✅ Verificar se a planilha foi compartilhada com a service account
- ✅ Verificar caminho do arquivo de credenciais (`GOOGLE_APPLICATION_CREDENTIALS`)
- ✅ Verificar se `GOOGLE_SHEETS_ENGINEER_NAME` corresponde ao nome da aba

### Projeto não aparece na planilha após sincronização

**Possíveis causas**:
1. **Filtro de WhatsApp configurado**: Verifique `GOOGLE_SHEETS_ENG1_WHATSAPP`
2. **Projeto inativo**: Apenas projetos com `ativo = true` são sincronizados
3. **Engenheiro não associado**: Projeto precisa ter um engenheiro associado

**Solução**:
```bash
# Executar diagnóstico
npm run debug:numero
```

### Sincronização não está funcionando
- ✅ Verificar se Supabase está configurado
- ✅ Verificar logs: deve aparecer `🔄 Sincronização iniciada`
- ✅ Executar sincronização manual: `npm run sync` ou `sync` no WhatsApp

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

**Última atualização**: Janeiro 2026 | **Versão**: 3.0.0

## 🆕 Changelog

### Versão 3.0.0 (Janeiro 2026)

#### ✨ Novas Funcionalidades
- 🆕 **3 Modos de Operação**: Criar, Editar e Notificações Diárias
- 🆕 **Sincronização Automática**: Supabase → Google Sheets a cada 5 minutos
- 🆕 **Comando Sync**: Sincronização manual via WhatsApp
- 🆕 **Criação de Projetos**: Fluxo completo com campos automáticos e manuais
- 🆕 **Edição de Projetos**: Edição categorizada de qualquer campo
- 🆕 **Notificações Diárias**: Fluxos separados para manhã e noite
- 🆕 **Etapa Automática**: Determinação automática baseada no status

#### 🔧 Melhorias
- ✅ **Suporte a formato @lid**: Bot agora aceita mensagens com Linked Device ID
- ✅ **Logs Detalhados**: Sistema completo de logs para diagnóstico
- ✅ **Normalização Robusta**: Tratamento melhorado de números WhatsApp
- ✅ **Consistência Terminal/WhatsApp**: Mesmo fluxo em ambos os ambientes
- ✅ **Tratamento de Erros**: Logs detalhados e mensagens de erro claras

#### 🐛 Correções
- ✅ Corrigido problema de números com formato `@lid` não recebendo resposta
- ✅ Corrigido sincronização de projetos com filtro de WhatsApp
- ✅ Corrigido cálculo automático de prazos (interno e cliente)
- ✅ Corrigido mapeamento automático de etapa baseado em status

#### 📚 Documentação
- ✅ README atualizado com novas funcionalidades
- ✅ Guia de troubleshooting expandido
- ✅ Documentação de sincronização automática
