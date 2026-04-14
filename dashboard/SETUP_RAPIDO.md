# ⚡ Setup Rápido do Dashboard

## 🚨 O que você precisa fazer AGORA:

### 1️⃣ Configurar Credenciais do Supabase

Edite o arquivo `.env.local` na pasta `dashboard`:

```bash
cd /Users/maluquintela/tecpred/chatbot-tril/dashboard
```

Abra o arquivo `.env.local` e adicione suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 📍 Onde encontrar as credenciais:

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### 2️⃣ Criar as Views no Supabase

Execute estes scripts SQL no Supabase (na ordem):

1. **SQL Editor** no Supabase
2. Execute cada arquivo:

```sql
-- 1. Schema completo (se ainda não executou)
-- Arquivo: supabase/MASTER_SCHEMA_COMPLETO.sql

-- 2. Views do Dashboard (ESSENCIAL!)
-- Arquivo: supabase/views_dashboard_blocos.sql

-- 3. Funções do Dono
-- Arquivo: supabase/functions_dono.sql
```

---

### 3️⃣ Verificar se as Views foram criadas

Execute no SQL Editor:

```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name LIKE 'vw_%'
ORDER BY table_name;
```

**Você DEVE ver estas views:**
- ✅ `vw_bloco1_visao_geral`
- ✅ `vw_bloco2_atrasos_engenheiro`
- ✅ `vw_bloco3_carga_trabalho`
- ✅ `vw_bloco5_retrabalho_engenheiro`
- ✅ `vw_grafico_projetos_status`
- ✅ `vw_projetos_detalhado`

---

### 4️⃣ Reiniciar o Servidor

Depois de configurar o `.env.local`:

```bash
# Pressione Ctrl+C no terminal onde o servidor está rodando
# Depois rode novamente:
npm run dev
```

---

### 5️⃣ Acessar o Dashboard

Abra seu navegador em: **http://localhost:3000**

---

## ❓ Por que não está funcionando?

O dashboard precisa se conectar ao Supabase para buscar os dados. Sem as credenciais corretas, ele não consegue acessar o banco de dados.

### Checklist:

- [ ] Credenciais do Supabase configuradas no `.env.local`
- [ ] Views criadas no banco de dados
- [ ] Servidor reiniciado após configurar `.env.local`
- [ ] Navegador aberto em http://localhost:3000

---

## 🔍 Como verificar se funcionou:

1. **Console do navegador** (F12): Não deve ter erros de "supabaseUrl" ou "Failed to fetch"
2. **Dashboard**: Deve mostrar dados reais (ou zeros se não houver dados)
3. **Indicador de conexão**: Deve estar verde "Conectado"

---

## 📦 Estrutura Esperada:

```
dashboard/
├── .env.local          ← AQUI vão as credenciais!
├── app/
│   └── page.tsx
├── components/
├── lib/
│   └── supabase.ts     ← Usa as variáveis do .env.local
└── package.json
```

---

## 🆘 Problemas Comuns:

### Erro: "supabaseUrl is required"
- Verifique se o `.env.local` está na pasta `dashboard/`
- Reinicie o servidor após editar

### Erro: "relation vw_bloco1_visao_geral does not exist"
- Execute o arquivo `views_dashboard_blocos.sql` no Supabase

### Dashboard mostra apenas "0" em tudo
- Normal se não houver dados no banco
- Insira dados de teste ou use a aplicação

---

**🎯 Próximo passo:** Configure o `.env.local` e reinicie o servidor!
