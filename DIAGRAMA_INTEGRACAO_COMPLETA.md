# 📊 Diagrama: Integração Completa Bot + Banco + Planilhas

---

## 🎯 VISÃO GERAL DO SISTEMA

```
┌────────────────────────────────────────────────────────────┐
│                    ENGENHEIROS                              │
│         (WhatsApp - Vários usuários)                       │
└─────────┬──────────────┬──────────────┬────────────────────┘
          │              │              │
    Eng 1 │        Eng 2 │        Eng 3 │
          │              │              │
          └──────────────┴──────────────┘
                       │
                       ↓
        ┌──────────────────────────────┐
        │      CHATBOT WHATSAPP        │
        │   (messageHandler +          │
        │    EngineerProjectFlow)      │
        └──────────────┬───────────────┘
                       │
                       │ Salva dados em 2 lugares
                       ↓
        ┌──────────────────────────────┐
        │     ESTRATÉGIA DUAL:         │
        │                              │
        │  1️⃣ Supabase PRIMEIRO        │
        │  2️⃣ Google Sheets (backup)   │
        └──────────────┬───────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ↓                           ↓
┌──────────────────┐        ┌──────────────────┐
│   SUPABASE       │        │  GOOGLE SHEETS   │
│   PostgreSQL     │        │  (Backup/View)   │
│                  │        │                  │
│ • engenheiros    │        │ Planilha atual   │
│ • projetos       │        │ do engenheiro    │
│ • atualizacoes   │        └──────────────────┘
└─────────┬────────┘
          │
          │ Sincronização automática (cron - 5min)
          │
          ↓
┌─────────────────────────────────────────────┐
│        MÚLTIPLAS PLANILHAS (Sync)          │
│                                             │
│  ┌──────────────┐  ┌──────────────┐       │
│  │ Planilha     │  │ Planilha     │       │
│  │ Engenheiro 1 │  │ Engenheiro 2 │  ...  │
│  └──────────────┘  └──────────────┘       │
│                                             │
│  ┌──────────────────────────────┐          │
│  │ Planilha CEO (Dashboard)     │          │
│  │ Visão consolidada de tudo    │          │
│  └──────────────────────────────┘          │
└─────────────────────────────────────────────┘
```

---

## 🔄 FLUXO DETALHADO: CADASTRAR PROJETO

### **1. Engenheiro Interage**

```
Engenheiro
  │
  ↓ WhatsApp
"projeto"
  │
  ↓
Bot: O que quer fazer?
     1️⃣ Cadastrar
     2️⃣ Atualizar
  │
  ↓
"1"
  │
  ↓
[Fluxo de 11 steps]
Cliente, Contato, Obra, Área, Tipo, Datas...
  │
  ↓
Confirmação
```

### **2. Bot Processa e Salva**

```
EngineerProjectFlow
    │
    ├─> getSupabaseService()
    │    │
    │    ├─> criarOuBuscarEngenheiro(whatsapp, nome)
    │    │   └─> INSERT/SELECT em 'engenheiros'
    │    │
    │    └─> criarProjeto(dados, engenheiroId)
    │        └─> INSERT em 'projetos'
    │        └─> ✅ Salvo no Supabase
    │
    └─> getEngineerSheetService()
         │
         └─> createProject(dados)
             └─> Append row no Google Sheets
             └─> ✅ Salvo na Planilha
```

### **3. Resposta ao Usuário**

```
Bot responde:

✅ Projeto criado com sucesso!

🆔 Código: PRJ-001
👤 Cliente: Cliente ABC
🏗️ Obra: prédio
📊 Tipo: E1
...

✅ Dados salvos no banco de dados
✅ Dados salvos na planilha
```

---

## 🔄 FLUXO DETALHADO: ATUALIZAÇÃO NOTURNA

### **1. Notificação ou Manual**

```
Opção A: Cron dispara às 18h
         Bot envia: "Hora de atualizar PRJ-001"

Opção B: Engenheiro digita "projeto" → "2" → "noite"
```

### **2. Coleta de Dados**

```
Bot pergunta:
  ✔️ Feito ao final do dia? [menu]
  🔄 Necessitou retrabalho? [sim/não]
     └─> Se sim: Motivo? [menu]
  📍 Etapa atual? [menu → % automático]
  📝 Observações? [texto obrigatório]
```

### **3. Salvamento Dual**

```
registrarAtualizacaoNoite()
    │
    ├─> SUPABASE
    │    │
    │    ├─> buscarProjetoPorCodigo(PRJ-001)
    │    │   └─> SELECT em 'projetos' WHERE codigo=...
    │    │
    │    └─> registrarAtualizacaoNoite(projetoId, dados)
    │        ├─> UPSERT em 'atualizacoes_diarias'
    │        │   (se já existe registro hoje, atualiza)
    │        │
    │        └─> UPDATE em 'projetos'
    │            (atualiza etapa_atual e percentual_total)
    │
    └─> GOOGLE SHEETS
         │
         └─> updateNightData(codigo, dados)
             └─> UPDATE row na planilha
```

### **4. Triggers Automáticos (Supabase)**

```
Após UPSERT em 'atualizacoes_diarias':

  1. trigger_sync_etapa_projeto
     └─> Atualiza projetos.etapa_atual

  2. trigger_calcular_metrica_retrabalho
     └─> Recalcula projetos.metrica_retrabalho
         (% de dias com retrabalho)

  3. trigger_atualizar_percentual_projeto
     └─> Atualiza projetos.percentual_total
```

---

## 📊 ESTRUTURA DO BANCO (Supabase)

```sql
┌─────────────────────────────────────────┐
│          engenheiros                    │
├─────────────────────────────────────────┤
│ id (PK)              UUID               │
│ nome                 VARCHAR            │
│ whatsapp             VARCHAR  (UNIQUE)  │
│ email                VARCHAR            │
│ ativo                BOOLEAN            │
└──────────────┬──────────────────────────┘
               │ 1
               │
               │ N
┌──────────────┴──────────────────────────┐
│          projetos                       │
├─────────────────────────────────────────┤
│ id (PK)              UUID               │
│ codigo               VARCHAR  (UNIQUE)  │
│ cliente              VARCHAR            │
│ engenheiro_id (FK)   UUID               │
│ contato_cliente      VARCHAR            │
│ tipo_obra            VARCHAR            │
│ area                 VARCHAR            │
│ tipo_projeto         VARCHAR            │
│ status               VARCHAR            │
│ percentual_total     NUMERIC(5,2)       │
│ etapa_atual          VARCHAR            │
│ data_inicio          DATE               │
│ data_previsao_termino DATE              │
│ ... +16 campos novos                    │
└──────────────┬──────────────────────────┘
               │ 1
               │
               │ N
┌──────────────┴──────────────────────────┐
│       atualizacoes_diarias              │
├─────────────────────────────────────────┤
│ id (PK)              UUID               │
│ projeto_id (FK)      UUID               │
│ data                 DATE               │
│ previsao_dia         TEXT               │
│ feito_dia            TEXT               │
│ necessitou_retrabalho BOOLEAN           │
│ motivo_revisao       VARCHAR            │
│ observacoes          TEXT               │
│                                         │
│ UNIQUE(projeto_id, data)                │
└─────────────────────────────────────────┘
```

---

## 🔄 SINCRONIZAÇÃO FUTURA (Opcional)

### **Cron Job a cada 5 minutos:**

```
Supabase
   │
   │ Lê todos os projetos
   │ Agrupa por engenheiro
   │
   ↓
┌───────────────────────────────────┐
│  engineer_sync.ts                 │
│                                   │
│  Para cada engenheiro:            │
│    1. Buscar projetos no banco    │
│    2. Formatar para planilha      │
│    3. Atualizar Google Sheets     │
└───────────────────────────────────┘
   │
   ↓
Planilha Eng 1 → Atualizada
Planilha Eng 2 → Atualizada
Planilha Eng 3 → Atualizada

E também:
┌───────────────────────────────────┐
│  ceo_sync.ts                      │
│                                   │
│  1. Buscar view consolidada       │
│  2. Agregar métricas              │
│  3. Atualizar planilha CEO        │
└───────────────────────────────────┘
   │
   ↓
Planilha CEO → Dashboard atualizado
```

---

## 💡 VANTAGENS DA ARQUITETURA

### **1. Redundância**
- ✅ Dados salvos em 2 lugares
- ✅ Se Supabase cair, Google Sheets continua
- ✅ Se Google API cair, Supabase continua

### **2. Performance**
- ✅ Bot salva rápido (não espera sync)
- ✅ Sync acontece em background (cron)
- ✅ Planilhas sempre atualizadas

### **3. Escalabilidade**
- ✅ Supabase = banco de dados real
- ✅ Suporta milhares de projetos
- ✅ Queries rápidas e otimizadas
- ✅ Triggers automáticos

### **4. Flexibilidade**
- ✅ CEO vê dashboard consolidado
- ✅ Engenheiros veem só seus projetos
- ✅ Histórico completo dia a dia
- ✅ Métricas calculadas automaticamente

---

## 📈 MÉTRICAS AUTOMÁTICAS

O banco calcula automaticamente:

1. **Dias de atraso**
   - Compara data prevista vs data atual
   - Atualizado diariamente

2. **Métrica de retrabalho**
   - % de dias que tiveram retrabalho
   - Calculada por trigger

3. **Percentual executado**
   - Baseado na etapa atual
   - Sincronizado automaticamente

4. **Lead time**
   - Dias úteis entre início e entrega
   - Calculado quando projeto finaliza

---

## ✅ RESULTADO FINAL

```
┌──────────────────────────────────────────┐
│  ENGENHEIROS                             │
│  (WhatsApp)                              │
└────────┬─────────────────────────────────┘
         │
         ↓ Conversam com bot
┌──────────────────────────────────────────┐
│  BOT SIMPLIFICADO                        │
│  • Apenas menus guiados                  │
│  • Sem IA (arquivada)                    │
│  • Suporte a áudio                       │
└────────┬─────────────────────────────────┘
         │
         ↓ Salva dados
┌──────────────────────────────────────────┐
│  SUPABASE (Banco PostgreSQL)             │
│  ✅ Fonte única da verdade               │
│  ✅ Triggers automáticos                 │
│  ✅ Views consolidadas                   │
└────────┬─────────────────────────────────┘
         │
         ↓ Sincroniza (cron - 5min)
┌──────────────────────────────────────────┐
│  MÚLTIPLAS PLANILHAS                     │
│  ✅ Visualização                         │
│  ✅ Backup                               │
│  ✅ Dashboard CEO                        │
└──────────────────────────────────────────┘
```

---

**Sistema completo integrado e pronto para uso!** 🎉

