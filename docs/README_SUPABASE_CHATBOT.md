# 🤖 Sistema de Banco de Dados via Chatbot (Supabase)

## 📋 Visão Geral

Este é um sistema completo de banco de dados PostgreSQL (Supabase) projetado para ser **alimentado exclusivamente via chatbot** através de prompts em linguagem natural.

### Características Principais

✅ **Alimentação via prompts naturais** - Engenheiros interagem usando linguagem comum  
✅ **Cálculos automáticos** - Tempo de trabalho e percentuais calculados automaticamente  
✅ **Múltiplas áreas por projeto** - Um engenheiro pode trabalhar em várias áreas simultaneamente  
✅ **Histórico completo** - Logs de todas as interações  
✅ **Validações inteligentes** - Sistema previne erros e duplicidades  
✅ **Respostas em JSON** - Fácil integração com qualquer chatbot  

---

## 🏗️ Arquitetura

```
┌─────────────────┐
│   Engenheiro    │
│   (WhatsApp,    │
│   Telegram, etc)│
└────────┬────────┘
         │
         │ Prompt em linguagem natural
         │ "Quero trabalhar na área elétrica do PRJ-001"
         ↓
┌─────────────────┐
│   Chatbot/LLM   │
│   (Claude, GPT) │
└────────┬────────┘
         │
         │ Interpreta intenção + extrai parâmetros
         │
         ↓
┌─────────────────┐
│  Edge Function  │
│   (Supabase)    │
└────────┬────────┘
         │
         │ Chama function PostgreSQL apropriada
         │
         ↓
┌─────────────────┐
│  PostgreSQL     │
│  Functions      │
│  (Lógica de     │
│   negócio)      │
└────────┬────────┘
         │
         │ Triggers automáticos
         │ (calcula tempo, percentual)
         │
         ↓
┌─────────────────┐
│  Tabelas        │
│  (Dados         │
│   persistidos)  │
└────────┬────────┘
         │
         │ Retorno JSON
         │
         ↓
┌─────────────────┐
│  Chatbot        │
│  (Formata       │
│   resposta)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Engenheiro     │
│  (Recebe        │
│   confirmação)  │
└─────────────────┘
```

---

## 📂 Estrutura de Arquivos

```
chatbot-tril/
├── supabase/
│   ├── new_db_schema.sql          # Schema completo do banco
│   ├── chatbot_functions.sql      # Functions para chatbot
│   └── edge-functions/
│       └── processar-prompt.ts    # Edge Function (API)
├── docs/
│   ├── nova_estrutura_bd.md       # Documentação das tabelas
│   ├── diagrama_bd.md             # Diagramas e exemplos
│   ├── integracao_chatbot.md      # Como integrar chatbot
│   └── README_SUPABASE_CHATBOT.md # Este arquivo
```

---

## 🚀 Como Implementar

### 1. Criar Projeto no Supabase

```bash
# Instalar CLI do Supabase
npm install -g supabase

# Fazer login
supabase login

# Criar novo projeto ou linkar existente
supabase init
supabase link --project-ref seu-projeto-id
```

### 2. Aplicar Schema

```bash
# Executar schema principal
supabase db push supabase/new_db_schema.sql

# Executar functions do chatbot
supabase db push supabase/chatbot_functions.sql
```

Ou via Dashboard do Supabase:
1. Acesse https://app.supabase.com
2. Vá em **SQL Editor**
3. Cole o conteúdo de `new_db_schema.sql`
4. Execute
5. Repita com `chatbot_functions.sql`

### 3. Deploy da Edge Function

```bash
# Deploy da function
supabase functions deploy processar-prompt \
  --project-ref seu-projeto-id
```

### 4. Configurar Variáveis de Ambiente

No Dashboard do Supabase:
1. **Settings** → **API**
2. Copie:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

### 5. Testar API

```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/processar-prompt \
  -H "Authorization: Bearer SEU_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "eng_id": "uuid-do-engenheiro",
    "prompt": "Quero trabalhar na área elétrica do PRJ-001"
  }'
```

---

## 💬 Exemplos de Prompts

### Cadastro

**Prompt:**
> "Meu nome é João Silva e trabalho exclusivamente aqui"

**Ação:** Chama `cadastrar_engenheiro('João Silva', true)`

**Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Engenheiro cadastrado com sucesso!",
  "eng_id": "abc-123-xyz",
  "nome": "João Silva",
  "exclusivo": true
}
```

---

### Criar Projeto

**Prompt:**
> "Criar projeto PRJ-2025-001 para o cliente Construtora ABC"

**Ação:** Chama `criar_projeto('PRJ-2025-001', 'Construtora ABC')`

**Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Projeto criado com sucesso!",
  "projeto_id": "xyz-789",
  "codigo": "PRJ-2025-001",
  "cliente": "Construtora ABC"
}
```

---

### Atribuir Área

**Prompt:**
> "Quero trabalhar na área elétrica do projeto PRJ-001, começando dia 15/01"

**Ação:** Chama `atribuir_area_projeto(...)`

**Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Área atribuída com sucesso! Tempo e percentual calculados automaticamente.",
  "atribuicao_id": "def-456",
  "tempo_trabalho_dias": 15,
  "percentual_andamento": 0.00
}
```

**Cálculo Automático:**
- Sistema busca `tempo_trabalho_dias` da tabela `areas` onde `codigo = 'ELETRICO'`
- Valor é preenchido automaticamente via trigger
- Engenheiro não precisa informar!

---

### Atualizar Status

**Prompt:**
> "Mudei o status para instalações de primeira fase"

**Ação:** Chama `atualizar_status_projeto(..., 'INSTALACOES_GROSSO')`

**Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Status atualizado! Percentual calculado automaticamente.",
  "percentual_andamento": 35.00
}
```

**Cálculo Automático:**
- Sistema busca `percentual_base` da tabela `status_codes`
- Percentual é atualizado automaticamente via trigger
- Engenheiro não precisa calcular!

---

### Buscar Projetos

**Prompt:**
> "Quais são meus projetos?"

**Ação:** Chama `buscar_meus_projetos(eng_id)`

**Resposta:**
```json
{
  "sucesso": true,
  "projetos": [
    {
      "projeto_codigo": "PRJ-2025-001",
      "cliente": "Construtora ABC",
      "area": "Elétrico",
      "data_inicio": "2025-01-15",
      "data_prevista": "2025-02-15",
      "status": "Instalações de Primeira Fase",
      "percentual": 35.00,
      "tempo_trabalho_dias": 15
    }
  ]
}
```

---

## 🔄 Fluxo Completo de Uso

### Dia 1: Cadastro e Início

```
Engenheiro: "Oi, meu nome é Ana Santos e trabalho só aqui"
Chatbot: ✅ Cadastrada! Seu ID é abc-123

Engenheiro: "Criar projeto PRJ-2025-001 para Construtora XYZ"
Chatbot: ✅ Projeto criado!

Engenheiro: "Quero pegar as áreas elétrica e hidráulica desse projeto"
Chatbot: ✅ Você foi adicionada a 2 áreas:
         • Elétrico: 15 dias (0%)
         • Hidráulico: 12 dias (0%)
         Total: 27 dias de trabalho estimado
```

### Dia 2: Início do Trabalho

```
Engenheiro: "Comecei o elétrico hoje, previsão para terminar dia 30/01"
Chatbot: ✅ Registrado! Data início: 05/12/2025, previsão: 30/01/2026
```

### Dia 5: Atualização de Status

```
Engenheiro: "Já estou nas instalações de primeira fase"
Chatbot: ✅ Status atualizado para Instalações de Primeira Fase!
         📊 Seu progresso agora está em 35% (calculado automaticamente)
```

### Dia 10: Atualização de Previsão

```
Engenheiro: "Vou atrasar, nova previsão é 05/02"
Chatbot: ✅ Previsão atualizada para 05/02/2026
         ⚠️ Houve atraso de 6 dias. Tudo bem?
```

### Dia 15: Retrabalho

```
Engenheiro: "Teve retrabalho porque o cliente mudou o projeto"
Chatbot: ✅ Retrabalho registrado. Motivo: alterações do cliente
         Isso será considerado nas métricas
```

### Dia 30: Conclusão

```
Engenheiro: "Terminei o elétrico!"
Chatbot: ✅ Status atualizado para Concluído! 🎉
         📊 100% completo. Parabéns!
```

---

## 📊 Tabelas Principais

### 1. engenheiros
Cadastro de engenheiros.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| eng_id | UUID | ID único |
| nome | TEXT | Nome editável |
| exclusivo | BOOLEAN | Trabalha só aqui? |

### 2. projetos
Cadastro de projetos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| projeto_id | UUID | ID único |
| codigo_projeto | TEXT | Ex: PRJ-001 |
| cliente | TEXT | Nome do cliente |

### 3. areas
Áreas de trabalho (pré-cadastradas).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| area_id | SERIAL | ID único |
| codigo | TEXT | Ex: ELETRICO |
| tempo_trabalho_dias | INT | Calculado auto |

### 4. status_codes
Status/etapas (pré-cadastrados).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| status_id | SERIAL | ID único |
| codigo | TEXT | Ex: EM_PLANEJAMENTO |
| percentual_base | NUMERIC | Calculado auto |

### 5. engenheiros_projetos ⭐
**Tabela principal** - Relaciona tudo.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| eng_id | UUID | FK → engenheiros |
| projeto_id | UUID | FK → projetos |
| area_id | INT | FK → areas |
| data_inicio | DATE | Manual |
| data_prevista | DATE | Manual |
| status_id | INT | Manual |
| **tempo_trabalho_dias** | INT | **AUTOMÁTICO** |
| **percentual_andamento** | NUMERIC | **AUTOMÁTICO** |

---

## 🔐 Segurança (RLS)

Para implementar Row Level Security:

```sql
-- Engenheiros só veem seus próprios dados
ALTER TABLE engenheiros_projetos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Engenheiros veem apenas seus projetos"
ON engenheiros_projetos
FOR SELECT
USING (eng_id = auth.uid());

CREATE POLICY "Engenheiros editam apenas seus projetos"
ON engenheiros_projetos
FOR UPDATE
USING (eng_id = auth.uid());
```

---

## 📈 Monitoramento

### Ver logs de interação

```sql
SELECT 
    prompt_original,
    acao_executada,
    sucesso,
    mensagem_retorno,
    created_at
FROM chatbot_logs
WHERE eng_id = 'abc-123'
ORDER BY created_at DESC
LIMIT 10;
```

### Estatísticas gerais

```sql
SELECT 
    COUNT(*) as total_interacoes,
    COUNT(*) FILTER (WHERE sucesso = true) as sucesso,
    COUNT(*) FILTER (WHERE sucesso = false) as erros,
    COUNT(DISTINCT eng_id) as engenheiros_ativos
FROM chatbot_logs
WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

## 🔗 Integração com Chatbots

### WhatsApp (via Twilio/Evolution API)

```javascript
// Recebe mensagem do WhatsApp
app.post('/webhook/whatsapp', async (req, res) => {
  const { from, body } = req.body
  
  // Busca eng_id pelo telefone
  const eng_id = await buscarEngenheiroByPhone(from)
  
  // Envia para Supabase Edge Function
  const response = await fetch('https://seu-projeto.supabase.co/functions/v1/processar-prompt', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      eng_id,
      prompt: body,
      metadata: { origem: 'whatsapp', telefone: from }
    })
  })
  
  const resultado = await response.json()
  
  // Envia resposta pelo WhatsApp
  await enviarWhatsApp(from, formatarResposta(resultado))
})
```

### Telegram

```javascript
bot.on('message', async (msg) => {
  const eng_id = msg.from.id
  const prompt = msg.text
  
  const response = await fetch('https://seu-projeto.supabase.co/functions/v1/processar-prompt', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ eng_id, prompt })
  })
  
  const resultado = await response.json()
  bot.sendMessage(msg.chat.id, formatarResposta(resultado))
})
```

---

## 🛠️ Troubleshooting

### Erro: "Engenheiro não encontrado"
**Solução:** Cadastre o engenheiro primeiro usando `cadastrar_engenheiro`

### Erro: "Área não encontrada"
**Solução:** Use códigos válidos: ELETRICO, HIDRAULICO, ESTRUTURAL, etc.

### Erro: "Projeto não encontrado"
**Solução:** Crie o projeto antes de atribuir áreas

### Trigger não está calculando automaticamente
**Solução:** Verifique se os triggers foram criados:
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE 'trg_calcular%';
```

---

## 📚 Recursos Adicionais

- **Documentação completa:** `docs/nova_estrutura_bd.md`
- **Diagramas:** `docs/diagrama_bd.md`
- **Integração chatbot:** `docs/integracao_chatbot.md`
- **Supabase Docs:** https://supabase.com/docs

---

## ✅ Checklist de Implementação

- [ ] Criar projeto no Supabase
- [ ] Aplicar `new_db_schema.sql`
- [ ] Aplicar `chatbot_functions.sql`
- [ ] Deploy Edge Function `processar-prompt`
- [ ] Configurar variáveis de ambiente
- [ ] Testar API via curl
- [ ] Integrar com chatbot (WhatsApp/Telegram)
- [ ] Implementar RLS (segurança)
- [ ] Configurar monitoramento
- [ ] Treinar engenheiros nos prompts

---

## 🎯 Próximos Passos

1. **Dashboard em tempo real** (React + Supabase Realtime)
2. **Notificações automáticas** (prazos vencidos, retrabalhos)
3. **Relatórios em PDF** (geração automática)
4. **Integração com Google Sheets** (sincronização bidirecional)
5. **Análise de dados com IA** (previsão de atrasos, sugestões)

---

**Desenvolvido com ❤️ para facilitar a vida dos engenheiros**






