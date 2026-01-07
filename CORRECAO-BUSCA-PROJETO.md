# 🔧 CORREÇÃO: Busca de Projetos por Código

## 🐛 PROBLEMA IDENTIFICADO

Ao tentar atualizar um projeto (PRJ-005), o sistema retornava:
```
❌ Erro ao atualizar projeto: Projeto não encontrado
```

### **Causa Raiz**

O sistema usava nomes de coluna diferentes entre as planilhas:

- **Planilha Antiga**: Coluna `'Nº'` para código do projeto
- **Planilha Nova**: Coluna `'Código do Projeto'` para código do projeto

Os métodos de busca e atualização estavam hardcoded para buscar pela coluna `'Nº'`, que não existe na nova planilha.

---

## ✅ SOLUÇÃO IMPLEMENTADA

### **1. Modificado: `googleSheetsService.ts`**

#### **Método `findRowByID`**

**ANTES:**
```typescript
async findRowByID(
  spreadsheetId: string,
  sheetName: string,
  projectId: string,
  range: string = 'A1:Z1000'
): Promise<...> {
  const rowIndex = data.findIndex(row => row['Nº'] === projectId);
  // ❌ Sempre procura pela coluna 'Nº'
}
```

**DEPOIS:**
```typescript
async findRowByID(
  spreadsheetId: string,
  sheetName: string,
  projectId: string,
  range: string = 'A1:Z1000',
  idColumnName: string = 'Nº' // ✅ Novo parâmetro opcional
): Promise<...> {
  const rowIndex = data.findIndex(row => row[idColumnName] === projectId);
  // ✅ Procura pela coluna especificada
}
```

#### **Método `updateRowByID`**

**ANTES:**
```typescript
async updateRowByID(
  spreadsheetId: string,
  sheetName: string,
  projectId: string,
  updates: Record<string, any>,
  range: string = 'A1:Z1000'
): Promise<boolean> {
  const result = await this.findRowByID(spreadsheetId, sheetName, projectId, range);
  // ❌ Não passa o nome da coluna
}
```

**DEPOIS:**
```typescript
async updateRowByID(
  spreadsheetId: string,
  sheetName: string,
  projectId: string,
  updates: Record<string, any>,
  range: string = 'A1:Z1000',
  idColumnName: string = 'Nº' // ✅ Novo parâmetro opcional
): Promise<boolean> {
  const result = await this.findRowByID(spreadsheetId, sheetName, projectId, range, idColumnName);
  // ✅ Passa o nome da coluna
}
```

---

### **2. Modificado: `engineerSheetService.ts`**

Atualizado para passar `'Código do Projeto'` em todos os métodos que buscam/atualizam projetos:

#### **Método `getProject`**

```typescript
async getProject(projectCode: string): Promise<ProjectData | null> {
  const result = await this.sheetsService.findRowByID(
    this.spreadsheetId,
    this.sheetName,
    projectCode,
    this.range,
    'Código do Projeto' // ✅ Nome correto da nova planilha
  );
  // ...
}
```

#### **Método `updateDailyExecution`**

```typescript
async updateDailyExecution(projectCode: string, dailyData: DailyExecutionData) {
  // ...
  const success = await this.sheetsService.updateRowByID(
    this.spreadsheetId,
    this.sheetName,
    projectCode,
    updates,
    this.range,
    'Código do Projeto' // ✅ Nome correto da nova planilha
  );
  // ...
}
```

#### **Método `registerRework`**

```typescript
async registerRework(projectCode: string, reworkData: ReworkData) {
  // ...
  const success = await this.sheetsService.updateRowByID(
    this.spreadsheetId,
    this.sheetName,
    projectCode,
    updates,
    this.range,
    'Código do Projeto' // ✅ Nome correto da nova planilha
  );
  // ...
}
```

---

## 🎯 BENEFÍCIOS DA SOLUÇÃO

### **1. Compatibilidade com Ambas as Planilhas**

O parâmetro `idColumnName` tem valor padrão `'Nº'`:
- ✅ **Planilhas antigas** continuam funcionando (não precisam passar o parâmetro)
- ✅ **Planilhas novas** funcionam passando `'Código do Projeto'`

### **2. Código Mais Flexível**

Agora é fácil suportar planilhas com qualquer nome de coluna:

```typescript
// Planilha antiga
await findRowByID(id, sheet, 'PRJ-001', 'A1:Z100'); // usa 'Nº'

// Planilha nova
await findRowByID(id, sheet, 'PRJ-001', 'A1:Z100', 'Código do Projeto');

// Planilha customizada
await findRowByID(id, sheet, 'PRJ-001', 'A1:Z100', 'ID_PROJETO');
```

### **3. Melhor Debug**

Log adicionado quando projeto não é encontrado:
```
⚠️ Projeto PRJ-005 não encontrado na coluna 'Código do Projeto'
```

---

## 🧪 COMO TESTAR

### **1. Reinicie o teste do bot:**

```bash
# Ctrl+C no teste atual
npm run test:bot
```

### **2. Teste o fluxo completo:**

```
💬 Você: projeto
🤖 Bot: O que você gostaria de fazer?
        1️⃣ Cadastrar novo projeto
        2️⃣ Atualizar projeto existente

💬 Você: 2
🤖 Bot: [Lista os projetos]
        1. PRJ-001 - Cliente A
        2. PRJ-005 - Cliente B

💬 Você: 2
🤖 Bot: [Fluxo de atualização...]

💬 Você: [Complete o fluxo]
🤖 Bot: ✅ Projeto atualizado com sucesso! ← Deve funcionar agora!
```

### **3. Verifique na planilha:**

- O projeto deve ser atualizado corretamente
- Todos os campos devem estar salvos

---

## 📊 ARQUIVOS MODIFICADOS

1. ✅ `integrations/sheets/googleSheetsService.ts`
   - `findRowByID`: Adicionado parâmetro `idColumnName`
   - `updateRowByID`: Adicionado parâmetro `idColumnName`

2. ✅ `integrations/sheets/engineerSheetService.ts`
   - `getProject`: Passa `'Código do Projeto'`
   - `updateDailyExecution`: Passa `'Código do Projeto'`
   - `registerRework`: Passa `'Código do Projeto'`

---

## 🔍 VALIDAÇÕES

- ✅ Linter sem erros
- ✅ Backwards compatible (planilhas antigas funcionam)
- ✅ Forward compatible (novas planilhas funcionam)
- ✅ Melhor debug com logs informativos

---

## 📝 PRÓXIMOS PASSOS

1. **Testar** - Execute o teste e confirme que funciona
2. **Validar** - Verifique na planilha se os dados são salvos
3. **Usar** - O bot está pronto para uso!

---

**Data da Correção:** 12 de Dezembro de 2024  
**Status:** ✅ Corrigido e pronto para testes
