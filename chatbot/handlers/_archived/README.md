# 📦 Componentes Arquivados

Esta pasta contém componentes que **NÃO estão sendo usados** no sistema atual, mas foram **mantidos para referência futura**.

## 📁 Arquivos Arquivados

### **QueryService** (`queryService.ts`)
- **Função:** Interpreta perguntas em linguagem natural usando OpenAI GPT-4o-mini
- **Uso:** Permitia consultas flexíveis tipo "Quantos projetos em execução?"
- **Por que foi arquivado:** Sistema atual usa apenas fluxos guiados com botões
- **Como reativar:** 
  1. Mover de volta para `chatbot/handlers/`
  2. Descomentar imports em `sheetsBot.ts`
  3. Descomentar lógica de fallback em `sheetsBot.ts` (linhas comentadas)
  4. Reativar cache de planilha

### **CommandService** (`commandService.ts`)
- **Função:** Interpreta comandos de edição em linguagem natural usando OpenAI
- **Uso:** Permitia edições rápidas tipo "Mude PRJ-001 para Em Execução"
- **Por que foi arquivado:** Sistema atual usa apenas fluxos guiados com botões
- **Como reativar:**
  1. Mover de volta para `chatbot/handlers/`
  2. Descomentar imports em `sheetsBot.ts`
  3. Descomentar lógica de fallback em `sheetsBot.ts` (linhas comentadas)
  4. Descomentar sistema de confirmação

---

## 💡 Quando Reativar?

**Considere reativar se:**
- Usuários avançados precisam de comandos rápidos
- CEO/Gestores querem fazer perguntas flexíveis
- Sistema precisa ser mais "conversacional" e menos "rígido"

**Custos de reativar:**
- ⚠️ Usa OpenAI API (custo por mensagem)
- ⚠️ Mais complexo de manter
- ⚠️ Pode ter respostas imprecisas da IA

---

## 🔧 Instruções de Reativação

### 1. Mover arquivos de volta:
```bash
mv chatbot/handlers/_archived/queryService.ts chatbot/handlers/
mv chatbot/handlers/_archived/commandService.ts chatbot/handlers/
```

### 2. Editar `sheetsBot.ts`:
Procurar por comentários `// ARCHIVED:` e descomentar as seções.

### 3. Testar:
```bash
npm run dev
```

Enviar mensagem de teste: "Quantos projetos em execução?"

---

**Data de arquivamento:** 2025-01-07  
**Versão do sistema:** 2.0.0

