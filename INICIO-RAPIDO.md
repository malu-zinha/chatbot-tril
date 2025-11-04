# ⚡ Início Rápido

## 📋 Pré-requisitos

- Node.js 18+ instalado
- PostgreSQL instalado e rodando

## 🚀 Configuração em 5 Passos

### 1️⃣ Configurar o banco de dados

Edite o arquivo `.env` com suas credenciais do PostgreSQL:

```env
DATABASE_URL="postgresql://SEU_USUARIO:SUA_SENHA@localhost:5432/gestao_obras?schema=public"
```

**Exemplos comuns:**
```env
# Usuário padrão do PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gestao_obras?schema=public"

# Usando Supabase
DATABASE_URL="postgresql://postgres:[SUA-SENHA]@db.[SEU-PROJETO].supabase.co:5432/postgres"
```

### 2️⃣ Gerar Prisma Client

```bash
npm run prisma:generate
```

### 3️⃣ Criar o banco de dados e tabelas

```bash
npm run prisma:migrate
```

Quando pedir o nome da migration, digite algo como: `init`

### 4️⃣ Popular com dados iniciais (opcional)

```bash
npm run db:seed
```

Isso cria:
- 5 áreas (Elétrico, Hidrossanitário, Climatização, Drenagem, Solar)
- 1 cliente de exemplo
- 1 obra de exemplo

### 5️⃣ Executar o chatbot

```bash
npm run dev
```

1. Escaneie o QR Code no WhatsApp
2. Envie "oi" para o bot
3. Siga o fluxo interativo

## 🔧 Comandos Úteis

```bash
# Ver banco de dados visualmente
npm run prisma:studio

# Recriar banco (ATENÇÃO: apaga tudo!)
npx prisma migrate reset

# Ver logs do Prisma
npx prisma db pull

# Compilar TypeScript
npm run build

# Executar em produção
npm start
```

## 🐘 Instalando PostgreSQL

### macOS (Homebrew)
```bash
brew install postgresql@14
brew services start postgresql@14
createdb gestao_obras
```

### Linux (Ubuntu/Debian)
```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb gestao_obras
```

### Windows
Baixe e instale: https://www.postgresql.org/download/windows/

## ☁️ Usando Supabase (PostgreSQL na Nuvem)

1. Crie uma conta em https://supabase.com
2. Crie um novo projeto
3. Copie a "Connection String" em Settings > Database
4. Cole no `.env` como `DATABASE_URL`

## ❓ Problemas Comuns

### Erro: "Cannot find module '@prisma/client'"
```bash
npm run prisma:generate
```

### Erro: "P1001: Can't reach database server"
- Verifique se o PostgreSQL está rodando
- Confirme as credenciais no `.env`

### Erro: "P3009: Failed to create database"
```bash
# Crie manualmente
createdb gestao_obras
# ou
psql -U postgres -c "CREATE DATABASE gestao_obras;"
```

### QR Code não aparece
- Aguarde alguns segundos
- Verifique se não há sessão ativa em `.wwebjs_auth/`
- Delete a pasta `.wwebjs_auth/` e tente novamente

## 📱 Fluxo do Chatbot

1. **Saudação**: "oi", "menu", "olá"
   → Lista todas as obras

2. **Escolher obra**: Digite o número (ex: 1)
   → Lista áreas disponíveis

3. **Escolher área**: Digite o número (ex: 1 - Elétrico)
   → Mostra dados existentes ou pede para cadastrar

4. **Cadastrar/Atualizar**: Digite os dados
   → Salva no banco e registra acesso

## 🎯 Próximos Passos

- Personalize as áreas em `prisma/seed.ts`
- Adicione mais validações em `src/services/`
- Crie uma API REST em `src/routes/`
- Integre com OpenAI para IA no chatbot

---

💡 **Dica**: Use `npm run prisma:studio` para visualizar e editar dados enquanto testa!

