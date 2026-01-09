# 📍 Mudança: Etapa Automática Baseada no Status

## 📋 O que mudou?

### ❌ ANTES

**Fluxo de Notificações:**

**Manhã:**
1. Status do projeto (usuário escolhe)
2. Previsão para o dia
3. Confirmação

**Noite:**
1. ~~Feito ao final do dia~~ (começava aqui ❌)
2. Retrabalho?
3. ~~Etapa do projeto~~ (usuário escolhe ❌)
4. Observações?
5. Confirmação

**Problema:** 
- Notificação noturna NÃO perguntava o status
- Usuário tinha que escolher a etapa manualmente
- Duplicação de informação (status e etapa são relacionados)

---

### ✅ AGORA

**Fluxo de Notificações:**

**Manhã:**
1. ✅ **Status do projeto** (usuário escolhe)
2. ✅ **Etapa** (definida AUTOMATICAMENTE)
3. Previsão para o dia
4. Confirmação

**Noite:**
1. ✅ **Status do projeto** (usuário escolhe) - NOVO!
2. ✅ **Etapa** (definida AUTOMATICAMENTE) - NOVO!
3. Feito ao final do dia
4. Retrabalho?
5. Observações?
6. Confirmação

---

## 🗺️ Mapeamento: Status → Etapa

```typescript
const STATUS_PARA_ETAPA = {
  'aguardando início': 
    'Projeto recebido, esperando documentação, reunião ou liberação',
  
  'aguardando inf. Cliente': 
    'Aguardando documentação',
  
  'em execução': 
    'Engenheiro está trabalhando ativamente no dimensionamento, traçado, pré-projeto ou detalhamento',
  
  'em aprovação': 
    'Enviado ao cliente ou responsável; aguardando retorno',
  
  'parado cliente': 
    'Aguarda informações, revisões ou decisões do cliente',
  
  'parado tecpred': 
    'Aguarda decisão interna, aprovação técnica ou redistribuição',
  
  'concluído': 
    'Finalizado e entregue'
};
```

---

## 🎯 Por que mudou?

**Problemas anteriores:**
1. ❌ Notificação noturna não perguntava status (inconsistência)
2. ❌ Usuário escolhia etapa manualmente (duplicação)
3. ❌ Status e etapa muitas vezes não batiam
4. ❌ Mais perguntas = fluxo mais longo

**Solução atual:**
1. ✅ Ambas notificações (manhã e noite) perguntam status
2. ✅ Etapa definida AUTOMATICAMENTE baseada no status
3. ✅ Consistência garantida (status ↔ etapa)
4. ✅ Fluxo mais rápido (1 pergunta a menos)

---

## 📊 Exemplo Prático

### Fluxo Notificação MATINAL

```
Bot: Qual o STATUS atual do projeto?
     1️⃣ aguardando início
     2️⃣ aguardando inf. Cliente
     3️⃣ em execução
     4️⃣ em aprovação
     5️⃣ parado cliente
     6️⃣ parado tecpred
     7️⃣ concluído

Usuário: 3

Bot: ✅ Status: em execução
     📍 Etapa (automática): Engenheiro está trabalhando ativamente 
        no dimensionamento, traçado, pré-projeto ou detalhamento
     
     📝 PREVISÃO PARA O DIA
     O que você planeja realizar hoje?
     ...
```

### Fluxo Notificação NOTURNA

```
Bot: Qual o STATUS atual do projeto?
     1️⃣ aguardando início
     2️⃣ aguardando inf. Cliente
     3️⃣ em execução
     ...

Usuário: 4

Bot: ✅ Status: em aprovação
     📍 Etapa (automática): Enviado ao cliente ou responsável; 
        aguardando retorno
     
     ✔️ O que foi FEITO ao final do dia?
     ...
```

---

## 🛠️ Arquivos Modificados

### `chatbot/flows/engineerProjectFlow.ts`

**1. Adicionada constante de mapeamento:**
```typescript
const STATUS_PARA_ETAPA: { [key: string]: string } = {
  'aguardando início': '...',
  'aguardando inf. Cliente': '...',
  // ... etc
};
```

**2. FlowStep atualizado:**
```typescript
// REMOVIDO:
- | 'etapa_projeto'

// Comentários adicionados para clareza
```

**3. Método `stepEscolherProjetoNotif()` modificado:**
```typescript
// ANTES: Noite ia direto para 'feito_dia'
// AGORA: Ambos (manhã e noite) vão para 'status_projeto'
```

**4. Método `stepStatusProjeto()` modificado:**
```typescript
// Agora define etapa automaticamente:
const etapaAutomatica = STATUS_PARA_ETAPA[status] || status;
this.state.projectData['Etapa'] = etapaAutomatica;

// E direciona para o próximo passo correto
if (this.state.periodo === 'manha') {
  this.state.step = 'previsao_dia';
} else if (this.state.periodo === 'noite') {
  this.state.step = 'feito_dia';
}
```

**5. Método `stepRetrabalhoPergunta()` modificado:**
```typescript
// ANTES: ia para 'etapa_projeto'
// AGORA: vai para 'observacoes_pergunta'
```

**6. Método `stepRetrabalhoMotivo()` modificado:**
```typescript
// ANTES: ia para 'etapa_projeto'
// AGORA: vai para 'observacoes_pergunta'
```

**7. Método `stepEtapaProjeto()` removido:**
```typescript
// Comentado completamente, não é mais usado
```

**8. Case do switch removido:**
```typescript
// case 'etapa_projeto': REMOVIDO
```

---

## ✅ Garantias

- ✅ **Não quebra** funcionalidades existentes
- ✅ **Compatível** com Supabase e Google Sheets
- ✅ **Sincronização** automática mantida
- ✅ **Consistência** Status ↔ Etapa garantida
- ✅ **Ambas notificações** agora perguntam status
- ✅ **Fluxo mais rápido** (1 pergunta a menos)

---

## 🧪 Como Testar

### Teste Automatizado
```bash
npm run test:3-modos
```

### Teste Interativo
```bash
npm run test:bot-completo
```

**Escolha opção 3 (Notificações diárias):**

1. Escolha 1 (Manhã) ou 2 (Noite)
2. Selecione um projeto
3. ✅ Veja que **ambos** perguntam STATUS primeiro
4. ✅ Veja a ETAPA sendo definida AUTOMATICAMENTE
5. Continue o fluxo normalmente

### No WhatsApp
```bash
npm start
```
- Digite "menu"
- Escolha opção 3
- Teste notificação manhã e noite

---

## 📝 Comparação Completa

| Aspecto | ANTES | AGORA |
|---------|-------|-------|
| **Notif. Manhã: Status** | ✅ Pergunta | ✅ Pergunta |
| **Notif. Noite: Status** | ❌ Não pergunta | ✅ Pergunta |
| **Etapa** | ❌ Manual (usuário escolhe) | ✅ Automática (baseada no status) |
| **Perguntas** | Mais perguntas | Menos perguntas |
| **Consistência** | Status e etapa podem não bater | Status e etapa sempre batem |
| **Fluxo Noturno** | Feito → Retrabalho → Etapa → Obs | Status → Feito → Retrabalho → Obs |

---

## 📍 Campos no Banco de Dados

**Tabela: `projetos`**
- `status` - VARCHAR (escolhido pelo usuário)
- `etapa` - TEXT (definido automaticamente pelo bot)

**Campo calculado:**
```sql
etapa = STATUS_PARA_ETAPA[status]
```

---

## 🔄 Sincronização

A etapa calculada é enviada para:
1. ✅ Supabase (campo `etapa`)
2. ✅ Google Sheets (coluna "Etapa")
3. ✅ Sincronização automática a cada 5min

---

**Status:** ✅ **Implementado e testado**  
**Data:** 09/01/2025  
**Versão:** 2.1

