# ⚡ Configuração Rápida - Planilhas como Visualização

**Tempo estimado:** 10 minutos

---

## 🎯 OBJETIVO

Configurar planilhas do Google Sheets para exibirem automaticamente os dados do Supabase.

---

## 📋 PASSOS

### **1. Criar Planilha(s) no Google Sheets**

Crie uma ou mais planilhas:
- **1 planilha por engenheiro** (visualização filtrada)
- **1 planilha para CEO** (dashboard consolidado) - opcional

#### **Estrutura da Planilha do Engenheiro:**

**Nome da Aba:** `Engenheiro(a)`

**Linha 1 (Headers - A1:AE1):**
```
Código do Projeto | Cliente | Contato | Obra | Área | Eng. Responsável | Tipo de Projeto | Descrição do projeto | Complexidade | Dias estimados (interno) | Data de Início | Data de Previsão de entrega (interna) | Data Final (acordado com o cliente) | Prazo Interno (dias úteis) | Prazo Cliente (dias úteis) | Dias de atraso | Status do projeto | Previsão para o dia | Feito ao final do dia | Necessitou de retrabalho? | motivo da revisão | Data do registro do retrabalho | Etapa | % executado | Observações | Métrica de retrabalho | Dias estimados (dias úteis) | Data de entrega real | Lead Time (dias úteis) | Dias Parado cliente | Dias parado TecPred
```

**Linhas 2+:** Vazio (serão preenchidas automaticamente)

#### **Estrutura da Planilha do CEO (Opcional):**

**Nome da Aba:** `Dashboard`

**Linha 1 (Headers - A1:K1):**
```
Código | Cliente | Engenheiro | Área | Status | % | Etapa | Data Início | Previsão | Dias Atraso | Métrica Retrabalho
```

---

### **2. Obter ID da Planilha**

Na URL da planilha:
```
https://docs.google.com/spreadsheets/d/1abc...xyz/edit
                                        ↑
                                  Copie este ID
```

---

### **3. Compartilhar Planilha com Service Account**

1. Abra a planilha
2. Clique em **Compartilhar**
3. Adicione o email da service account:
   - Encontre em: `credentials.json` → campo `client_email`
   - Exemplo: `seu-projeto@seu-projeto.iam.gserviceaccount.com`
4. Permissão: **Editor**
5. Clique em **Enviar**

---

### **4. Configurar .env**

Adicione as seguintes variáveis no arquivo `.env`:

#### **Para 1 Engenheiro:**
```env
# Planilha Engenheiro 1
GOOGLE_SHEETS_ENG1_ID=1abc...xyz
GOOGLE_SHEETS_ENG1_NAME=Engenheiro(a)
GOOGLE_SHEETS_ENG1_RANGE=A2:AE1000
GOOGLE_SHEETS_ENG1_WHATSAPP=+5511999999999
```

#### **Para Múltiplos Engenheiros:**
```env
# Planilha Engenheiro 1
GOOGLE_SHEETS_ENG1_ID=1abc...xyz
GOOGLE_SHEETS_ENG1_NAME=Engenheiro(a)
GOOGLE_SHEETS_ENG1_RANGE=A2:AE1000
GOOGLE_SHEETS_ENG1_WHATSAPP=+5511999999999

# Planilha Engenheiro 2
GOOGLE_SHEETS_ENG2_ID=2def...uvw
GOOGLE_SHEETS_ENG2_NAME=Engenheiro(a)
GOOGLE_SHEETS_ENG2_RANGE=A2:AE1000
GOOGLE_SHEETS_ENG2_WHATSAPP=+5511888888888

# Planilha Engenheiro 3
GOOGLE_SHEETS_ENG3_ID=3ghi...rst
GOOGLE_SHEETS_ENG3_NAME=Engenheiro(a)
GOOGLE_SHEETS_ENG3_RANGE=A2:AE1000
GOOGLE_SHEETS_ENG3_WHATSAPP=+5511777777777
```

#### **Dashboard CEO (Opcional):**
```env
# Planilha CEO
GOOGLE_SHEETS_CEO_ID=4jkl...opq
GOOGLE_SHEETS_CEO_NAME=Dashboard
GOOGLE_SHEETS_CEO_RANGE=A2:K1000
```

#### **Agendamento (Opcional):**
```env
# Sincronização a cada 5 minutos (padrão)
SYNC_CRON_SCHEDULE=*/5 * * * *

# Outras opções:
# */10 * * * *    → a cada 10 minutos
# 0 * * * *       → a cada hora
# */2 * * * *     → a cada 2 minutos
```

---

### **5. Testar Sincronização Manual**

```bash
npm run test:sync
```

**Resultado esperado:**
```
🔄 ========== SINCRONIZAÇÃO INICIADA ==========
⏰ 07/01/2025 21:00:00

🔄 Sincronizando: 1abc...xyz
   ✅ 3 projeto(s) sincronizado(s)

✅ ========== SINCRONIZAÇÃO CONCLUÍDA ==========
```

Abra a planilha e verifique se os dados apareceram!

---

### **6. Iniciar Bot com Sincronização Automática**

```bash
npm start
```

ou (desenvolvimento):

```bash
npm run dev
```

**O que acontece:**
- ✅ Bot WhatsApp inicia
- ✅ Notificações automáticas ativadas
- ✅ **Sincronização automática ativada (a cada 5 minutos)**

**Logs:**
```
🚀 Iniciando Chatbot WhatsApp + Google Sheets...
✅ WhatsApp conectado!
⏰ Iniciando sistema de notificações automáticas...
🔄 Iniciando sincronização automática (Supabase → Sheets)...
⏰ Configurando sincronização automática...
📅 Agendamento: */5 * * * *
✅ Sincronização automática ativada!
✅ Sistema completo iniciado com sucesso!
```

---

## ✅ CHECKLIST

- [ ] Planilha(s) criada(s) no Google Sheets
- [ ] Headers na linha 1
- [ ] ID(s) da(s) planilha(s) copiado(s)
- [ ] Planilha(s) compartilhada(s) com service account (Editor)
- [ ] Variáveis adicionadas no `.env`
- [ ] `npm run test:sync` funcionou
- [ ] Dados apareceram na planilha
- [ ] `npm start` rodando
- [ ] Sincronização automática ativa

---

## 🎉 PRONTO!

Agora:
1. ✅ Bot salva no Supabase
2. ✅ Planilhas são atualizadas automaticamente (5 min)
3. ✅ Cada engenheiro vê só seus projetos
4. ✅ CEO vê dashboard consolidado (se configurado)

**As planilhas são agora visualizações do banco de dados!** 🚀

