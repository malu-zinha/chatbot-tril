# 🚀 Como Conectar ao Supabase

## Passo 1: Criar Projeto no Supabase

1. Acesse https://supabase.com
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Preencha:
   - **Name**: gestao-obras (ou qualquer nome)
   - **Database Password**: Escolha uma senha forte (anote!)
   - **Region**: Escolha a mais próxima (ex: South America)
5. Clique em "Create new project"
6. Aguarde ~2 minutos (criação do banco)

## Passo 2: Obter Connection String

### Opção A: Via Interface (Recomendado)

1. No painel do Supabase, vá em **Settings** (⚙️) no menu lateral
2. Clique em **Database**
3. Role até "Connection string"
4. Selecione a aba **URI** (não Pooler)
5. Copie a string que parece com:
   ```
   postgresql://postgres.[HASH]:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
   ```
6. **IMPORTANTE**: Substitua `[SENHA]` pela senha que você criou no Passo 1

### Opção B: Formato Manual

Se preferir montar manualmente:
```
postgresql://postgres.[PROJECT-ID]:[SUA-SENHA]@db.[PROJECT-ID].supabase.co:6543/postgres
```

Onde:
- `[PROJECT-ID]`: ID do seu projeto (ex: abcdefghijklmnop)
- `[SUA-SENHA]`: senha que você criou

## Passo 3: Atualizar .env

Cole a connection string no arquivo `.env`:

```env
DATABASE_URL="postgresql://postgres.[HASH]:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
```

## Passo 4: Executar Migrations

```bash
npm run prisma:migrate
```

Digite um nome para a migration (ex: `init`)

## Passo 5: Popular Dados

```bash
npm run db:seed
```

## ✅ Pronto!

Agora você está usando Supabase (PostgreSQL na nuvem) em vez do PostgreSQL local.

## 🔍 Visualizar Dados

Você pode ver os dados de duas formas:

1. **Prisma Studio** (local):
   ```bash
   npm run prisma:studio
   ```

2. **Supabase Dashboard** (web):
   - Acesse seu projeto no Supabase
   - Clique em "Table Editor" no menu lateral
   - Veja todas as tabelas criadas

## 💡 Dicas

- A connection string do Supabase já inclui SSL automaticamente
- Os dados ficam na nuvem, acessíveis de qualquer lugar
- Supabase tem plano gratuito generoso
- Você pode ver logs e métricas no dashboard do Supabase

## 🔐 Segurança

- Nunca compartilhe sua connection string
- O arquivo `.env` está no `.gitignore` (não vai para o git)
- Use variáveis de ambiente em produção

