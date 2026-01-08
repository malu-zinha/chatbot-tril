# 📊 Mapeamento Completo: Planilha → Banco de Dados

## 🎯 Objetivo
Este documento mapeia **todas as colunas** da planilha Google Sheets para os campos correspondentes no banco de dados Supabase.

---

## 📋 Tabela de Mapeamento Completo

| # | **Coluna Planilha (Google Sheets)** | **Campo Banco de Dados** | **Tabela** | **Tipo** | **Notas** |
|---|--------------------------------------|--------------------------|------------|----------|-----------|
| 1 | `Código do Projeto` | `codigo` | `projetos` | VARCHAR(50) | PK de busca, único |
| 2 | `Cliente` | `cliente` | `projetos` | VARCHAR(255) | Nome do cliente |
| 3 | `Contato` | `contato_cliente` | `projetos` | VARCHAR(255) | ✨ **NOVO** - Tel/Email |
| 4 | `Obra` | `tipo_obra` | `projetos` | VARCHAR(100) | casa/prédio/comercial/misto |
| 5 | `Área` | `area` | `projetos` | VARCHAR(100) | climatização/elétrica/etc |
| 6 | `Eng. Responsável` | `nome` (via FK) | `engenheiros` | VARCHAR(255) | Relacionamento |
| 7 | `Tipo de Projeto` | `tipo_projeto` | `projetos` | VARCHAR(10) | ✨ **NOVO** - H1/E1/T1/etc |
| 8 | `Descrição do projeto` | `descricao_projeto` | `projetos` | TEXT | ✨ **NOVO** - Auto-gerada |
| 9 | `Complexidade` | `complexidade` | `projetos` | VARCHAR(50) | ✨ **NOVO** - Nível |
| 10 | `Dias estimados (interno)` | `dias_estimados_interno` | `projetos` | INTEGER | ✨ **NOVO** |
| 11 | `Data de Início` | `data_inicio` | `projetos` | DATE | Data real de início |
| 12 | `Data de Previsão de entrega (interna)` | `data_previsao_termino` | `projetos` | DATE | Previsão interna |
| 13 | `Data Final (acordado com o cliente)` | `data_final_cliente` | `projetos` | DATE | ✨ **NOVO** - Acordado |
| 14 | `Prazo Interno (dias úteis)` | `prazo_interno_dias` | `projetos` | INTEGER | ✨ **NOVO** - Calculado |
| 15 | `Prazo Cliente (dias úteis)` | `prazo_cliente_dias` | `projetos` | INTEGER | ✨ **NOVO** - Calculado |
| 16 | `Dias de atraso` | `dias_atraso` | `projetos` | INTEGER | ✨ **NOVO** - Auto-calc |
| 17 | `Status do projeto` | `status` | `projetos` | VARCHAR(50) | em execução/parado/etc |
| 18 | `Previsão para o dia` | `previsao_dia` | `atualizacoes_diarias` | TEXT | ✨ **NOVA TABELA** |
| 19 | `Feito ao final do dia` | `feito_dia` | `atualizacoes_diarias` | TEXT | ✨ **NOVA TABELA** |
| 20 | `Necessitou de retrabalho?` | `necessitou_retrabalho` | `atualizacoes_diarias` | BOOLEAN | ✨ **NOVA TABELA** |
| 21 | `motivo da revisão` | `motivo_revisao` | `atualizacoes_diarias` | VARCHAR(255) | ✨ **NOVA TABELA** |
| 22 | `Data do registro do retrabalho` | `data_registro_retrabalho` | `atualizacoes_diarias` | DATE | ✨ **NOVA TABELA** |
| 23 | `Etapa` | `etapa` + `etapa_atual` | `atualizacoes_diarias` + `projetos` | VARCHAR(100) | Sincronizado |
| 24 | `% executado` | `percentual_total` | `projetos` | NUMERIC(5,2) | 0-100 |
| 25 | `Observações` | `observacoes` (ambas) | `projetos` + `atualizacoes_diarias` | TEXT | Geral + dia |
| 26 | `Métrica de retrabalho` | `metrica_retrabalho` | `projetos` | NUMERIC(5,2) | ✨ **NOVO** - Auto-calc |
| 27 | `Dias estimados (dias úteis)` | `dias_estimados_interno` | `projetos` | INTEGER | Duplicado da col 10 |
| 28 | `Data de entrega real` | `data_entrega_real` | `projetos` | DATE | ✨ **NOVO** |
| 29 | `Lead Time (dias úteis)` | `lead_time_dias` | `projetos` | INTEGER | ✨ **NOVO** - Auto-calc |
| 30 | `Dias Parado cliente (dias úteis)` | `dias_parado_cliente` | `projetos` | INTEGER | ✨ **NOVO** |
| 31 | `Dias parado TecPred (dias úteis)` | `dias_parado_tecpred` | `projetos` | INTEGER | ✨ **NOVO** |

---

## 🆕 Novas Estruturas Criadas

### **Tabela: `atualizacoes_diarias`** (Nova)

Armazena as atualizações matinais e noturnas feitas pelos engenheiros:

```sql
CREATE TABLE atualizacoes_diarias (
    id UUID PRIMARY KEY,
    projeto_id UUID REFERENCES projetos(id),
    data DATE DEFAULT CURRENT_DATE,
    
    -- Manhã
    previsao_dia TEXT,
    status_projeto VARCHAR(50),
    
    -- Noite
    feito_dia TEXT,
    necessitou_retrabalho BOOLEAN,
    motivo_revisao VARCHAR(255),
    data_registro_retrabalho DATE,
    etapa VARCHAR(100),
    observacoes TEXT,
    
    UNIQUE(projeto_id, data)
);
```

**Finalidade:** Histórico completo dia a dia de cada projeto.

---

## 🔄 Sincronização Automática

### **Triggers Configurados:**

1. **`trigger_sync_etapa_projeto`**
   - Atualiza `projetos.etapa_atual` quando nova etapa é registrada em `atualizacoes_diarias`

2. **`trigger_calcular_metrica_retrabalho`**
   - Recalcula automaticamente `projetos.metrica_retrabalho` baseado em % de dias com retrabalho

3. **`trigger_atualizar_percentual_projeto`**
   - Atualiza `projetos.percentual_total` quando execução diária é registrada

---

## 📊 Views Disponíveis

### **`view_projetos_completo`**

View consolidada que junta:
- Dados do projeto (`projetos`)
- Dados do engenheiro (`engenheiros`)
- Última atualização diária (`atualizacoes_diarias`)

**Use para:** Sincronização com planilha do CEO

```sql
SELECT * FROM view_projetos_completo 
WHERE ativo = true 
ORDER BY codigo;
```

---

## 🔧 Função de Sincronização

### **`sync_projeto_from_sheet()`**

Função SQL que recebe dados da planilha e insere/atualiza no banco:

```sql
SELECT sync_projeto_from_sheet(
    'PRJ-001',              -- codigo
    'Cliente XYZ',          -- cliente
    'contato@email.com',    -- contato
    'prédio',               -- obra
    'elétrica',             -- area
    'João Silva',           -- eng_responsavel
    'E1',                   -- tipo_projeto
    'Descrição...',         -- descricao
    '2024-01-01',          -- data_inicio
    '2024-03-01',          -- data_previsao_interna
    '2024-03-15',          -- data_final_cliente
    45,                     -- prazo_interno_dias
    50,                     -- prazo_cliente_dias
    'em execução',         -- status
    'Detalhamento',        -- etapa
    55.50,                 -- percentual
    'Observações gerais'   -- observacoes
);
```

Retorna JSON:
```json
{
  "success": true,
  "projeto_id": "uuid-aqui",
  "codigo": "PRJ-001"
}
```

---

## ⚡ Campos Auto-calculados

Estes campos são **calculados automaticamente** por triggers:

| Campo | Cálculo | Quando |
|-------|---------|--------|
| `metrica_retrabalho` | `(dias_com_retrabalho / total_dias) * 100` | A cada nova atualização diária |
| `percentual_total` | Último valor de `execucao_diaria.percentual_acumulado` | A cada registro de execução |
| `etapa_atual` | Última etapa registrada em `atualizacoes_diarias` | A cada atualização noturna |
| `dias_atraso` | `CURRENT_DATE - data_final_cliente` (se > 0) | Calculado em queries |
| `lead_time_dias` | `data_entrega_real - data_inicio` (dias úteis) | Quando projeto é concluído |

---

## 🎯 Fluxo de Dados Completo

```
┌─────────────────┐
│  WhatsApp       │
│  (Engenheiro)   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Chatbot        │
│  (Node.js)      │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────┐
│  Supabase (PostgreSQL)          │
│                                 │
│  ┌────────────────────┐        │
│  │  projetos          │        │
│  │  - info básica     │        │
│  │  - status/etapa    │        │
│  │  - métricas        │        │
│  └─────────┬──────────┘        │
│            │                    │
│  ┌─────────▼──────────┐        │
│  │ atualizacoes_diarias│       │
│  │ - previsao_dia     │        │
│  │ - feito_dia        │        │
│  │ - retrabalhos      │        │
│  └─────────┬──────────┘        │
│            │                    │
│  ┌─────────▼──────────┐        │
│  │ execucao_diaria    │        │
│  │ - % previsto       │        │
│  │ - % realizado      │        │
│  │ - % acumulado      │        │
│  └────────────────────┘        │
└────────┬────────────────────────┘
         │
         ↓ (sync 5min)
┌─────────────────┐
│  Google Sheets  │
│  Engenheiro(a)  │
└────────┬────────┘
         │
         ↓ (sync 30min)
┌─────────────────┐
│  Google Sheets  │
│  Dashboard CEO  │
└─────────────────┘
```

---

## ✅ Checklist de Implementação

- [x] SQL de migration criado
- [x] Novos campos adicionados em `projetos`
- [x] Nova tabela `atualizacoes_diarias` criada
- [x] Triggers automáticos configurados
- [x] View consolidada criada
- [x] Função de sincronização criada
- [ ] Testar migration no Supabase
- [ ] Atualizar código do chatbot
- [ ] Implementar serviço de sincronização bidirecional
- [ ] Testar fluxo completo

---

## 📝 Próximos Passos

1. **Aplicar Migration:**
   ```bash
   # No Supabase SQL Editor
   # Copiar e executar: supabase/migrations/001_expand_schema_planilha.sql
   ```

2. **Atualizar Código do Chatbot:**
   - Modificar `engineerSheetService.ts` para salvar em ambos (Sheet + Supabase)
   - Criar `supabaseIntegration.ts` com funções de salvamento

3. **Configurar Sync Automático:**
   - Cron job para sincronizar Supabase → Planilha Engenheiro (5min)
   - Cron job para sincronizar Supabase → Planilha CEO (30min)

4. **Testes:**
   - Criar projeto via chatbot
   - Verificar salvamento no Supabase
   - Verificar sincronização na planilha
   - Validar triggers automáticos

---

**Última atualização:** 2025-01-06
**Versão:** 1.0.0

