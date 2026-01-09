# 📅 Mudança no Fluxo de Criação de Projetos

## 📋 O que mudou?

### ❌ ANTES

**Fluxo de criação:**
1. Cliente
2. Contato
3. Obra
4. Área
5. Tipo de Projeto
6. **Dias estimados** (usuário digitava número de dias)
7. **Data final cliente** (usuário digitava data)

**O bot calculava automaticamente:**
- ✅ Data início = **HOJE** (automático)
- ✅ Data previsão interna = início + dias estimados
- ⚠️ Prazo interno = dias estimados (direto)
- ⚠️ Prazo cliente = diferença entre início e data final

### ✅ AGORA

**Fluxo de criação:**
1. Cliente
2. Contato
3. Obra
4. Área
5. Tipo de Projeto
6. **📅 Data de início** (usuário digita - NOVO)
7. **📅 Data previsão interna** (usuário digita - NOVO)
8. **📅 Data final cliente** (usuário digita - MANTIDO)

**O bot calcula automaticamente:**
- ✅ **Prazo interno** = dias úteis entre início e previsão interna
- ✅ **Prazo cliente** = dias úteis entre início e data final cliente

---

## 🎯 Por que mudou?

**Problema anterior:**
- A data de início era sempre "hoje", mas nem sempre o projeto começa hoje
- O usuário digitava "dias estimados" mas não tinha controle sobre as datas reais
- Faltava flexibilidade para projetos que já começaram ou vão começar no futuro

**Solução atual:**
- ✅ Usuário define **3 datas manuais**
- ✅ Bot **calcula os prazos** automaticamente (em dias úteis)
- ✅ Mais controle e flexibilidade

---

## 🔒 Validações Implementadas

```typescript
✅ Formato DD/MM/AAAA validado
✅ Data previsão interna > Data início
✅ Data final cliente > Data início
✅ Dias, meses e anos válidos
```

---

## 🧮 Exemplo Prático

### Entrada do usuário:
```
Data início:          10/01/2025 (sexta-feira)
Data previsão interna: 24/01/2025 (sexta-feira)
Data final cliente:    31/01/2025 (sexta-feira)
```

### Bot calcula automaticamente:
```
Prazo interno:  10 dias úteis
  (10/01 → 24/01, excluindo sábados e domingos)

Prazo cliente:  15 dias úteis
  (10/01 → 31/01, excluindo sábados e domingos)
```

---

## 📊 Mensagem Final do Bot

```
✅ *Projeto criado com sucesso!*

🆔 Código: *PRJ-001*
👤 Cliente: Cliente SA
🏗️ Obra: Edifício Alpha
📊 Tipo: Projeto Estrutural

📅 *Datas:*
  • Início: 10/01/2025
  • Previsão interna: 24/01/2025
  • Final cliente: 31/01/2025

⏱️ *Prazos (calculados):*
  • Prazo interno: 10 dias úteis
  • Prazo cliente: 15 dias úteis

_✅ Dados salvos no banco de dados_
_🔄 Planilhas serão atualizadas automaticamente (até 5min)_
```

---

## 🛠️ Arquivos Modificados

### `chatbot/flows/engineerProjectFlow.ts`

**Alterações no FlowStep:**
```typescript
// Removido:
- 'dias_estimados'

// Adicionado:
+ 'data_inicio'
+ 'data_previsao_interna'
```

**Métodos removidos:**
- `stepDiasEstimados()`

**Métodos adicionados:**
- `stepDataInicio()` - Pede data de início manual
- `stepDataPrevisaoInterna()` - Pede data de previsão manual

**Métodos modificados:**
- `stepTipoProjeto()` - Agora vai para `data_inicio` em vez de `dias_estimados`
- `stepDataFinalCliente()` - Validação adicional (data > data início)
- `salvar()` - Calcula prazos usando `calculateBusinessDays()`
- `generateSummary()` - Exibe data de início no resumo

---

## 🧪 Como Testar

### Teste Interativo (Recomendado)
```bash
npm run test:bot-completo
```
1. Escolha opção **1** (Criar projeto)
2. Preencha os campos incluindo as **3 datas**
3. Veja os **prazos sendo calculados automaticamente**!

### Teste Automatizado
```bash
npm run test:3-modos
```

### No WhatsApp
```bash
npm start
```
- Digite "menu"
- Escolha opção 1
- Siga o fluxo completo

---

## ✅ Garantias

- ✅ **Não quebra** funcionalidades existentes
- ✅ **Compatível** com Supabase e Google Sheets
- ✅ **Sincronização** automática mantida
- ✅ **Validações** de datas implementadas
- ✅ **Cálculo de dias úteis** correto (exclui fins de semana)

---

## 📝 Notas Técnicas

### Cálculo de Dias Úteis

O bot usa o método `calculateBusinessDays()` do `engineerSheetService` que:
- Exclui sábados e domingos
- Conta corretamente dias entre datas
- Retorna número inteiro de dias úteis

### Compatibilidade com Banco de Dados

Os campos no Supabase permanecem inalterados:
- `data_inicio` - Date
- `data_previsao_interna` - Date  
- `data_final_cliente` - Date
- `prazo_interno` - Integer (dias úteis)
- `prazo_cliente` - Integer (dias úteis)

---

**Status:** ✅ **Implementado e testado**  
**Data:** 09/01/2025  
**Versão:** 2.0

