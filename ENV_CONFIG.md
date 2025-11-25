# Configuração de Variáveis de Ambiente

Configure as seguintes variáveis no arquivo `.env`:

## OpenAI

```env
OPENAI_API_KEY=sua-chave-openai-aqui
```

Obtenha em: https://platform.openai.com/api-keys

## Google Sheets

### ID da Planilha

```env
GOOGLE_SHEETS_ID=1ie_-khm3Me_DdVjDIUPXqDmUpJjQNy_xHHl5jiHk_60
```

Pegue da URL: `https://docs.google.com/spreadsheets/d/[ID_AQUI]/edit`

### Range de Leitura

```env
GOOGLE_SHEETS_RANGE=A1:Z1000
```

### Nomes das Abas

```env
# Aba onde o Engenheiro trabalha (será editada via bot)
GOOGLE_SHEETS_ENGINEER_SHEET=Engenheiro

# Aba do Evandro (será sincronizada automaticamente)
GOOGLE_SHEETS_EVANDRO_SHEET=Evandro
```

### Credenciais do Google

```env
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
```

Obtenha as credenciais em: https://console.cloud.google.com/

## Exemplo Completo

Crie um arquivo `.env` na raiz do projeto com:

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
GOOGLE_SHEETS_ID=1ie_-khm3Me_DdVjDIUPXqDmUpJjQNy_xHHl5jiHk_60
GOOGLE_SHEETS_RANGE=A1:Z1000
GOOGLE_SHEETS_ENGINEER_SHEET=Engenheiro
GOOGLE_SHEETS_EVANDRO_SHEET=Evandro
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
```

