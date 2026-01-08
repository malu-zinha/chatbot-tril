# 🔄 Guia: Sincronização Supabase → Google Sheets

**Objetivo:** Fazer as planilhas do Google Sheets puxarem dados automaticamente do banco de dados Supabase.

---

## 🎯 COMO FUNCIONA

```
Bot salva → Supabase (banco de dados)
                ↓
         (sync automático - 5min)
                ↓
    ┌───────────┴───────────┐
    ↓                       ↓
Planilha Eng 1        Planilha Eng 2
    ↓                       ↓
Planilha Eng 3        Planilha CEO
```

**Vantagens:**
- ✅ Planilhas sempre atualizadas
- ✅ Supabase = fonte única da verdade
- ✅ Múltiplos engenheiros, múltiplas planilhas
- ✅ CEO vê dashboard consolidado
- ✅ Automático (não precisa fazer nada)

---

## ⚙️ CONFIGURAÇÃO

### **Passo 1: Criar Planilhas no Google Sheets**

Crie uma planilha para cada engenheiro + 1 para o CEO:

**Estrutura da planilha do engenheiro:**
- Aba: `Engenheiro(a)`
- Headers na linha 1 (A1:AE1):
  ```
  Código do Projeto | Cliente | Contato | Obra | Área | ...
  (31 colunas no total - mesma estrutura atual)
  ```

**Estrutura da planilha do CEO:**
- Aba: `Dashboard`
- Headers na linha 1 (A1:K1):
  ```
  Código | Cliente | Engenheiro | Área | Status | % | Etapa | ...
  (11 colunas - resumo)
  ```

### **Passo 2: Obter IDs das Planilhas**

Para cada planilha, copie o ID da URL:

```
https://docs.google.com/spreadsheets/d/[ID_AQUI]/edit
                                        ↑
                                   Copie isso
```

### **Passo 3: Configurar .env**

Adicione no arquivo `.env`:

```env
# =====================================================
# SINCRONIZAÇÃO SUPABASE → GOOGLE SHEETS
# =====================================================

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

# Planilha Engenheiro 3 (opcional)
GOOGLE_SHEETS_ENG3_ID=3ghi...rst
GOOGLE_SHEETS_ENG3_NAME=Engenheiro(a)
GOOGLE_SHEETS_ENG3_RANGE=A2:AE1000
GOOGLE_SHEETS_ENG3_WHATSAPP=+5511777777777

# Planilha CEO (Dashboard)
GOOGLE_SHEETS_CEO_ID=4jkl...opq
GOOGLE_SHEETS_CEO_NAME=Dashboard
GOOGLE_SHEETS_CEO_RANGE=A2:K1000

# Agendamento (opcional - padrão: a cada 5 minutos)
SYNC_CRON_SCHEDULE=*/5 * * * *
```

**Explicação:**
- `ENG1_ID` = ID da planilha do Engenheiro 1
- `ENG1_NAME` = Nome da aba (geralmente "Engenheiro(a)")
- `ENG1_RANGE` = Range de dados (A2:AE1000 = 31 colunas, até linha 1000)
- `ENG1_WHATSAPP` = WhatsApp do engenheiro (filtra apenas projetos dele)

### **Passo 4: Compartilhar Planilhas**

Para cada planilha criada:

1. Clique em **Compartilhar**
2. Adicione o email da service account do Google Cloud:
   ```
   seu-projeto@seu-projeto.iam.gserviceaccount.com
   ```
   (Esse email está no arquivo `credentials.json`)
3. Permissão: **Editor**
4. Clique em **Enviar**

---

## 🧪 TESTAR SINCRONIZAÇÃO

### **Teste Manual (uma vez):**

```bash
npm run test:sync
```

**O que acontece:**
1. Conecta no Supabase
2. Busca todos os projetos do banco
3. Filtra por engenheiro (se configurado)
4. Formata dados (31 colunas)
5. Limpa planilha atual
6. Escreve novos dados
7. Repete para cada planilha configurada

**Resultado esperado:**
```
🔄 ========== SINCRONIZAÇÃO INICIADA ==========
⏰ 07/01/2025 20:30:00

🔄 Sincronizando: 1abc...xyz
   ✅ 5 projeto(s) sincronizado(s)

🔄 Sincronizando: 2def...uvw
   ✅ 3 projeto(s) sincronizado(s)

🔄 Sincronizando dashboard CEO...
   ✅ Dashboard CEO atualizado (8 projetos)

✅ ========== SINCRONIZAÇÃO CONCLUÍDA ==========
```

### **Verificar nas Planilhas:**

1. Abra cada planilha no Google Sheets
2. Veja se os dados apareceram
3. Verifique se está filtrando corretamente por engenheiro

---

## 🚀 ATIVAR SINCRONIZAÇÃO AUTOMÁTICA

### **Opção 1: Automático ao Iniciar Bot**

A sincronização já está configurada! Basta rodar:

```bash
npm start
```

ou

```bash
npm run dev
```

**O que acontece:**
1. Bot WhatsApp inicia ✅
2. Cron de notificações inicia ✅
3. Cron de sincronização inicia ✅
4. A cada 5 minutos, sincroniza automaticamente ✅

**Logs que você verá:**
```
🚀 Iniciando Chatbot WhatsApp + Google Sheets...
✅ WhatsApp conectado!
⏰ Iniciando sistema de notificações automáticas...
🔄 Iniciando sincronização automática (Supabase → Sheets)...
⏰ Configurando sincronização automática...
📅 Agendamento: */5 * * * *
   (a cada 5 minutos)
🚀 Executando primeira sincronização...
✅ Sincronização automática ativada!
✅ Sistema completo iniciado com sucesso!
```

### **Opção 2: Apenas Sincronização (sem bot)**

Se quiser rodar apenas a sincronização (sem o bot WhatsApp):

```bash
npm run test:sync
```

---

## ⏰ AGENDAMENTO PERSONALIZADO

Por padrão, sincroniza **a cada 5 minutos**.

Para mudar, edite no `.env`:

```env
# A cada 10 minutos
SYNC_CRON_SCHEDULE=*/10 * * * *

# A cada hora
SYNC_CRON_SCHEDULE=0 * * * *

# A cada 30 minutos
SYNC_CRON_SCHEDULE=*/30 * * * *

# Às 8h, 12h e 18h
SYNC_CRON_SCHEDULE=0 8,12,18 * * *
```

**Formato:** `minuto hora dia mês dia-da-semana`

---

## 📊 ESTRUTURA DOS DADOS

### **Planilha do Engenheiro (31 colunas):**

| Coluna | Campo | Origem |
|--------|-------|--------|
| A | Código do Projeto | `projetos.codigo` |
| B | Cliente | `projetos.cliente` |
| C | Contato | `projetos.contato_cliente` |
| D | Obra | `projetos.tipo_obra` |
| E | Área | `projetos.area` |
| F | Eng. Responsável | `engenheiros.nome` |
| G | Tipo de Projeto | `projetos.tipo_projeto` |
| ... | ... | ... |
| R | Previsão para o dia | `atualizacoes_diarias.previsao_dia` (última) |
| S | Feito ao final do dia | `atualizacoes_diarias.feito_dia` (última) |
| T | Necessitou retrabalho? | `atualizacoes_diarias.necessitou_retrabalho` |
| ... | ... | ... |
| AE | Dias parado TecPred | `projetos.dias_parado_tecpred` |

### **Planilha do CEO (11 colunas - resumo):**

| Coluna | Campo |
|--------|-------|
| A | Código |
| B | Cliente |
| C | Engenheiro |
| D | Área |
| E | Status |
| F | % Concluído |
| G | Etapa |
| H | Data Início |
| I | Previsão Término |
| J | Dias Atraso |
| K | Métrica Retrabalho |

---

## 🔍 FILTROS E LÓGICA

### **Filtro por Engenheiro:**

Se você configurou `GOOGLE_SHEETS_ENG1_WHATSAPP`, a sincronização:
1. Busca todos os projetos do banco
2. Filtra apenas projetos onde `engenheiros.whatsapp = ENG1_WHATSAPP`
3. Escreve apenas esses projetos na planilha

**Resultado:** Cada engenheiro vê apenas seus projetos!

### **Última Atualização Diária:**

Para colunas como "Previsão para o dia" e "Feito ao final do dia":
- Busca a atualização mais recente em `atualizacoes_diarias`
- Ordena por `data DESC`
- Pega a primeira (mais recente)

### **Dashboard CEO:**

Usa a view `view_projetos_completo` que já junta:
- Dados do projeto
- Dados do engenheiro
- Última atualização
- Métricas calculadas

---

## 🐛 SOLUÇÃO DE PROBLEMAS

### **"Nenhum projeto sincronizado"**
→ Verifique se há projetos no Supabase: `npm run test:supabase`  
→ Verifique se o filtro de WhatsApp está correto

### **"Erro ao acessar planilha"**
→ Compartilhe a planilha com a service account  
→ Verifique se o ID da planilha está correto

### **"Erro de permissão"**
→ Service account precisa ser **Editor** da planilha  
→ Verifique `credentials.json`

### **"Dados não aparecem"**
→ Verifique se o range está correto (A2:AE1000)  
→ Verifique se a aba tem o nome correto

### **"Sincronização não roda"**
→ Verifique se Supabase está configurado no `.env`  
→ Rode `npm run test:sync` para testar manualmente

---

## 📈 MONITORAMENTO

### **Ver Logs em Tempo Real:**

Quando o bot está rodando (`npm start`), você verá:

```
🔄 ========== SINCRONIZAÇÃO INICIADA ==========
⏰ 07/01/2025 20:35:00

🔄 Sincronizando: 1abc...xyz
   ✅ 5 projeto(s) sincronizado(s)

✅ ========== SINCRONIZAÇÃO CONCLUÍDA ==========
```

A cada 5 minutos (ou conforme configurado).

### **Verificar Última Sincronização:**

Abra a planilha e veja a data/hora dos dados mais recentes.

---

## ✅ CHECKLIST FINAL

- [ ] Planilhas criadas no Google Sheets
- [ ] IDs das planilhas copiados
- [ ] `.env` configurado com IDs e WhatsApps
- [ ] Planilhas compartilhadas com service account
- [ ] `npm run test:sync` funcionou
- [ ] Dados apareceram nas planilhas
- [ ] Bot iniciado: `npm start`
- [ ] Sincronização automática ativa

---

## 🎯 RESULTADO FINAL

```
Bot salva projeto
      ↓
Supabase (banco)
      ↓
(5 minutos depois)
      ↓
Planilhas atualizadas automaticamente!
```

**Agora as planilhas são visualizações do banco de dados!** 🎉

- ✅ Engenheiros veem seus projetos
- ✅ CEO vê dashboard consolidado
- ✅ Sempre atualizado
- ✅ Automático

