# 📝 Guia: Edição de Planilhas via WhatsApp

Este guia explica como usar o bot para **editar e sincronizar** planilhas do Google Sheets via WhatsApp.

## 🎯 Funcionalidades

### ✅ O que o bot faz:

1. **Consulta dados** da planilha (funcionalidade original)
2. **Edita projetos** na aba Engenheiro
3. **Sincroniza automaticamente** com a aba Evandro
4. **Adiciona novos projetos** em ambas as abas
5. **Confirma mudanças** antes de executar

### 🔄 Sincronização Automática

Quando você edita a aba **Engenheiro**, os seguintes campos são **automaticamente** copiados para a aba **Evandro**:

- Nº (ID do projeto)
- Cliente
- Obra
- Área
- Status do Projeto

Os campos exclusivos da aba Evandro (como Engenheiro responsável, % executado, etc) **não são alterados**.

## 🚀 Como Usar

### 1. Configuração

Adicione as seguintes variáveis no arquivo `.env`:

```env
GOOGLE_SHEETS_ENGINEER_SHEET=Engenheiro
GOOGLE_SHEETS_EVANDRO_SHEET=Evandro
```

Veja o arquivo `ENV_CONFIG.md` para mais detalhes.

### 2. Iniciar o Bot

```bash
npm run dev
```

Escaneie o QR Code com seu WhatsApp.

## 💬 Comandos via WhatsApp

### 📊 Consultas (não alteram dados)

```
Qual o status do projeto PRJ-001?
Quantos projetos em execução?
Mostre os projetos da Alfa Ltda
```

### ✏️ Comandos de Edição

#### Atualizar Status

```
Mude o projeto PRJ-001 para Em Execução
Atualize o status do PRJ-002 para Parado Cliente
```

**Status válidos:**
- Aguardando Início
- Em Execução
- Aguardando Inf. Cliente
- Parado TecPred
- Parado Cliente
- Em aprovação
- Aprovado Energisa

#### Atualizar Outros Campos

```
Atualize o cliente do PRJ-001 para Beta S/A
Mude a área do PRJ-002 para Hidrossanitário
```

#### Adicionar Novo Projeto

```
Adicione novo projeto: Cliente Alfa Ltda, Obra Predial, Área Elétrico
```

O bot irá:
1. Gerar automaticamente o próximo ID (PRJ-004, PRJ-005, etc)
2. Criar o projeto na aba Engenheiro
3. Criar o projeto na aba Evandro

## 🔐 Sistema de Confirmação

### Fluxo de Confirmação

1. Você envia um comando de edição
2. Bot mostra **preview das mudanças**:
   ```
   📝 Confirme a alteração:
   
   🔹 Projeto: PRJ-001 (Alfa Ltda - Predial)
   🔹 Campo: Status do Projeto
   🔹 De: "Aguardando Início" → Para: "Em Execução"
   
   Esta mudança será aplicada em:
   ✅ Aba Engenheiro
   ✅ Aba Evandro
   
   Responda "sim" ou "confirmar" para executar
   Responda "não" ou "cancelar" para desistir
   ```

3. Você responde:
   - **"sim"** ou **"confirmar"** → Executa mudança
   - **"não"** ou **"cancelar"** → Cancela operação

4. Bot executa e mostra resultado:
   ```
   ✅ Atualização concluída com sucesso!
   
   🔹 Projeto: PRJ-001
   📊 Aba Engenheiro: Atualizada
   🔄 Aba Evandro: Sincronizada
   📝 Campos sincronizados: N°, Cliente, Obra, Área, Status do Projeto
   ```

### Cancelar Comando Pendente

Se você mudou de ideia:

```
não
cancelar
```

## 🎤 Comandos por Áudio

Você também pode dar comandos por **áudio**!

1. Grave o áudio: *"Mude o projeto PRJ-001 para Em Execução"*
2. Bot transcreve com Whisper
3. Mostra a transcrição
4. Processa o comando
5. Pede confirmação

**Nota:** Para confirmar/cancelar, use **texto** (sim/não).

## 🧪 Testar Sem WhatsApp

Para testar comandos **sem conectar no WhatsApp**:

```bash
npm run test:update
```

**Funcionalidades do teste:**
- ✅ Interpreta comandos em texto
- ✅ Mostra preview das mudanças
- ✅ Pede confirmação antes de executar
- ✅ Executa atualização e sincronização
- ✅ Mostra resultado detalhado

**Exemplos de comandos no teste:**

```
Mude o projeto PRJ-001 para Em Execução
Adicione projeto: Cliente Gamma, Obra Comercial, Área Climatização
Atualize o status do PRJ-002 para Parado Cliente
```

## 📋 Exemplos Práticos

### Exemplo 1: Mudar Status de Projeto

**WhatsApp:**
```
Engenheiro: Mude o PRJ-001 para Em Execução
```

**Bot responde:**
```
📝 Confirme a alteração:

🔹 Projeto: PRJ-001 (Alfa Ltda - Predial)
🔹 Campo: Status do Projeto
🔹 De: "Aguardando Início" → Para: "Em Execução"

Esta mudança será aplicada em:
✅ Aba Engenheiro
✅ Aba Evandro

Responda "sim" ou "confirmar" para executar
```

**Engenheiro:**
```
sim
```

**Bot responde:**
```
✅ Atualização concluída com sucesso!

🔹 Projeto: PRJ-001
📊 Aba Engenheiro: Atualizada
🔄 Aba Evandro: Sincronizada
```

### Exemplo 2: Adicionar Novo Projeto

**WhatsApp:**
```
Engenheiro: Adicione novo projeto: Cliente Delta Corp, Obra Industrial, Área Elétrico
```

**Bot responde:**
```
📝 Confirme a criação do novo projeto:

🆔 ID: PRJ-004

Dados:
• N°: PRJ-004
• Cliente: Delta Corp
• Obra: Industrial
• Área: Elétrico
• Status do Projeto: Aguardando Início

Será criado em:
✅ Aba Engenheiro
✅ Aba Evandro

Responda "sim" ou "confirmar" para executar
```

**Engenheiro:**
```
sim
```

**Bot responde:**
```
✅ Projeto criado com sucesso!

🆔 ID: PRJ-004
📊 Aba Engenheiro: Criado
🔄 Aba Evandro: Criado
```

## ⚠️ Segurança

### Confirmação Obrigatória

- ✅ **Todas** as mudanças requerem confirmação
- ✅ Preview mostra **exatamente** o que será alterado
- ✅ Você pode cancelar a qualquer momento

### Remoção Bloqueada

Por segurança, **não é possível remover projetos** pelo bot.

Para remover, edite diretamente no Google Sheets.

### Log de Alterações

Todas as operações são registradas no console:
```
✅ Célula Engenheiro!L3 atualizada: Em Execução
✅ Sincronização concluída: PRJ-001
   Campos sincronizados: N°, Cliente, Obra, Área, Status do Projeto
```

## 🔧 Arquitetura Técnica

### Novos Services

1. **CommandService** (`src/services/commandService.ts`)
   - Interpreta comandos em linguagem natural
   - Valida comandos
   - Gera previews de mudanças

2. **SheetSyncService** (`src/services/sheetSyncService.ts`)
   - Sincroniza campos em comum entre abas
   - Preserva campos exclusivos
   - Cria projetos em ambas as abas

3. **GoogleSheetsService** (estendido)
   - Métodos de escrita: `updateCell()`, `updateRow()`, `addRow()`
   - Busca por ID: `findRowByID()`
   - Leitura de múltiplas abas: `readMultipleSheets()`

### Fluxo de Edição

```
Usuário → Mensagem/Áudio
    ↓
Whisper (se áudio) → Transcrição
    ↓
LLM Classifica → Consulta ou Comando?
    ↓
CommandService → Parse do comando
    ↓
Validação → Gera preview
    ↓
Confirmação do usuário
    ↓
GoogleSheetsService → Atualiza aba Engenheiro
    ↓
SheetSyncService → Sincroniza com aba Evandro
    ↓
Resposta formatada → Usuário
```

## 📞 Suporte

Se tiver dúvidas, digite no WhatsApp:

```
menu
ajuda
```

## 🎓 Próximos Passos

1. Teste os comandos no modo teste: `npm run test:update`
2. Quando se sentir confortável, use via WhatsApp
3. Experimente comandos por áudio
4. Explore diferentes tipos de atualização

---

**Desenvolvido com ❤️ para facilitar a gestão de projetos de engenharia**

