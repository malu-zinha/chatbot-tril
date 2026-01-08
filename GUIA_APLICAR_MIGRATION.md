# 🚀 Guia: Aplicar Migration e Conectar Chatbot ao Supabase

## 📋 Pré-requisitos

- ✅ Conta no Supabase criada
- ✅ Projeto no Supabase criado
- ✅ Credenciais do Supabase (URL + Keys)
- ✅ Arquivo `.env` configurado

---

## 🎯 Passo 1: Aplicar Migration no Supabase

### 1.1 Acessar Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Entre no seu projeto
3. Clique em **SQL Editor** (menu lateral esquerdo)

### 1.2 Executar a Migration

1. Clique em **+ New query**
2. Abra o arquivo: `supabase/migrations/001_expand_schema_planilha.sql`
3. **Copie TODO o conteúdo** do arquivo
4. **Cole** no SQL Editor do Supabase
5. Clique em **Run** (ou pressione Ctrl+Enter)
6. Aguarde a mensagem: **"Success. No rows returned"**

### 1.3 Verificar se funcionou

Execute esta query para verificar:

```sql
-- Verificar se as novas colunas existem
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projetos' 
ORDER BY ordinal_position;

-- Verificar se a nova tabela existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'atualizacoes_diarias';

-- Verificar se a view existe
SELECT table_name 
FROM information_schema.views 
WHERE table_name = 'view_projetos_completo';
```

**Resultado esperado:**
- Deve listar ~25 colunas na tabela `projetos`
- Deve retornar `atualizacoes_diarias`
- Deve retornar `view_projetos_completo`

---

## 🎯 Passo 2: Configurar Variáveis de Ambiente

### 2.1 Obter Credenciais do Supabase

No Supabase Dashboard:
1. Clique em **⚙️ Settings** (menu lateral)
2. Clique em **API**
3. Copie os valores:

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.2 Atualizar arquivo `.env`

Edite o arquivo `.env` na raiz do projeto:

```env
# OpenAI (já deve ter)
OPENAI_API_KEY=sk-...

# Supabase - ADICIONAR ESTAS LINHAS
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
SUPABASE_FUNCTIONS_URL=https://xxxxxxxxxxxxx.supabase.co/functions/v1

# Google Sheets (já deve ter)
GOOGLE_SHEETS_ENGINEER_ID=...
GOOGLE_SHEETS_ENGINEER_NAME=Engenheiro(a)
GOOGLE_SHEETS_ENGINEER_RANGE=A2:AE1000
GOOGLE_SHEETS_CEO_ID=...
GOOGLE_SHEETS_CEO_NAME=Dashboard CEO
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
```

⚠️ **IMPORTANTE:** 
- Use `SUPABASE_SERVICE_ROLE_KEY` (não a anon key) para o backend
- Nunca commite o `.env` no git

---

## 🎯 Passo 3: Testar Conexão com Supabase

### 3.1 Criar script de teste

Crie o arquivo `tests/test-supabase-connection.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  console.log('🔍 Testando conexão com Supabase...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no .env');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Teste 1: Listar tabelas
    console.log('📋 Teste 1: Verificar tabelas...');
    const { data: projetos, error: error1 } = await supabase
      .from('projetos')
      .select('id')
      .limit(1);
    
    if (error1) throw error1;
    console.log('✅ Tabela "projetos" acessível');
    
    // Teste 2: Verificar nova tabela
    console.log('\n📋 Teste 2: Verificar nova tabela...');
    const { data: atualizacoes, error: error2 } = await supabase
      .from('atualizacoes_diarias')
      .select('id')
      .limit(1);
    
    if (error2) throw error2;
    console.log('✅ Tabela "atualizacoes_diarias" acessível');
    
    // Teste 3: Verificar view
    console.log('\n📋 Teste 3: Verificar view...');
    const { data: view, error: error3 } = await supabase
      .from('view_projetos_completo')
      .select('codigo')
      .limit(1);
    
    if (error3) throw error3;
    console.log('✅ View "view_projetos_completo" acessível');
    
    // Teste 4: Criar engenheiro de teste
    console.log('\n📋 Teste 4: Criar engenheiro de teste...');
    const { data: eng, error: error4 } = await supabase
      .from('engenheiros')
      .upsert({
        nome: 'Engenheiro Teste',
        whatsapp: '+5511999999999'
      }, {
        onConflict: 'whatsapp'
      })
      .select()
      .single();
    
    if (error4) throw error4;
    console.log('✅ Engenheiro criado/atualizado:', eng.nome);
    
    console.log('\n✅ TODOS OS TESTES PASSARAM! Conexão funcionando perfeitamente! 🎉\n');
    
  } catch (error: any) {
    console.error('\n❌ Erro ao testar conexão:', error.message);
    process.exit(1);
  }
}

testConnection();
```

### 3.2 Executar o teste

```bash
npm run test:supabase
# ou
ts-node --esm tests/test-supabase-connection.ts
```

**Resultado esperado:**
```
✅ Tabela "projetos" acessível
✅ Tabela "atualizacoes_diarias" acessível
✅ View "view_projetos_completo" acessível
✅ Engenheiro criado/atualizado: Engenheiro Teste
✅ TODOS OS TESTES PASSARAM! 🎉
```

---

## 🎯 Passo 4: Verificar Estrutura no Supabase Dashboard

### 4.1 Verificar Tabelas

1. No Supabase Dashboard
2. Clique em **Table Editor** (menu lateral)
3. Você deve ver:
   - ✅ `engenheiros`
   - ✅ `projetos` (com novas colunas)
   - ✅ `atualizacoes_diarias` (nova)
   - ✅ `execucao_diaria`
   - ✅ `retrabalhos`

### 4.2 Verificar Colunas da Tabela `projetos`

Clique na tabela `projetos`, você deve ver estas colunas:

**Básicas:**
- id, codigo, nome, cliente, engenheiro_id, area, tipo_obra, status

**Novas:**
- contato_cliente
- tipo_projeto
- descricao_projeto
- complexidade
- dias_estimados_interno
- data_final_cliente
- prazo_interno_dias
- prazo_cliente_dias
- dias_atraso
- etapa_atual
- metrica_retrabalho
- data_entrega_real
- lead_time_dias
- dias_parado_cliente
- dias_parado_tecpred

### 4.3 Verificar Tabela `atualizacoes_diarias`

Clique na tabela `atualizacoes_diarias`, você deve ver:

- id
- projeto_id (FK)
- data
- previsao_dia
- status_projeto
- feito_dia
- necessitou_retrabalho
- motivo_revisao
- data_registro_retrabalho
- etapa
- observacoes

---

## 🎯 Passo 5: Adicionar Script ao package.json

Edite `package.json` e adicione:

```json
{
  "scripts": {
    "test:supabase": "ts-node --esm tests/test-supabase-connection.ts"
  }
}
```

---

## ✅ Checklist Final

Antes de prosseguir, confirme:

- [ ] Migration executada com sucesso no Supabase
- [ ] Variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no `.env`
- [ ] Teste de conexão passou (todos os ✅)
- [ ] Tabela `projetos` tem ~25 colunas
- [ ] Tabela `atualizacoes_diarias` existe
- [ ] View `view_projetos_completo` existe

---

## 🐛 Troubleshooting

### Erro: "relation projetos already exists"

**Solução:** A tabela já existe. Ignore este erro, as colunas serão adicionadas pelo `ALTER TABLE`.

### Erro: "column already exists"

**Solução:** A migration já foi executada anteriormente. Tudo ok!

### Erro: "Invalid API key"

**Solução:** 
1. Verifique se copiou a `service_role` key (não a `anon` key)
2. Verifique se não há espaços extras no `.env`

### Erro: "Could not connect to database"

**Solução:**
1. Verifique se o projeto no Supabase está ativo
2. Verifique a URL no `.env`
3. Tente pausar e resumir o projeto no Dashboard

---

## 📚 Próximos Passos

Após aplicar a migration com sucesso:

1. ✅ Integrar o código do chatbot (próximo guia)
2. ✅ Implementar sincronização bidirecional
3. ✅ Configurar cron jobs
4. ✅ Testar fluxo completo

---

**Dúvidas?** Consulte:
- `supabase/MAPEAMENTO_PLANILHA_BD.md` - Mapeamento completo
- `supabase/migrations/001_expand_schema_planilha.sql` - SQL da migration

**Data:** 2025-01-06

