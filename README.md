# 🤖 WhatsApp Sheets Bot

Chatbot WhatsApp que consulta dados do Google Sheets usando inteligência artificial (OpenAI).

## ✨ Funcionalidades

- 📊 Consulta dados de planilhas do Google Sheets
- 💬 Perguntas em **texto** ou **áudio** (transcrição via Whisper)
- 🤖 IA para interpretar perguntas em linguagem natural
- ⚡ Cache inteligente para performance
- 🔄 Sincronização automática com a planilha

## 🏗️ Estrutura do Projeto

```
chatbot-tril/
├── src/
│   ├── index.ts                          # Entry point principal
│   ├── bot/
│   │   └── sheetsBot.ts                  # Lógica do bot WhatsApp
│   └── services/
│       ├── googleSheetsService.ts        # Integração com Google Sheets
│       ├── queryService.ts               # Processamento de queries com IA
│       └── whisperService.ts             # Transcrição de áudio
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

### Comandos

- `menu` ou `oi` - Menu inicial
- `atualizar` - Atualizar cache da planilha manualmente

### Exemplos de Perguntas

**Texto:**
- "Qual o total de vendas?"
- "Mostre os clientes de São Paulo"
- "Quantos produtos temos no estoque?"

**Áudio:**
- Grave sua pergunta e envie como áudio

## 📦 Dependências Principais

- `whatsapp-web.js` - Integração com WhatsApp
- `googleapis` - API do Google Sheets
- `openai` - IA para processar perguntas
- `qrcode-terminal` - QR Code para autenticação

## 🔧 Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento com hot reload (WhatsApp Bot)
npm start            # Produção (WhatsApp Bot)
npm run build        # Build TypeScript
npm run test:query   # Teste de consulta no terminal (sem WhatsApp)
```

### 🧪 Modo Teste (Terminal)

Para testar a consulta da planilha **sem precisar do WhatsApp**:

```bash
npm run test:query
```

**Funcionalidades do modo teste:**
- ✅ Consulta a planilha direto do terminal
- ✅ Faz perguntas em texto
- ✅ Testa a IA sem gastar com transcrição de áudio
- ✅ Ideal para desenvolvimento e debug

**Comandos no modo teste:**
- Digite qualquer pergunta para consultar
- `reload` ou `atualizar` - Recarrega dados da planilha
- `ajuda` ou `help` - Mostra comandos
- `sair` ou `exit` - Encerra o teste

## 📝 Notas

- O bot só responde mensagens diretas (não responde em grupos)
- Cache da planilha atualiza automaticamente a cada 5 minutos
- Áudios são salvos temporariamente e excluídos após processamento

## 🎯 Arquitetura

```
WhatsApp → sheetsBot → queryService → OpenAI
                    ↓
              googleSheetsService → Google Sheets API
```

**Fluxo de Consulta:**
1. Usuário envia mensagem/áudio
2. Bot processa (transcreve áudio se necessário)
3. Query service usa IA para entender a pergunta
4. Busca dados na planilha (cache ou API)
5. Retorna resposta formatada

---

**Desenvolvido com ❤️ usando TypeScript + OpenAI + Google Sheets**

