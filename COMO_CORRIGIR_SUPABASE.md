# 📋 COMO CORRIGIR NO SUPABASE

## 🎯 Passo a Passo

### 1. Abrir o Supabase Dashboard
- Acesse: https://app.supabase.com
- Entre no seu projeto

### 2. Ir para o SQL Editor
- No menu lateral esquerdo, clique em **"SQL Editor"**
- Ou acesse diretamente: `https://app.supabase.com/project/SEU_PROJETO/sql/new`

### 3. Copiar o SQL corrigido
- Abra o arquivo: **`COLAR_NO_SUPABASE.sql`** (na raiz do projeto)
- Copie **TODO** o conteúdo

### 4. Colar e Executar
- Cole o código no SQL Editor do Supabase
- Clique no botão **"Run"** (ou pressione `Ctrl+Enter` / `Cmd+Enter`)

### 5. Confirmar Sucesso
Você deve ver uma mensagem de sucesso tipo:
```
Success. No rows returned
```

---

## ✅ O que foi corrigido?

**Linha 17 da função:**
```sql
-- ANTES (ERRADO):
v_area_id INTEGER;

-- DEPOIS (CORRETO):
v_area_id UUID;
```

**Por quê?**
- A tabela `areas` tem `area_id` como tipo `UUID`
- A função tentava guardar um UUID em uma variável INTEGER
- Isso causava o erro: `invalid input syntax for type integer`

---

## 🧪 Testar depois

Após aplicar a correção, você pode testar no terminal:

```bash
npm run test:bot-completo
```

E seguir o fluxo completo:
1. Escolher engenheiro
2. Escolher projeto existente
3. Escolher área
4. Informar descrição
5. Escolher complexidade
6. Datas
7. Confirmar

Agora deve salvar sem erros! ✅

---

## 📌 Atalho Rápido

Se preferir, pode executar direto do terminal (se tiver Supabase CLI instalado):

```bash
cd chatbot-tril
supabase db reset --db-url "postgresql://postgres:[senha]@db.[projeto].supabase.co:5432/postgres"
```

Mas o método manual pelo Dashboard é mais seguro! 👍

