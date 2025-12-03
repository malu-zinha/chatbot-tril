# 🎯 Guia 5 Dias - Maluliaa (Backend, Banco de Dados e Integrações)

## 📋 O Que Você Vai Fazer

1. ✅ Criar banco de dados no Supabase
2. ✅ Criar 3 APIs (Edge Functions)
3. ✅ Integrar com Google Sheets
4. ✅ Configurar segurança (RLS)
5. ✅ Testar tudo

---

## 📅 Plano de 5 Dias

```
DIA 1: Setup + Banco de Dados
├── Criar contas (Supabase + Google Cloud)
├── Instalar ferramentas
├── Criar tabelas
└── Inserir dados de teste

DIA 2: Segurança + Views
├── Configurar RLS (policies)
├── Criar views agregadas
└── Testar queries

DIA 3: Edge Functions (APIs)
├── Criar registrarExecucao
├── Criar registrarRetrabalho
├── Criar statusProjeto
└── Testar localmente

DIA 4: Google Sheets
├── Configurar Google Sheets API
├── Implementar googleSheetsService
├── Implementar ceo_sync
└── Testar sincronização

DIA 5: Deploy + Testes Finais
├── Deploy das Edge Functions
├── Configurar sincronização automática
├── Testes de integração completos
└── Documentação final
```

---

## 🚀 DIA 1: Setup + Banco de Dados

### 1.1 Instalar Ferramentas

```bash
# Node.js v18+
node --version

# Git
git --version

# Supabase CLI
npm install -g supabase
supabase --version
```

---

### 1.2 Criar Contas

#### Supabase
1. https://supabase.com/ → "Start your project"
2. Login com GitHub
3. Criar projeto: `chatbot-tril-consult`
4. Password: **ANOTAR**
5. Region: South America (São Paulo)
6. Aguardar 2min
7. **ANOTAR** (Settings → API):
   - Project URL
   - `anon` key
   - `service_role` key

#### Google Cloud
1. https://console.cloud.google.com/
2. Criar projeto: `chatbot-tril-sheets`
3. Ativar: "Google Sheets API" (APIs & Services → Library)
4. Criar Service Account:
   - APIs & Services → Credentials → Create Credentials
   - Nome: `chatbot-tril-service`
   - **ANOTAR** o email
5. Baixar credenciais:
   - Keys → Add Key → Create new key → JSON
   - Salvar como `credentials.json` na raiz do projeto
   - ⚠️ Adicionar no `.gitignore`

---

### 1.3 Configurar `.env`

Criar arquivo `.env` na raiz:

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_FUNCTIONS_URL=https://xxxxx.supabase.co/functions/v1

# Google Sheets
GOOGLE_SHEETS_ID=
GOOGLE_SHEETS_RANGE=A1:Z1000
GOOGLE_SHEETS_ENGINEER_SHEET=Engenheiro
GOOGLE_SHEETS_EVANDRO_SHEET=Evandro
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
```

---

### 1.4 Criar Tabelas no Supabase

#### Opção 1: Via SQL Editor (Recomendado)

1. Supabase Dashboard → SQL Editor → New query
2. Abrir `supabase/db_schema.sql` no VS Code
3. Copiar TODO o conteúdo
4. Colar no SQL Editor
5. Run (Ctrl+Enter)
6. Verificar "Success"

#### Opção 2: Manualmente (via interface)

Table Editor → New table para cada uma:

**Tabela `engenheiros`:**
- `id` (uuid, PK, default: gen_random_uuid())
- `nome` (varchar, NOT NULL)
- `whatsapp` (varchar, NOT NULL, UNIQUE)
- `email` (varchar, UNIQUE)
- `ativo` (boolean, default: true)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**Tabela `projetos`:**
- `id` (uuid, PK, default: gen_random_uuid())
- `codigo` (varchar, UNIQUE)
- `nome` (varchar, NOT NULL)
- `cliente` (varchar, NOT NULL)
- `engenheiro_id` (uuid, FK → engenheiros.id)
- `area` (varchar)
- `tipo_obra` (varchar)
- `status` (varchar, default: 'Em Planejamento')
- `percentual_total` (numeric(5,2), default: 0.00)
- `data_inicio` (date)
- `data_previsao_termino` (date)
- `observacoes` (text)
- `ativo` (boolean, default: true)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

**Tabela `execucao_diaria`:**
- `id` (uuid, PK, default: gen_random_uuid())
- `projeto_id` (uuid, FK → projetos.id)
- `data` (date, NOT NULL, default: CURRENT_DATE)
- `percentual_previsto` (numeric(5,2))
- `percentual_realizado` (numeric(5,2), NOT NULL)
- `percentual_acumulado` (numeric(5,2))
- `observacoes` (text)
- `notificacao_enviada` (boolean, default: false)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())
- UNIQUE constraint: (projeto_id, data)

**Tabela `retrabalhos`:**
- `id` (uuid, PK, default: gen_random_uuid())
- `projeto_id` (uuid, FK → projetos.id)
- `execucao_diaria_id` (uuid, FK → execucao_diaria.id, ON DELETE SET NULL)
- `data` (date, NOT NULL, default: CURRENT_DATE)
- `motivo` (varchar, NOT NULL)
- `categoria` (varchar)
- `descricao` (text, NOT NULL)
- `impacto_percentual` (numeric(5,2))
- `tempo_perdido_horas` (numeric(8,2))
- `acao_corretiva` (text)
- `resolvido` (boolean, default: false)
- `data_resolucao` (date)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())

---

### 1.5 Inserir Dados de Teste

SQL Editor → New query:

```sql
-- Engenheiro de teste
INSERT INTO engenheiros (nome, whatsapp, email)
VALUES ('João Teste', '+5511999999999', 'joao@teste.com')
RETURNING id;

-- Copiar o UUID retornado e usar no próximo INSERT

-- Projeto de teste
INSERT INTO projetos (codigo, nome, cliente, engenheiro_id, area, status)
VALUES (
  'PRJ-001',
  'Instalação Elétrica Prédio A',
  'Construtora ABC',
  'COLAR-UUID-AQUI',
  'Elétrico',
  'Em Execução'
);
```

---

### 1.6 Verificar

- [ ] 4 tabelas criadas (Table Editor)
- [ ] Dados de teste inseridos
- [ ] Sem erros

---

## 🔒 DIA 2: Segurança + Views

### 2.1 Habilitar RLS

SQL Editor → New query:

```sql
ALTER TABLE engenheiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE execucao_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE retrabalhos ENABLE ROW LEVEL SECURITY;
```

---

### 2.2 Criar Policies

Copiar TODO o conteúdo de `supabase/policies.sql` → SQL Editor → Run

**O que faz:**
- Engenheiros veem só seus projetos
- CEO vê tudo
- Service Role (Edge Functions) bypassa RLS

**Verificar:**
- Authentication → Policies
- Deve listar várias policies para cada tabela

---

### 2.3 Criar Views

Copiar TODO o conteúdo de `supabase/views.sql` → SQL Editor → Run

**Views criadas:**
1. `view_progresso_geral` - dados consolidados
2. `view_progresso_por_engenheiro` - por engenheiro
3. `view_retrabalhos_resumo` - análise de retrabalhos
4. `view_execucao_semanal` - por semana
5. `view_dashboard_ceo` ⭐ **PRINCIPAL** (usada pelo ceo_sync)

---

### 2.4 Testar Views

SQL Editor → New query:

```sql
SELECT * FROM view_dashboard_ceo;
SELECT * FROM view_progresso_geral;
```

Deve retornar dados (mesmo que vazio).

---

### 2.5 Checklist Dia 2

- [ ] RLS habilitado
- [ ] Policies aplicadas
- [ ] 5 views criadas
- [ ] Views retornam dados

---

## ⚡ DIA 3: Edge Functions (APIs)

### 3.1 Setup Supabase CLI

```bash
# Login
supabase login

# Link ao projeto
supabase link --project-ref SEU-PROJECT-REF
```

(Project REF está em Settings → General)

---

### 3.2 Criar Edge Function: registrarExecucao

```bash
# Criar função
supabase functions new registrarExecucao
```

Isso cria: `supabase/functions/registrarExecucao/index.ts`

**Sua tarefa:**
1. Abrir o arquivo criado
2. Estudar `supabase/edge_functions/registrarExecucao/index.ts` (já existe no projeto)
3. Implementar a lógica seguindo a estrutura:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Pegar body
    const body = await req.json();

    // 2. Validar
    // ...validações aqui

    // 3. Conectar Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 4. Verificar se projeto existe
    // 5. Calcular percentual_acumulado
    // 6. Inserir em execucao_diaria (upsert)
    // 7. Retornar sucesso

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

---

### 3.3 Testar Localmente

```bash
# Terminal 1: Iniciar Supabase local
supabase start

# Terminal 2: Servir a função
supabase functions serve registrarExecucao
```

**Testar com curl:**

```bash
curl -X POST http://localhost:54321/functions/v1/registrarExecucao \
  -H "Content-Type: application/json" \
  -H "apikey: SEU-ANON-KEY" \
  -d '{
    "projeto_id": "UUID-DO-PROJETO",
    "percentual_realizado": 8,
    "percentual_previsto": 10
  }'
```

Ou usar Thunder Client (extensão VS Code).

---

### 3.4 Criar Outras Edge Functions

Repetir processo para:

**registrarRetrabalho:**
```bash
supabase functions new registrarRetrabalho
```
- Estudar `supabase/edge_functions/registrarRetrabalho/index.ts`
- Implementar
- Testar

**statusProjeto:**
```bash
supabase functions new statusProjeto
```
- Este é GET (não POST)
- Query params: `?codigo=PRJ-001`
- Estudar, implementar, testar

---

### 3.5 Checklist Dia 3

- [ ] 3 Edge Functions criadas
- [ ] Testadas localmente
- [ ] Retornam dados corretos

---

## 🔗 DIA 4: Google Sheets

### 4.1 Configurar Planilha

1. Criar planilha: "Dashboard CEO - Tril Consult"
2. Copiar ID da URL
3. Adicionar no `.env`:
```env
GOOGLE_SHEETS_ID=ID-COPIADO
```
4. **IMPORTANTE:** Compartilhar planilha com o email da Service Account (com permissão de Editor)

---

### 4.2 Implementar googleSheetsService.ts

Abrir `integrations/sheets/googleSheetsService.ts`

**Implementar classe:**

```typescript
import { google } from 'googleapis';

export class GoogleSheetsService {
  private sheets: any;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    this.sheets = google.sheets({ version: 'v4', auth });
  }

  // Ler planilha
  async readSheet(spreadsheetId: string, range: string) {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return response.data.values || [];
  }

  // Escrever na planilha
  async writeSheet(spreadsheetId: string, range: string, values: any[][]) {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }

  // Limpar planilha
  async clearSheet(spreadsheetId: string, range: string) {
    await this.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });
  }
}

export function getGoogleSheetsService() {
  return new GoogleSheetsService();
}
```

---

### 4.3 Implementar ceo_sync.ts

Abrir `integrations/sheets/ceo_sync.ts`

**Estrutura:**

```typescript
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

class CEOSyncService {
  private supabase: any;
  private sheets: any;

  constructor() {
    // Inicializar Supabase
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Inicializar Google Sheets
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    this.sheets = google.sheets({ version: 'v4', auth });
  }

  // 1. Buscar dados do Supabase (view_dashboard_ceo)
  async buscarDadosConsolidados() {
    const { data, error } = await this.supabase
      .from('view_dashboard_ceo')
      .select('*')
      .order('"% Concluído"', { ascending: false });

    if (error) throw error;
    return data;
  }

  // 2. Formatar para planilha (array de arrays)
  formatarParaPlanilha(dados: any[]) {
    const header = [
      'Código', 'Projeto', 'Cliente', 'Engenheiro', 'Área',
      'Tipo Obra', 'Status', '% Concluído', 'Data Início',
      'Previsão Término', 'Última Atualização', 'Retrabalhos',
      'Impacto (%)', 'Situação'
    ];

    const rows = dados.map(row => [
      row['Código Projeto'],
      row['Nome Projeto'],
      row['Cliente'],
      row['Engenheiro'],
      row['Área'],
      row['Tipo Obra'],
      row['Status'],
      row['% Concluído'],
      row['Data Início'],
      row['Previsão Término'],
      row['Última Atualização'],
      row['Total Retrabalhos'],
      row['Impacto Retrabalho (%)'],
      row['Situação']
    ]);

    return [header, ...rows];
  }

  // 3. Sincronizar (PRINCIPAL)
  async sincronizarParaCEO(spreadsheetId: string, sheetName: string = 'Dashboard Geral') {
    try {
      // Buscar dados
      const dados = await this.buscarDadosConsolidados();
      
      // Formatar
      const valores = this.formatarParaPlanilha(dados);
      
      // Limpar planilha
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A1:Z`,
      });
      
      // Escrever dados
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: valores },
      });
      
      // Adicionar timestamp
      const timestampRow = valores.length + 2;
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${timestampRow}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[`Última atualização: ${new Date().toLocaleString('pt-BR')}`]]
        },
      });

      return {
        success: true,
        projetos_exportados: dados.length,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        projetos_exportados: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  // 4. Sincronização automática (a cada X minutos)
  async iniciarSincronizacaoAutomatica(
    spreadsheetId: string,
    sheetName: string = 'Dashboard Geral',
    intervaloMinutos: number = 30
  ) {
    // Primeira sincronização imediata
    await this.sincronizarParaCEO(spreadsheetId, sheetName);

    // Agendar próximas
    setInterval(async () => {
      console.log('⏰ Executando sincronização agendada...');
      await this.sincronizarParaCEO(spreadsheetId, sheetName);
    }, intervaloMinutos * 60 * 1000);
  }
}

export const ceoSyncService = new CEOSyncService();

export async function sincronizarParaCEO(spreadsheetId: string, sheetName?: string) {
  return ceoSyncService.sincronizarParaCEO(spreadsheetId, sheetName);
}

export async function iniciarSincronizacaoAutomatica(
  spreadsheetId: string,
  sheetName?: string,
  intervaloMinutos?: number
) {
  return ceoSyncService.iniciarSincronizacaoAutomatica(
    spreadsheetId,
    sheetName,
    intervaloMinutos
  );
}
```

---

### 4.4 Testar Sincronização Manual

Criar `tests/test-ceo-sync.ts`:

```typescript
import { sincronizarParaCEO } from '../integrations/sheets/ceo_sync';
import dotenv from 'dotenv';

dotenv.config();

async function testar() {
  console.log('🧪 Testando sincronização CEO...\n');
  
  const resultado = await sincronizarParaCEO(
    process.env.GOOGLE_SHEETS_ID!,
    'Dashboard Geral'
  );
  
  console.log('Resultado:', resultado);
}

testar();
```

Executar:
```bash
npm run test:ceo-sync
```

(Adicionar script no `package.json`)

---

### 4.5 Checklist Dia 4

- [ ] Google Sheets API configurada
- [ ] Service Account tem acesso à planilha
- [ ] googleSheetsService implementado
- [ ] ceo_sync implementado
- [ ] Teste manual funcionando
- [ ] Dados aparecem na planilha

---

## 🚀 DIA 5: Deploy + Testes Finais

### 5.1 Deploy Edge Functions

```bash
# Deploy cada função
supabase functions deploy registrarExecucao
supabase functions deploy registrarRetrabalho
supabase functions deploy statusProjeto
```

Anotar as URLs retornadas.

---

### 5.2 Testar APIs em Produção

**Thunder Client ou curl:**

```bash
# Teste registrarExecucao
curl -X POST https://SEU-PROJETO.supabase.co/functions/v1/registrarExecucao \
  -H "Content-Type: application/json" \
  -H "apikey: SEU-ANON-KEY" \
  -d '{
    "projeto_id": "UUID",
    "percentual_realizado": 8
  }'

# Teste statusProjeto
curl https://SEU-PROJETO.supabase.co/functions/v1/statusProjeto?codigo=PRJ-001 \
  -H "apikey: SEU-ANON-KEY"
```

---

### 5.3 Configurar Sincronização Automática

Adicionar no `src/index.ts`:

```typescript
import { iniciarSincronizacaoAutomatica } from './integrations/sheets/ceo_sync';

// Depois de iniciar o bot
console.log('🔄 Configurando sincronização automática...');
await iniciarSincronizacaoAutomatica(
  process.env.GOOGLE_SHEETS_ID!,
  'Dashboard Geral',
  30 // minutos
);
console.log('✅ Sincronização configurada (a cada 30min)');
```

---

### 5.4 Testes de Integração Completos

**Cenário 1: Registrar Execução**
1. Chamar API `registrarExecucao`
2. Verificar dados no banco (Supabase Dashboard)
3. Aguardar sincronização (ou forçar manual)
4. Verificar se apareceu na planilha

**Cenário 2: Registrar Retrabalho**
1. Chamar API `registrarRetrabalho`
2. Verificar no banco
3. Verificar na planilha (coluna de retrabalhos)

**Cenário 3: Consultar Status**
1. Chamar API `statusProjeto`
2. Verificar resposta com dados agregados

---

### 5.5 Configurar Variáveis de Ambiente em Produção

Se usar Vercel/Heroku/outro serviço, adicionar todas as vars do `.env` no dashboard.

Para Supabase Edge Functions:
```bash
supabase secrets set GOOGLE_SHEETS_ID=xxxxx
supabase secrets set GOOGLE_APPLICATION_CREDENTIALS="$(cat credentials.json)"
```

---

### 5.6 Monitoramento

**Logs das Edge Functions:**
- Supabase Dashboard → Edge Functions → Selecionar função → Logs

**Adicionar logs úteis no código:**
```typescript
console.log('Request recebido:', body);
console.log('Executado com sucesso');
console.error('Erro:', error);
```

---

### 5.7 Documentar

Atualizar `README.md` ou criar `API-DOCS.md` com:
- URLs das APIs
- Exemplos de request/response
- Como testar
- Códigos de erro

---

### 5.8 Checklist Final

- [ ] Edge Functions deployadas e funcionando
- [ ] APIs testadas em produção
- [ ] Sincronização automática configurada
- [ ] Dados fluindo: Banco → Planilha
- [ ] Logs configurados
- [ ] Documentação atualizada
- [ ] Backup do banco feito
- [ ] `.env` NÃO está no Git
- [ ] `credentials.json` NÃO está no Git

---

## 🔧 Comandos Úteis

```bash
# Supabase
supabase login
supabase link --project-ref SEU-REF
supabase start                    # Local
supabase functions serve NOME     # Testar função local
supabase functions deploy NOME    # Deploy função
supabase secrets set KEY=value    # Adicionar secret

# Git
git status
git add .
git commit -m "feat: adiciona edge functions"
git push origin SUA-BRANCH

# npm
npm install
npm run dev
npm run test
```

---

## 🆘 Troubleshooting

### Erro: "relation does not exist"
- Tabela não foi criada
- Verificar no Table Editor

### Erro: "RLS policy"
- Policies não aplicadas
- Verificar Authentication → Policies

### Erro: "Failed to fetch"
- Edge Function não deployada
- Verificar URL e apikey

### Erro: "Permission denied" (Google Sheets)
- Service Account não tem acesso
- Compartilhar planilha com o email

### Erro: "Invalid JWT"
- apikey errada
- Verificar Settings → API

---

## ✅ Checklist Geral

### Setup
- [ ] Contas criadas (Supabase + Google Cloud)
- [ ] Ferramentas instaladas
- [ ] `.env` configurado
- [ ] `credentials.json` baixado

### Banco de Dados
- [ ] 4 tabelas criadas
- [ ] RLS habilitado
- [ ] Policies aplicadas
- [ ] 5 views criadas
- [ ] Dados de teste inseridos

### Edge Functions
- [ ] registrarExecucao criada e deployada
- [ ] registrarRetrabalho criada e deployada
- [ ] statusProjeto criada e deployada
- [ ] Testadas localmente
- [ ] Testadas em produção

### Google Sheets
- [ ] API configurada
- [ ] Service Account criada
- [ ] Planilha compartilhada
- [ ] googleSheetsService implementado
- [ ] ceo_sync implementado
- [ ] Sincronização manual funcionando
- [ ] Sincronização automática configurada

### Produção
- [ ] Deploy completo
- [ ] Logs configurados
- [ ] Documentação atualizada
- [ ] Testes de integração passando
- [ ] Backup do banco

---

**Pronto! 🚀**

Em 5 dias você terá todo o backend funcionando. Foque em uma coisa por vez e teste frequentemente.
