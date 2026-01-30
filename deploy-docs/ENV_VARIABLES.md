# Variáveis de Ambiente - Configuração

## Arquivo `.env`

Crie um arquivo `.env` na raiz do projeto (`chatbot-tril/`) com as seguintes variáveis:

### Supabase (Obrigatório)

```bash
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=seu_service_role_key_aqui
```

### Google Sheets (Obrigatório)

```bash
GOOGLE_APPLICATION_CREDENTIALS=./path/to/credentials.json
GOOGLE_SHEETS_ENGINEER_ID=sua_planilha_id
GOOGLE_SHEETS_ENGINEER_NAME=Nome da Aba
```

### WhatsApp Provider (Obrigatório)

```bash
# Opções: 'development' | 'meta'
WHATSAPP_PROVIDER=development
```

**Valores:**
- `development`: Apenas logs no console (para testes locais)
- `meta`: Envia mensagens reais via Meta WhatsApp Business API

### Meta WhatsApp Business API (Apenas para produção)

**Configure apenas se `WHATSAPP_PROVIDER=meta`**

```bash
META_ACCESS_TOKEN=seu_access_token_permanente
META_PHONE_NUMBER_ID=seu_phone_number_id
META_API_VERSION=v18.0
```

**Como obter:**

1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Crie um App WhatsApp Business
3. Configure o número de telefone
4. Gere um Access Token permanente
5. Obtenha o Phone Number ID

### OpenAI (Opcional)

```bash
OPENAI_API_KEY=sua_chave_openai
```

Necessário apenas se usar transcrição de áudio via Whisper.

## Exemplo Completo - Desenvolvimento

```bash
# Supabase
SUPABASE_URL=https://xyzabc123.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Sheets
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
GOOGLE_SHEETS_ENGINEER_ID=1ABC123xyz
GOOGLE_SHEETS_ENGINEER_NAME=Engenheiro(a)

# WhatsApp - DESENVOLVIMENTO
WHATSAPP_PROVIDER=development
```

## Exemplo Completo - Produção

```bash
# Supabase
SUPABASE_URL=https://xyzabc123.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Sheets
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
GOOGLE_SHEETS_ENGINEER_ID=1ABC123xyz
GOOGLE_SHEETS_ENGINEER_NAME=Engenheiro(a)

# WhatsApp - PRODUÇÃO
WHATSAPP_PROVIDER=meta
META_ACCESS_TOKEN=EAABsbCS1...
META_PHONE_NUMBER_ID=123456789012345
META_API_VERSION=v18.0

# OpenAI (opcional)
OPENAI_API_KEY=sk-proj-...
```

## Validação

Para verificar se as variáveis estão configuradas corretamente:

```bash
npm start
```

O sistema irá:
- ✅ Validar variáveis obrigatórias
- ⚠️  Avisar sobre variáveis opcionais faltando
- 📱 Mostrar qual WhatsApp Provider está ativo
- ❌ Parar se alguma variável obrigatória estiver faltando

## Segurança

**NUNCA** commite o arquivo `.env` no Git!

O `.env` já está no `.gitignore` do projeto.

