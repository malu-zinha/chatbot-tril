# ⚡ Implementação Rápida - 5 Passos

Guia rápido para colocar o sistema no ar em **menos de 30 minutos**.

---

## 📋 Checklist Rápida

```
☐ Conta no Supabase
☐ Schema criado
☐ Functions instaladas
☐ API testada
☐ Chatbot conectado
```

---

## 🚀 Passo 1: Criar Projeto no Supabase (5 min)

### 1.1. Acessar Supabase
1. Vá em https://supabase.com
2. Clique em **"Start your project"**
3. Faça login (GitHub ou email)

### 1.2. Criar Novo Projeto
1. Clique em **"New Project"**
2. Preencha:
   - **Name:** `tecpred-chatbot`
   - **Database Password:** (anote em lugar seguro!)
   - **Region:** South America (São Paulo)
3. Clique em **"Create new project"**
4. ⏳ Aguarde ~2 minutos

### 1.3. Copiar Credenciais
1. Vá em **Settings** → **API**
2. Copie e salve:
   ```
   URL: https://xxxxxx.supabase.co
   anon/public key: eyJhbGc...
   service_role key: eyJhbGc... (SECRETO!)
   ```

✅ **Passo 1 concluído!**

---

## 🗃️ Passo 2: Criar Banco de Dados (10 min)

### 2.1. Abrir SQL Editor
1. No painel do Supabase, clique em **SQL Editor** (ícone </> no menu lateral)
2. Clique em **"New query"**

### 2.2. Executar Schema Principal
1. Abra o arquivo `supabase/new_db_schema.sql`
2. **Copie TODO o conteúdo**
3. **Cole** no SQL Editor do Supabase
4. Clique em **"Run"** (ou Ctrl+Enter)
5. ✅ Deve aparecer "Success. No rows returned"

### 2.3. Executar Functions do Chatbot
1. Clique em **"New query"** novamente
2. Abra o arquivo `supabase/chatbot_functions.sql`
3. **Copie TODO o conteúdo**
4. **Cole** no SQL Editor
5. Clique em **"Run"**
6. ✅ Deve aparecer "Success. No rows returned"

### 2.4. Verificar Instalação
Execute esta query:
```sql
-- Verificar tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Deve retornar:
-- areas
-- chatbot_logs
-- engenheiros
-- engenheiros_projetos
-- execucao
-- prazos
-- projetos
-- projetos_previsao
-- retrabalho_projetos
-- status_codes
```

✅ **Passo 2 concluído!** Banco criado com 10 tabelas, triggers e functions.

---

## 🧪 Passo 3: Testar Functions (5 min)

### 3.1. Cadastrar Engenheiro de Teste
No SQL Editor, execute:

```sql
SELECT cadastrar_engenheiro(
    p_nome := 'João Silva',
    p_exclusivo := true
);
```

**Resultado esperado:**
```json
{
  "sucesso": true,
  "mensagem": "Engenheiro cadastrado com sucesso!",
  "eng_id": "abc-123-xyz...",
  "nome": "João Silva",
  "exclusivo": true
}
```

✅ Se funcionou, copie o `eng_id` retornado!

### 3.2. Criar Projeto de Teste
```sql
SELECT criar_projeto(
    p_codigo := 'PRJ-TEST-001',
    p_cliente := 'Cliente Teste'
);
```

**Resultado esperado:**
```json
{
  "sucesso": true,
  "mensagem": "Projeto criado com sucesso!",
  "projeto_id": "xyz-789...",
  "codigo": "PRJ-TEST-001",
  "cliente": "Cliente Teste"
}
```

✅ Copie o `projeto_id`!

### 3.3. Atribuir Área (Teste de Triggers Automáticos!)
```sql
SELECT atribuir_area_projeto(
    p_eng_id := 'SEU_ENG_ID_AQUI',  -- Cole o eng_id do passo 3.1
    p_projeto_id := 'SEU_PROJETO_ID_AQUI',  -- Cole o projeto_id do passo 3.2
    p_area_codigo := 'ELETRICO',
    p_data_inicio := CURRENT_DATE,
    p_data_prevista := CURRENT_DATE + INTERVAL '15 days'
);
```

**Resultado esperado:**
```json
{
  "sucesso": true,
  "mensagem": "Área atribuída com sucesso! Tempo e percentual calculados automaticamente.",
  "atribuicao_id": "def-456...",
  "tempo_trabalho_dias": 15,  ← CALCULADO AUTOMATICAMENTE!
  "percentual_andamento": 0.00
}
```

🎉 **Se `tempo_trabalho_dias = 15`, os triggers estão funcionando!**

### 3.4. Atualizar Status (Teste de Cálculo de Percentual!)
```sql
SELECT atualizar_status_projeto(
    p_atribuicao_id := 'SEU_ATRIBUICAO_ID_AQUI',  -- Cole o atribuicao_id do passo 3.3
    p_status_codigo := 'INSTALACOES_GROSSO'
);
```

**Resultado esperado:**
```json
{
  "sucesso": true,
  "mensagem": "Status atualizado! Percentual calculado automaticamente.",
  "percentual_andamento": 35.00  ← CALCULADO AUTOMATICAMENTE!
}
```

🎉 **Se `percentual_andamento = 35.00`, tudo funcionando perfeitamente!**

✅ **Passo 3 concluído!** Banco testado e funcionando.

---

## 🌐 Passo 4: Testar API via HTTP (5 min)

### 4.1. Testar com cURL

Abra o terminal e execute (substituindo as credenciais):

```bash
curl -X POST \
  'https://SEU_PROJETO.supabase.co/rest/v1/rpc/buscar_meus_projetos' \
  -H "apikey: SUA_ANON_KEY" \
  -H "Authorization: Bearer SUA_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_eng_id": "SEU_ENG_ID"}'
```

**Resultado esperado:**
```json
[
  {
    "projeto_codigo": "PRJ-TEST-001",
    "cliente": "Cliente Teste",
    "area": "Elétrico",
    "data_inicio": "2025-12-05",
    "data_prevista": "2025-12-20",
    "status": "Instalações de Primeira Fase",
    "percentual": 35.00,
    "tempo_trabalho_dias": 15
  }
]
```

✅ **Se retornou JSON com dados, API está funcionando!**

### 4.2. Testar com Postman (Opcional)

1. Abra Postman
2. Crie nova request POST
3. URL: `https://SEU_PROJETO.supabase.co/rest/v1/rpc/buscar_meus_projetos`
4. Headers:
   ```
   apikey: SUA_ANON_KEY
   Authorization: Bearer SUA_ANON_KEY
   Content-Type: application/json
   ```
5. Body (raw JSON):
   ```json
   {
     "p_eng_id": "SEU_ENG_ID"
   }
   ```
6. Send

✅ **Passo 4 concluído!** API funcionando.

---

## 🤖 Passo 5: Conectar Chatbot (5 min)

### Opção A: WhatsApp (via Evolution API / Twilio)

```javascript
// webhook.js
const express = require('express')
const fetch = require('node-fetch')

const app = express()
app.use(express.json())

const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co'
const SUPABASE_KEY = 'SUA_ANON_KEY'

app.post('/webhook/whatsapp', async (req, res) => {
  const { from, body } = req.body // Mensagem do WhatsApp
  
  // Busca eng_id pelo telefone (ou use mapping fixo para testes)
  const eng_id = 'SEU_ENG_ID_TESTE'
  
  // Interpreta prompt (exemplo simples)
  let resposta = ''
  
  if (body.toLowerCase().includes('meus projetos')) {
    // Busca projetos
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/buscar_meus_projetos`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_eng_id: eng_id })
    })
    
    const projetos = await response.json()
    resposta = `📋 Seus projetos:\n\n`
    projetos.forEach(p => {
      resposta += `• ${p.projeto_codigo} - ${p.area} (${p.percentual}%)\n`
    })
  } else {
    resposta = 'Olá! Comandos disponíveis: "meus projetos"'
  }
  
  // Envia resposta (adapte para sua API do WhatsApp)
  await enviarWhatsApp(from, resposta)
  
  res.json({ success: true })
})

app.listen(3000, () => console.log('Webhook rodando na porta 3000'))
```

### Opção B: Telegram

```javascript
const TelegramBot = require('node-telegram-bot-api')
const fetch = require('node-fetch')

const bot = new TelegramBot('SEU_TOKEN_TELEGRAM', { polling: true })

const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co'
const SUPABASE_KEY = 'SUA_ANON_KEY'

bot.on('message', async (msg) => {
  const chatId = msg.chat.id
  const texto = msg.text.toLowerCase()
  
  const eng_id = 'SEU_ENG_ID_TESTE'
  
  if (texto.includes('meus projetos')) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/buscar_meus_projetos`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_eng_id: eng_id })
    })
    
    const projetos = await response.json()
    let resposta = '📋 Seus projetos:\n\n'
    projetos.forEach(p => {
      resposta += `• ${p.projeto_codigo} - ${p.area} (${p.percentual}%)\n`
    })
    
    bot.sendMessage(chatId, resposta)
  } else {
    bot.sendMessage(chatId, 'Olá! Digite "meus projetos"')
  }
})

console.log('Bot do Telegram rodando...')
```

### Opção C: Teste Manual (mais simples!)

Use o **Table Editor** do Supabase:

1. Vá em **Table Editor** no Supabase
2. Selecione a tabela `engenheiros_projetos`
3. Clique em qualquer linha para ver os dados
4. Edite `status_id` manualmente e veja o `percentual_andamento` mudar automaticamente!

✅ **Passo 5 concluído!** Sistema funcionando de ponta a ponta!

---

## 🎉 Sistema Completo!

Você agora tem:

✅ Banco de dados PostgreSQL no Supabase  
✅ 10 tabelas criadas  
✅ 9 functions PostgreSQL funcionando  
✅ Triggers automáticos (tempo e percentual calculados)  
✅ API REST exposta  
✅ Logs de interações  
✅ Chatbot conectado (básico)  

---

## 🔧 Solução de Problemas

### Erro: "relation does not exist"
**Solução:** Execute novamente o `new_db_schema.sql`

### Erro: "function does not exist"
**Solução:** Execute novamente o `chatbot_functions.sql`

### Triggers não estão funcionando
**Verificar:**
```sql
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname LIKE 'trg_%';

-- Deve retornar:
-- trg_calcular_tempo_trabalho | O
-- trg_calcular_percentual_status | O
-- trg_engenheiros_updated_at | O
-- ...
```

### API retorna erro 401
**Solução:** Verifique se está usando a `anon key` correta

### Chatbot não responde
**Solução:** 
1. Verifique logs do servidor
2. Teste a API via cURL primeiro
3. Confirme que o `eng_id` existe no banco

---

## 📚 Próximos Passos

Agora que o básico está funcionando:

1. **Implementar interpretação inteligente de prompts** (usar Claude/GPT)
2. **Adicionar mais comandos** (criar projeto, atualizar status, etc.)
3. **Implementar RLS** (segurança)
4. **Criar dashboard web** (React + Supabase Realtime)
5. **Notificações automáticas** (lembretes de atualização)

---

## 🆘 Precisa de Ajuda?

Consulte:
- `docs/nova_estrutura_bd.md` - Documentação completa
- `docs/integracao_chatbot.md` - Guia de integração
- `docs/exemplo_conversas_chatbot.md` - Exemplos de uso
- `docs/README_SUPABASE_CHATBOT.md` - Visão geral

---

**🎯 Meta alcançada: Sistema no ar em 30 minutos!**




