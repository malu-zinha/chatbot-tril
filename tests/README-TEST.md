# 🧪 Script de Teste Interativo

## Como Usar

### 1. Executar o Script

```bash
npm run test:interactive
```

ou

```bash
npm run test:flow
```

ou diretamente:

```bash
npx ts-node --esm tests/test-interactive.ts
```

---

## 📋 Menu de Opções

Ao executar, você verá um menu com as seguintes opções:

### 1️⃣ **Testar Cadastro de Novo Projeto**
- Simula o fluxo completo de cadastro
- Passa por todas as perguntas (tipo, área, datas, status, etc)
- Valida os dados antes de salvar
- Mostra confirmação antes de gravar na planilha

**Exemplo de uso:**
```
Opção: 1
Bot: Qual o TIPO de projeto?
     1️⃣ H1  2️⃣ H2  3️⃣ H3 ...
Você: 3
Bot: Tipo H3 selecionado ✅
     Qual a ÁREA do projeto?
     ...
```

---

### 2️⃣ **Testar Atualização de Projeto Existente**
- Lista os projetos disponíveis do engenheiro
- Permite escolher um projeto
- Coleta dados de execução diária
- Atualiza apenas campos de execução

**Exemplo de uso:**
```
Opção: 2
Bot: Escolha o projeto:
     1️⃣ PRJ-001 - Alfa Ltda.
     2️⃣ PRJ-002 - Beta S/A
Você: 1
Bot: Qual o STATUS atual?
     ...
```

---

### 3️⃣ **Testar Validações**
- Testa validações de formato de data
- Testa validações de data inválida
- Mostra quantas constantes estão definidas
- Testa parsers de data

**Exemplo de saída:**
```
📅 Validações de Data:
  ✅ "05/12/2024" - Data válida
  ❌ "32/13/2024" - Data inválida (dia/mês errados)
  ❌ "05-12-2024" - Formato errado (usa hífen)
  ...
```

---

### 4️⃣ **Listar Projetos da Planilha**
- Pede o nome do engenheiro
- Busca projetos na planilha
- Mostra lista formatada com todos os dados

**Exemplo de uso:**
```
Opção: 4
Nome do engenheiro: João Silva

🔍 Buscando projetos...

✅ 3 projeto(s) encontrado(s):

1. PRJ-001 - Alfa Ltda.
   Obra: Casa residencial
   Tipo: H3 | Área: Elétrica
   Status: Em Execução | Etapa: Instalações de Primeira Fase

2. PRJ-002 - Beta S/A
   ...
```

---

### 5️⃣ **Validar Estrutura da Planilha**
- Verifica se todos os headers obrigatórios existem
- Mostra quais headers estão faltando (se houver)
- Confirma se a estrutura está correta

**Exemplo de saída:**
```
🔍 Validando...

✅ Estrutura da planilha está CORRETA!
   Todos os headers obrigatórios estão presentes.
```

ou

```
❌ Estrutura da planilha está INCORRETA!

Erros encontrados:
   • Header obrigatório faltando: Código do Projeto
   • Header obrigatório faltando: Cliente
```

---

### 6️⃣ **Gerar Próximo Código de Projeto**
- Analisa códigos existentes (PRJ-001, PRJ-002, etc)
- Calcula o próximo código disponível
- Mostra qual será usado no próximo cadastro

**Exemplo de saída:**
```
🔄 Analisando códigos existentes...

✅ Próximo código disponível: PRJ-004
   Será usado no próximo projeto cadastrado.
```

---

### 7️⃣ **Modo Livre (Conversar com o Bot)**
- Inicia uma conversa completa com o bot
- Você pode seguir qualquer caminho
- Digite "sair" ou "menu" para voltar

**Exemplo:**
```
Opção: 7

💬 MODO LIVRE - Conversar com o Bot
Digite suas mensagens como se fosse o WhatsApp.

🤖 Bot: Olá! Você quer:
         1️⃣ Cadastrar novo projeto
         2️⃣ Atualizar projeto existente

💬 Você: 1
🤖 Bot: Qual o TIPO de projeto?
         ...
```

---

### 0️⃣ **Sair**
- Fecha o script

---

## 🎯 Comandos Especiais

Durante o fluxo (opções 1, 2 ou 7):

- **`sair`** - Cancela o fluxo atual e volta ao menu
- **`menu`** - Volta ao menu principal
- **`cancelar`** - Cancela o fluxo (processado pelo bot)

---

## 🎨 Cores no Terminal

O script usa cores para facilitar a leitura:

- 🟢 **Verde** - Mensagens do bot
- 🔵 **Azul** - Informações
- 🟡 **Amarelo** - Prompts e avisos
- 🔴 **Vermelho** - Erros
- 🟣 **Magenta** - Modo livre
- 🔷 **Ciano** - Cabeçalhos e menus

---

## 💡 Dicas de Uso

### Para Testar Validações:
1. Execute a opção 3
2. Veja os resultados de todas as validações
3. Confirme que as validações estão funcionando

### Para Testar Fluxo Completo:
1. Execute a opção 1 (cadastro) ou 2 (atualização)
2. Siga as instruções do bot
3. Teste respostas válidas e inválidas
4. Veja as mensagens de erro
5. Complete até a confirmação final

### Para Debug da Planilha:
1. Execute a opção 5 (validar estrutura)
2. Se houver erros, corrija a planilha
3. Execute novamente até estar correto

### Para Testar Livremente:
1. Execute a opção 7 (modo livre)
2. Converse naturalmente com o bot
3. Teste cancelamento, erros, etc
4. Digite "sair" quando terminar

---

## 🐛 Troubleshooting

### Erro: "Variáveis de ambiente faltando"
**Solução:** Configure no `.env`:
```env
GOOGLE_SHEETS_ENGINEER_ID=seu_id_aqui
GOOGLE_SHEETS_ENGINEER_NAME=Engenheiro(a)
GOOGLE_SHEETS_ENGINEER_RANGE=A1:AE1000
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
```

### Erro: "Nenhum projeto encontrado"
**Solução:**
1. Verifique se a planilha tem projetos
2. Verifique se a coluna "Eng. Responsável" está preenchida
3. Use o nome correto do engenheiro

### Erro: "Cannot find module"
**Solução:**
```bash
npm install
```

### Erro ao salvar na planilha
**Solução:**
1. Verifique se compartilhou a planilha com a service account
2. Verifique se deu permissão de "Editor"
3. Verifique se o ID está correto no `.env`

---

## 📚 Mais Informações

- **Configuração:** `docs/config-nova-planilha.md`
- **Plano de testes completo:** `tests/test-engineer-flow.md`
- **Implementação:** `IMPLEMENTACAO-COMPLETA.md`

---

## 🎬 Exemplo de Sessão Completa

```
$ npm run test:interactive

╔════════════════════════════════════════════════════════════╗
║     🧪 TESTE INTERATIVO - FLUXO DE ENGENHEIROS           ║
╚════════════════════════════════════════════════════════════╝

📋 Escolha uma opção:

  1️⃣  Testar Cadastro de Novo Projeto
  2️⃣  Testar Atualização de Projeto Existente
  3️⃣  Testar Validações
  ...

🎯 Digite o número da opção: 1

─────────────────────────────────────────────────────────────
🚀 Iniciando teste: CADASTRO
─────────────────────────────────────────────────────────────

🤖 Bot:
👋 Olá!

📊 Gestão de Projetos de Engenharia

O que você quer fazer?

1️⃣ Cadastrar novo projeto
2️⃣ Atualizar projeto existente

_Digite o número da opção_
_Digite "cancelar" para sair_

💬 Você: 1

🤖 Bot:
✅ Novo Projeto

📝 Código: PRJ-004

Vamos preencher os dados do projeto.

🏗️ Qual o TIPO de projeto?

1️⃣ H1
2️⃣ H2
3️⃣ H3
...

💬 Você: 3

[... continua o fluxo ...]
```

---

**Bom teste! 🚀**
