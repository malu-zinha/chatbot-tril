# 🔄 Fluxo do Sistema - Chatbot WhatsApp + Google Sheets + Áudio

## 📊 Arquitetura Geral

```
┌─────────────────┐
│   USUÁRIO       │
│   (WhatsApp)    │
└────────┬────────┘
         │
         │ 1. Mensagem (texto/áudio)
         ▼
┌─────────────────────────┐
│   whatsapp-web.js       │
│   (Client)              │
└────────┬────────────────┘
         │
         │ 2. Event 'message'
         ▼
┌─────────────────────────┐
│   sheetsBot.ts          │
│   (Lógica Principal)    │
└─┬───────────────────┬───┘
  │                   │
  │ Texto            │ Áudio
  │                   │
  │                   ▼
  │          ┌──────────────────┐
  │          │ WhisperService   │
  │          │ (Transcrição)    │
  │          └────────┬─────────┘
  │                   │
  │                   │ 3. Texto transcrito
  ▼                   ▼
┌─────────────────────────────┐
│   QueryService              │
│   (GPT interpreta pergunta) │
└────────┬────────────────────┘
         │
         │ 4. Busca estruturada
         ▼
┌─────────────────────────────┐
│   GoogleSheetsService       │
│   (Lê dados da planilha)    │
└────────┬────────────────────┘
         │
         │ 5. Dados filtrados
         ▼
┌─────────────────────────────┐
│   QueryService              │
│   (Formata resposta)        │
└────────┬────────────────────┘
         │
         │ 6. Resposta formatada
         ▼
┌─────────────────────────────┐
│   sheetsBot.ts              │
│   (Envia mensagem)          │
└────────┬────────────────────┘
         │
         │ 7. Resposta
         ▼
┌─────────────────────────────┐
│   USUÁRIO                   │
│   (Recebe resposta)         │
└─────────────────────────────┘
```

## 🎤 Fluxo Detalhado - Mensagem de Áudio

```
USUÁRIO                  BOT                    WHISPER         SHEETS          GPT
  │                       │                       │               │               │
  │─────Áudio────────────>│                       │               │               │
  │                       │                       │               │               │
  │                       │─── "🎤 Transcrevendo..."              │               │
  │<──────────────────────│                       │               │               │
  │                       │                       │               │               │
  │                       │───Download arquivo───>│               │               │
  │                       │<──────Texto───────────│               │               │
  │                       │                       │               │               │
  │                       │─── "📝 Você disse: 'pergunta'"        │               │
  │<──────────────────────│                       │               │               │
  │                       │                       │               │               │
  │                       │────────────────────────────Query──────>│               │
  │                       │<───────────────────────────dados──────│               │
  │                       │                       │               │               │
  │                       │───────────────────────────────────────────Interpretar>│
  │                       │<──────────────────────────────────────────Resposta────│
  │                       │                       │               │               │
  │<────✅ Resposta───────│                       │               │               │
  │                       │                       │               │               │
```

## 🔄 Ciclo de Cache da Planilha

```
INICIALIZAÇÃO
     │
     ▼
┌─────────────────────────┐
│ 1. Conectar WhatsApp    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 2. Carregar Planilha    │
│    (primeira vez)       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 3. Armazenar em Cache   │
│    cachedSheetData[]    │
│    lastUpdate = now     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 4. Iniciar Timer        │
│    (5 minutos)          │
└────────┬────────────────┘
         │
         │
    ┌────┴────┐
    │         │
    │    LOOP (a cada 5min)
    │         │
    │         ▼
    │    ┌─────────────────────────┐
    │    │ Atualizar Cache         │
    │    │ (fetch nova versão)     │
    │    └────────┬────────────────┘
    │             │
    │             ▼
    │    ┌─────────────────────────┐
    │    │ cachedSheetData =       │
    │    │ novos dados             │
    │    └────────┬────────────────┘
    │             │
    └─────────────┘

ATUALIZAÇÃO MANUAL:
Usuário envia "atualizar"
     │
     ▼
lastUpdate = 0 (força update)
     │
     ▼
Recarrega planilha imediatamente
```

## 🧠 Fluxo de Processamento de Query (GPT)

```
PERGUNTA DO USUÁRIO
     │
     ▼
┌─────────────────────────────────┐
│ QueryService.querySheetOptimized│
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 1. Analisar Intent              │
│    - GPT entende o que buscar   │
│    - Extrai keywords            │
│    - Define colunas relevantes  │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 2. Filtrar Dados Localmente     │
│    - Busca por keywords         │
│    - Reduz volume de dados      │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 3. Enviar para GPT              │
│    - Contexto: headers          │
│    - Dados: filtrados (max 50)  │
│    - Prompt: interpretar        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 4. GPT Gera Resposta            │
│    {                            │
│      answer: "texto formatado", │
│      data: [...],               │
│      confidence: "high"         │
│    }                            │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 5. Retornar para Bot            │
└─────────────────────────────────┘
```

## 💾 Gerenciamento de Arquivos Temporários

```
ÁUDIO RECEBIDO
     │
     ▼
┌─────────────────────────────────┐
│ 1. Baixar do WhatsApp           │
│    media.data (base64)          │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 2. Salvar em temp/              │
│    userId_timestamp.ogg         │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 3. Enviar para Whisper          │
│    (via file stream)            │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 4. Receber Transcrição          │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 5. DELETAR ARQUIVO              │
│    fs.unlinkSync(audioPath)     │
└─────────────────────────────────┘

Se ERRO em qualquer etapa:
     │
     ▼
┌─────────────────────────────────┐
│ try/finally: DELETAR ARQUIVO    │
│ (cleanup garantido)             │
└─────────────────────────────────┘
```

## 🔐 Fluxo de Autenticação Google

```
INICIALIZAÇÃO DO BOT
     │
     ▼
┌─────────────────────────────────┐
│ 1. Carregar credentials.json    │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 2. GoogleAuth                   │
│    - Validar service account    │
│    - Gerar token de acesso      │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 3. Inicializar Cliente Sheets   │
│    google.sheets({ auth })      │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 4. Primeira Requisição          │
│    sheets.spreadsheets.values   │
│    .get({ spreadsheetId, range })│
└────────┬────────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 SUCESSO   ERRO
    │         │
    │         └──> Logs erro + Exit
    │
    ▼
┌─────────────────────────────────┐
│ Token armazenado em memória     │
│ (renovado automaticamente)      │
└─────────────────────────────────┘
```

## ⚡ Otimizações Implementadas

### 1. Cache de Dados
```
┌──────────────────────────────┐
│ Sem Cache:                   │
│ Cada pergunta = 1 API call   │
│ 100 perguntas = 100 calls    │
│ Custo: $$$ + Lento           │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Com Cache (5min):            │
│ 100 perguntas = 1 API call   │
│ (se dentro de 5min)          │
│ Custo: $ + Rápido            │
└──────────────────────────────┘
```

### 2. Query Otimizada
```
┌──────────────────────────────┐
│ Planilha pequena (<100 rows) │
│ → Envia TUDO para GPT        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Planilha grande (>100 rows)  │
│ 1. GPT analisa intent        │
│ 2. Filtra localmente         │
│ 3. Envia só relevante        │
│ → Economiza tokens + Rápido  │
└──────────────────────────────┘
```

### 3. Cleanup de Arquivos
```
┌──────────────────────────────┐
│ Áudios em temp/              │
│ → Deletados imediatamente    │
│    após transcrição          │
│ → Não acumula espaço         │
└──────────────────────────────┘
```

## 📈 Métricas e Performance

```
TEMPO MÉDIO DE RESPOSTA:

Mensagem de Texto:
┌─────────────────┬──────────┐
│ Análise GPT     │ 1-2s     │
│ Busca cache     │ <0.1s    │
│ Formatação      │ 0.5-1s   │
│ TOTAL           │ 2-4s     │
└─────────────────┴──────────┘

Mensagem de Áudio:
┌─────────────────┬──────────┐
│ Download        │ 1-2s     │
│ Whisper         │ 2-5s     │
│ Análise GPT     │ 1-2s     │
│ Busca cache     │ <0.1s    │
│ Formatação      │ 0.5-1s   │
│ TOTAL           │ 5-10s    │
└─────────────────┴──────────┘

CONSUMO DE API:

Com 100 perguntas/dia:
┌──────────────────┬──────────┐
│ Whisper (áudio)  │ ~$0.60   │
│ GPT-4 Turbo      │ ~$2-5    │
│ Sheets API       │ Grátis   │
│ TOTAL/mês        │ ~$80-150 │
└──────────────────┴──────────┘
```

## 🎯 Próximas Otimizações Possíveis

1. **Vector Database** (Pinecone/Weaviate)
   - Busca semântica em planilhas gigantes
   - Query instantâneo

2. **Streaming Responses**
   - Resposta em tempo real (palavra por palavra)

3. **Multi-Sheet Support**
   - Usuário escolhe qual planilha consultar

4. **Webhook para Updates**
   - Planilha avisa bot quando há mudanças
   - Cache sempre atualizado

5. **Analytics Dashboard**
   - Perguntas mais comuns
   - Usuários mais ativos
   - Tempo médio de resposta

---

**📚 Documentação completa em GUIA-SHEETS-BOT.md**

