# 🤖 WhatsApp Sheets Bot

Chatbot WhatsApp que consulta dados do Google Sheets usando inteligência artificial (OpenAI).

## ✨ Funcionalidades

### Consultas
- 📊 Consulta dados de planilhas do Google Sheets
- 💬 Perguntas em **texto** ou **áudio** (transcrição via Whisper)
- 🤖 IA para interpretar perguntas em linguagem natural
- ⚡ Cache inteligente para performance

### **NOVO: Edição de Planilhas**
- ✏️ **Edita projetos** via comandos em linguagem natural
- 🔄 **Sincronização automática** entre abas Engenheiro e Evandro
- ➕ **Adiciona novos projetos** em ambas as abas
- ✅ **Confirmação obrigatória** antes de executar mudanças
- 📝 **Preview das mudanças** com detalhes do que será alterado

## 🏗️ Estrutura do Projeto

```
chatbot-tril/
├── src/
│   ├── index.ts                          # Entry point principal
│   ├── bot/
│   │   └── sheetsBot.ts                  # Lógica do bot WhatsApp (consulta + edição)
│   └── services/
│       ├── googleSheetsService.ts        # Integração com Google Sheets (read + write)
│       ├── queryService.ts               # Processamento de queries + classificação
│       ├── commandService.ts             # Interpretação de comandos de edição (NOVO)
│       ├── sheetSyncService.ts           # Sincronização entre abas (NOVO)
│       └── whisperService.ts             # Transcrição de áudio
├── test-query.js                         # Teste de consultas com IA
├── test-query-simple.js                  # Teste de busca simples
├── test-sheet-update.js                  # Teste de edição e sincronização (NOVO)
├── GUIA-EDICAO-PLANILHAS.md             # Guia completo de edição (NOVO)
├── ENV_CONFIG.md                         # Documentação de variáveis de ambiente
├── package.json
└── tsconfig.json
```

## 🚀 Como Usar

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# OpenAI
OPENAI_API_KEY=sua-chave-openai

# Google Sheets
GOOGLE_SHEETS_ID=id-da-sua-planilha
GOOGLE_SHEETS_RANGE=A1:Z1000
GOOGLE_APPLICATION_CREDENTIALS=caminho/para/credentials.json
```

### 3. Configurar Google Sheets API

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto novo
3. Ative a **Google Sheets API**
4. Crie credenciais do tipo **Service Account**
5. Baixe o arquivo JSON de credenciais
6. Compartilhe sua planilha com o email da service account

### 4. Executar

```bash
# Modo desenvolvimento
npm run dev

# Modo produção
npm start
```

### 5. Conectar WhatsApp

Escaneie o QR Code que aparece no terminal com seu WhatsApp.

## 💬 Como Usar o Bot

### Comandos do Sistema

- `menu` ou `oi` - Menu inicial
- `atualizar` - Atualizar cache da planilha manualmente

### 📊 Consultas (Leitura)

**Texto:**
- "Qual o status do projeto PRJ-001?"
- "Mostre os projetos em execução"
- "Quantos projetos temos?"

**Áudio:**
- Grave sua pergunta e envie como áudio

### ✏️ Comandos de Edição (Novo!)

**Atualizar projetos:**
- "Mude o projeto PRJ-001 para Em Execução"
- "Atualize o status do PRJ-002 para Parado Cliente"

**Adicionar projetos:**
- "Adicione novo projeto: Cliente Alfa Ltda, Obra Predial, Área Elétrico"

**Sistema de confirmação:**
- Bot mostra preview das mudanças
- Você confirma com "sim" ou cancela com "não"
- Sincronização automática com aba Evandro

📖 **Guia completo:** Veja `GUIA-EDICAO-PLANILHAS.md`

## 📦 Dependências Principais

- `whatsapp-web.js` - Integração com WhatsApp
- `googleapis` - API do Google Sheets
- `openai` - IA para processar perguntas
- `qrcode-terminal` - QR Code para autenticação

## 🔧 Scripts Disponíveis

```bash
npm run dev           # Desenvolvimento com hot reload (WhatsApp Bot)
npm start             # Produção (WhatsApp Bot)
npm run build         # Build TypeScript
npm run test:query    # Teste de consulta no terminal (COM IA)
npm run test:simple   # Teste de busca simples (SEM IA)
npm run test:update   # Teste de edição e sincronização (NOVO!)
```

### 🧪 Modos de Teste (Terminal)

#### 1. Teste de Consultas com IA

```bash
npm run test:query
```

- ✅ Consulta a planilha com interpretação por IA
- ✅ Faz perguntas em texto
- ✅ Ideal para testar queries complexas

#### 2. Teste de Busca Simples (Sem IA)

```bash
npm run test:simple
```

- ✅ Busca por palavras-chave (sem gastar OpenAI)
- ✅ Rápido e eficiente
- ✅ Ideal para testes básicos

#### 3. **NOVO:** Teste de Edição e Sincronização

```bash
npm run test:update
```

- ✅ Testa comandos de edição sem WhatsApp
- ✅ Interpreta comandos com IA
- ✅ Mostra preview das mudanças
- ✅ Pede confirmação antes de executar
- ✅ Executa sincronização entre abas
- ✅ Ideal para testar mudanças sem risco

**Comandos disponíveis:**
- Digite qualquer pergunta ou comando
- `reload` ou `atualizar` - Recarrega dados
- `ajuda` ou `help` - Mostra comandos
- `sair` ou `exit` - Encerra

## 📝 Notas

- O bot só responde mensagens diretas (não responde em grupos)
- Cache da planilha atualiza automaticamente a cada 5 minutos
- Áudios são salvos temporariamente e excluídos após processamento

## 🎯 Arquitetura

```
WhatsApp → sheetsBot → classifyIntent → Query ou Command?
                              ↓                    ↓
                         queryService        commandService
                              ↓                    ↓
                        OpenAI (consulta)    OpenAI (parse)
                              ↓                    ↓
                    googleSheetsService ← sheetSyncService
                              ↓                    ↓
                        Google Sheets API (read/write)
```

**Fluxo de Consulta:**
1. Usuário envia mensagem/áudio
2. Whisper transcreve (se áudio)
3. IA classifica: consulta ou comando?
4. Se consulta: busca dados e responde
5. Se comando: vai para fluxo de edição

**Fluxo de Edição (NOVO):**
1. CommandService interpreta comando com IA
2. Valida e gera preview das mudanças
3. Aguarda confirmação do usuário
4. GoogleSheetsService atualiza aba Engenheiro
5. SheetSyncService sincroniza com aba Evandro
6. Retorna resultado formatado

---

**Desenvolvido com ❤️ usando TypeScript + OpenAI + Google Sheets**

