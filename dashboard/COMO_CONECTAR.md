# 🔌 Como Conectar o Dashboard ao Supabase

## ⚡ Resumo Rápido (5 minutos)

### 1️⃣ Configure o .env.local

Abra o arquivo `.env.local` nesta pasta e coloque suas credenciais:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR...
```

**Onde pegar:**
1. Acesse https://app.supabase.com
2. Abra seu projeto
3. Settings → API
4. Copie "Project URL" e "anon public"

---

### 2️⃣ Execute os SQLs no Supabase

Acesse o **SQL Editor** no Supabase e execute os arquivos **nesta ordem**:

```
✅ 1. ../supabase/MASTER_SCHEMA_COMPLETO.sql
✅ 2. ../supabase/views_dashboard_blocos.sql  
✅ 3. ../supabase/tabela_evandro_dono.sql
✅ 4. ../supabase/functions_dono.sql
```

**Como executar:**
- Abra o arquivo
- Copie todo o conteúdo
- Cole no SQL Editor
- Clique em "Run"

---

### 3️⃣ Habilite o Realtime

No Supabase:
1. Vá em **Database** → **Replication**
2. Procure e **habilite** estas tabelas:
   - ✅ engenheiros_projetos
   - ✅ projetos_previsao
   - ✅ retrabalho_projetos

---

### 4️⃣ Teste a Conexão

No terminal, execute:

```bash
node teste-conexao.js
```

Você verá algo como:

```
✅ Credenciais encontradas
✅ View 'vw_bloco1_visao_geral' OK
✅ Tabela 'projetos_previsao': 15 registros
📊 Resumo do Dashboard:
   • Total de Projetos: 15
   • Concluídos: 8
   • Em Execução: 5
   • Atrasados: 2
```

---

### 5️⃣ Inicie o Dashboard

```bash
npm run dev
```

Acesse: **http://localhost:3000**

---

## 🐛 Problemas Comuns

### ❌ "supabaseUrl is required"
**Solução:** Reinicie o servidor após editar `.env.local`

### ❌ "relation vw_bloco1_visao_geral does not exist"
**Solução:** Execute o arquivo `views_dashboard_blocos.sql` no Supabase

### ❌ Dashboard mostra zeros
**Solução:** Banco está vazio. Insira dados de teste (veja abaixo)

---

## 📊 Inserir Dados de Teste

Se o banco estiver vazio, execute no SQL Editor:

```sql
-- Engenheiros
INSERT INTO engenheiros_projetos (eng_id, nome_eng, exclusivo, whatsapp)
VALUES 
  ('ENG001', 'João Silva', false, '+5511999999999'),
  ('ENG002', 'Maria Santos', true, '+5511988888888');

-- Projetos
INSERT INTO projetos_previsao (
  codigo_projeto, eng_id, area_id, complexidade_id,
  dias_estimados, percentual_execucao, status_id
)
VALUES 
  ('PROJ001', 'ENG001', 1, 1, 10, 50, 2),
  ('PROJ002', 'ENG002', 2, 2, 15, 80, 2),
  ('PROJ003', 'ENG001', 3, 1, 8, 100, 3);
```

---

## ✅ Checklist Final

Antes de iniciar o dashboard, verifique:

- [ ] `.env.local` configurado com credenciais reais
- [ ] 4 scripts SQL executados no Supabase
- [ ] Realtime habilitado para 3 tabelas
- [ ] `node teste-conexao.js` passou sem erros
- [ ] Há dados no banco (pelo menos 1 projeto)

---

## 🎉 Pronto!

Se tudo estiver OK, você verá:

- ✅ Dados reais no dashboard
- ✅ "Conectado" em verde no cabeçalho
- ✅ Números reais nos KPIs
- ✅ Gráficos com dados verdadeiros
- ✅ Atualizações em tempo real funcionando

---

**Dúvidas?** Leia o guia completo em `CONFIGURACAO_SUPABASE.md`
