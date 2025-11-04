# 🏗️ Sistema de Gestão de Obras com Chatbot

Sistema completo de gestão de obras integrado com chatbot WhatsApp usando Prisma ORM e TypeScript.

## 📁 Estrutura do Projeto

```
gestao-obras-chatbot/
├── prisma/
│   ├── schema.prisma           # Modelo do banco de dados
│   └── seed.ts                 # Dados iniciais
├── src/
│   ├── db/                     # Conexão com banco
│   │   └── index.ts
│   ├── models/                 # Modelos das entidades
│   │   ├── cliente.ts
│   │   ├── obra.ts
│   │   ├── profissional.ts
│   │   ├── area.ts
│   │   └── projeto.ts
│   ├── services/               # Regras de negócio
│   │   ├── projetoService.ts
│   │   └── obraService.ts
│   ├── routes/                 # Rotas da API
│   │   └── projetoRoutes.ts
│   ├── chatbot/                # Lógica do chatbot
│   │   └── bot.ts
│   └── index.ts                # Ponto de entrada
├── .env                        # Variáveis de ambiente
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Como Configurar

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar banco de dados

Edite o arquivo `.env` com suas credenciais do PostgreSQL:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/gestao_obras?schema=public"
```

**Opções de banco:**
- PostgreSQL local
- Supabase (PostgreSQL na nuvem)
- Neon (PostgreSQL serverless)

### 3. Gerar Prisma Client
```bash
npm run prisma:generate
```

### 4. Criar tabelas no banco
```bash
npm run prisma:migrate
```

### 5. Popular banco com dados iniciais
```bash
npm run db:seed
```

### 6. Executar aplicação
```bash
# Desenvolvimento (hot reload)
npm run dev

# Produção
npm run build
npm start
```

## 📱 Como Usar o Chatbot

1. Execute o sistema
2. Escaneie o QR Code no WhatsApp
3. Envie "oi" ou "menu" para o bot
4. Siga o fluxo:
   - Escolha a obra
   - Escolha a área (Elétrico, Hidrossanitário, etc.)
   - Visualize ou cadastre dados
   - Atualize informações

## 🗄️ Modelos do Banco

- **Cliente**: dados do cliente (nome, email, telefone)
- **Obra**: obras do cliente (nome, endereço, status)
- **Profissional**: profissionais da obra (nome, especialidade)
- **Area**: áreas de projeto (Elétrico, Hidrossanitário, etc.)
- **Projeto**: projetos da obra por área
- **Acesso**: registro de acessos ao sistema

## 🛠️ Scripts Disponíveis

```bash
npm run dev              # Executar em desenvolvimento
npm run build            # Compilar TypeScript
npm start                # Executar em produção
npm run prisma:generate  # Gerar Prisma Client
npm run prisma:migrate   # Criar migrations
npm run prisma:studio    # Abrir Prisma Studio (GUI)
npm run db:seed          # Popular banco de dados
```

## 🔐 Variáveis de Ambiente

Crie um arquivo `.env` na raiz:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/gestao_obras"

# OpenAI (opcional)
OPENAI_API_KEY=

# Ambiente
NODE_ENV=development
```

## 📊 Prisma Studio

Para visualizar e editar dados graficamente:
```bash
npm run prisma:studio
```

## 🔄 Migrações

Criar nova migration:
```bash
npx prisma migrate dev --name nome_da_migration
```

## 🚧 Próximos Passos

- [ ] Adicionar autenticação
- [ ] Criar API REST completa
- [ ] Integrar com OpenAI
- [ ] Dashboard web
- [ ] Relatórios e gráficos
- [ ] Notificações automáticas

## 📝 Licença

MIT

