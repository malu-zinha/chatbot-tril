# 🧪 Teste Completo no Terminal

**Objetivo:** Testar bot salvando no Supabase e atualizando planilhas automaticamente, tudo pelo terminal (sem WhatsApp).

---

## 🎯 FLUXO QUE VAMOS TESTAR

```
Terminal → Bot → Supabase → Comando "sync" → Google Sheets
```

**Resultado esperado:**
1. ✅ Cadastrar projeto pelo terminal
2. ✅ Dados salvos no Supabase
3. ✅ Sincronizar manualmente (comando "sync")
4. ✅ Ver dados na planilha do Google Sheets

---

## ⚙️ PRÉ-REQUISITOS

### **1. Verificar .env**

Execute:
```bash
npm run check:env
```

**Deve mostrar:**
```
✅ SUPABASE_URL
✅ SUPABASE_SERVICE_ROLE_KEY
✅ GOOGLE_APPLICATION_CREDENTIALS
✅ OPENAI_API_KEY
✅ GOOGLE_SHEETS_ENGINEER_ID (ou GOOGLE_SHEETS_ENG1_ID)
```

**Se aparecer ❌:** Corrija o formato do `.env`:
- SEM `export`
- SEM espaços antes da variável
- SEM espaços ao redor do `=`
- Formato: `VAR=valor`

---

### **2. Testar Supabase**

Execute:
```bash
npm run test:supabase
```

**Resultado esperado:**
```
✅ Supabase conectado
✅ Tabelas encontradas
✅ Engenheiro criado/atualizado
```

**Se der erro:** Verifique as credenciais do Supabase no `.env`

---

### **3. Verificar planilha configurada**

No `.env`, deve ter uma destas opções:

**Opção A - Usar planilha existente:**
```env
GOOGLE_SHEETS_ENGINEER_ID=sua_planilha_id
GOOGLE_SHEETS_ENGINEER_SHEET=Engenheiro(a)
GOOGLE_SHEETS_ENGINEER_RANGE=A2:AE1000
```

**Opção B - Nova planilha:**
```env
GOOGLE_SHEETS_ENG1_ID=sua_planilha_id
GOOGLE_SHEETS_ENG1_NAME=Engenheiro(a)
GOOGLE_SHEETS_ENG1_RANGE=A2:AE1000
GOOGLE_SHEETS_ENG1_WHATSAPP=+5511999999999
```

---

## 🚀 TESTE PASSO A PASSO

### **PASSO 1: Iniciar bot no terminal**

```bash
npm run test:bot-completo
```

**O que você verá:**
```
╔════════════════════════════════════════════════════════════╗
║     🤖 TESTE COMPLETO DO BOT - Terminal                  ║
║     (Bot + Supabase + Sincronização)                     ║
╚════════════════════════════════════════════════════════════╝

✅ Supabase conectado
✅ Sincronização configurada

💡 Como usar:
   • Digite como se fosse no WhatsApp
   • Comandos: menu, projeto, ajuda
   • Para testar sincronização: sync
   • Para sair: sair

💬 Você: oi

🤖 Bot:
👋 Olá! Bem-vindo ao Sistema de Gestão de Projetos
...
```

---

### **PASSO 2: Cadastrar um projeto**

Digite no terminal:
```
projeto
```

Depois:
```
1
```

**O bot vai perguntar (siga o fluxo):**
```
📝 Nome do cliente: Digite: Empresa Teste LTDA

📞 Contato do cliente: Digite: João Silva

🏗️ Tipo de obra: Digite: 1 (Residencial)

📂 Área: Digite: 1 (Arquitetura)

🎨 Tipo de projeto: Digite: 1 (Completo)

📝 Descrição do projeto: Digite: Casa moderna 2 andares

⚡ Complexidade: Digite: 1 (Baixa)

📅 Data de previsão (interna): Digite: 15/02/2025

📅 Data final (cliente): Digite: 20/02/2025

✅ Confirmar? Digite: 1 (Sim)
```

---

### **PASSO 3: Verificar salvamento**

**O bot vai responder:**
```
✅ Projeto criado com sucesso!

🆔 Código: PRJ-001
👤 Cliente: Empresa Teste LTDA
...

✅ Dados salvos no banco de dados
🔄 Planilhas serão atualizadas automaticamente (até 5min)

💾 Projeto salvo no Supabase!
🔄 Planilhas serão atualizadas em até 5 minutos
   Ou digite 'sync' para sincronizar agora
```

---

### **PASSO 4: Sincronizar planilha AGORA**

Digite no terminal:
```
sync
```

**O que acontece:**
```
🔄 Executando sincronização manual...

🔄 ========== SINCRONIZAÇÃO INICIADA ==========
⏰ 07/01/2025 21:30:00

🔄 Sincronizando: 1abc...xyz
   ✅ 1 projeto(s) sincronizado(s)

✅ ========== SINCRONIZAÇÃO CONCLUÍDA ==========

✅ Sincronização concluída!
💡 Verifique suas planilhas no Google Sheets
```

---

### **PASSO 5: Verificar na planilha**

1. **Abra sua planilha do Google Sheets**
2. **Veja se apareceu a linha nova:**
   ```
   | PRJ-001 | Empresa Teste LTDA | João Silva | ... |
   ```
3. **✅ Sucesso!** O dado foi do terminal → Supabase → Planilha!

---

### **PASSO 6: Testar atualização (opcional)**

Digite no terminal:
```
projeto
```

Depois:
```
2
```

**Escolher atualização:**
```
1️⃣ Manhã (Status + Previsão)
2️⃣ Noite (Feito + Retrabalho + Etapa)
```

Digite:
```
1
```

**Informar código do projeto:**
```
PRJ-001
```

**Seguir o fluxo de atualização matinal:**
```
Status: 1 (Em Execução)
Previsão: 1 (opção do menu)
Confirmar: 1
```

**Bot responde:**
```
✅ Atualização matinal salva com sucesso!
✅ Salvo no banco de dados
🔄 Planilhas serão atualizadas automaticamente
```

**Sincronizar novamente:**
```
sync
```

**Verificar na planilha:**
- Coluna "Status do projeto" → atualizada
- Coluna "Previsão para o dia" → atualizada

---

## 🎯 COMANDOS ESPECIAIS NO TERMINAL

| Comando | O que faz |
|---------|-----------|
| `projeto` | Iniciar fluxo de projetos |
| `menu` | Mostrar menu principal |
| `sync` | Sincronizar planilhas AGORA |
| `sair` | Sair do teste |

---

## ✅ CHECKLIST DO TESTE

- [ ] `.env` configurado (testado com `npm run check:env`)
- [ ] Supabase conectado (testado com `npm run test:supabase`)
- [ ] Planilha configurada no `.env`
- [ ] Bot iniciado (`npm run test:bot-completo`)
- [ ] Projeto cadastrado via terminal
- [ ] Bot confirmou salvamento no Supabase
- [ ] Comando `sync` executado
- [ ] Dados apareceram na planilha do Google Sheets
- [ ] ✅ **TESTE COMPLETO!**

---

## 🐛 PROBLEMAS COMUNS

### **"Supabase não configurado"**
→ Verifique `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no `.env`

### **"Nenhuma planilha configurada"**
→ Adicione `GOOGLE_SHEETS_ENGINEER_ID` ou `GOOGLE_SHEETS_ENG1_ID` no `.env`

### **"Erro ao sincronizar"**
→ Verifique se a planilha está compartilhada com a service account

### **"Dados não aparecem na planilha"**
→ Verifique:
1. ID da planilha está correto
2. Aba tem o nome correto (`Engenheiro(a)`)
3. Headers na linha 1 (31 colunas)

---

## 🎉 RESULTADO FINAL

```
Terminal
   ↓
Bot (você digita comandos)
   ↓
Supabase (salva no banco)
   ↓
Comando "sync"
   ↓
Google Sheets (atualiza planilha)
```

**Tudo funcionando!** 🚀

---

## 📝 PRÓXIMO PASSO

Depois que funcionar no terminal, você pode:
1. Rodar o bot WhatsApp real: `npm start`
2. Ativar sincronização automática (a cada 5 min)
3. Usar normalmente!

