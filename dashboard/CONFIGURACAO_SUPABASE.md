# Configuração do Supabase para o Dashboard

## Passo 1: Obter as Credenciais do Supabase

1. Acesse seu projeto no Supabase: https://app.supabase.com
2. Clique em **Settings** (Configurações) no menu lateral
3. Vá em **API**
4. Copie:
   - **Project URL** (URL do projeto)
   - **anon public** key (Chave pública anônima)

## Passo 2: Configurar o Arquivo .env.local

Abra o arquivo `.env.local` na pasta `dashboard` e substitua os valores:

```bash
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
```

**Exemplo:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Passo 3: Criar as Views no Banco de Dados

Você precisa executar os scripts SQL no Supabase para criar as views necessárias:

1. Acesse o **SQL Editor** no Supabase
2. Execute os seguintes arquivos SQL **NA ORDEM**:

### 3.1. Schema Principal
```bash
chatbot-tril/supabase/MASTER_SCHEMA_COMPLETO.sql
```
Este arquivo cria todas as tabelas principais.

### 3.2. Views do Dashboard
```bash
chatbot-tril/supabase/views_dashboard_blocos.sql
```
Este arquivo cria as views específicas para o dashboard.

### 3.3. Funções do Dono
```bash
chatbot-tril/supabase/functions_dono.sql
```
Funções para distribuir tarefas e consultar status.

### 3.4. Tabelas do Evandro (Dono)
```bash
chatbot-tril/supabase/tabela_evandro_dono.sql
```
Tabelas e views específicas para o dono.

### 3.5. Segurança (Opcional mas Recomendado)
```bash
chatbot-tril/supabase/security_policies.sql
```
Implementa Row Level Security (RLS).

## Passo 4: Verificar se as Views Foram Criadas

No SQL Editor do Supabase, execute:

```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name LIKE 'vw_%'
ORDER BY table_name;
```

Você deve ver as seguintes views:
- `vw_bloco1_visao_geral`
- `vw_bloco2_atrasos_engenheiro`
- `vw_bloco2_atrasos_area`
- `vw_bloco3_carga_trabalho`
- `vw_bloco4_execucao_media`
- `vw_bloco5_retrabalho_engenheiro`
- `vw_bloco5_retrabalho_area`
- `vw_grafico_projetos_status`
- `vw_grafico_atrasos_engenheiro`
- `vw_grafico_carga_trabalho`
- `vw_grafico_retrabalho_area`

## Passo 5: Habilitar Realtime

Para atualizações em tempo real, você precisa habilitar o Realtime no Supabase:

1. Vá em **Database** → **Replication**
2. Habilite as seguintes tabelas:
   - `engenheiros_projetos`
   - `projetos_previsao`
   - `retrabalho_projetos`
   - `areas_bd`
   - `complexidade_tarefas`

## Passo 6: Inserir Dados de Teste (Opcional)

Se o banco estiver vazio, você pode inserir dados de teste. Execute no SQL Editor:

```sql
-- Inserir engenheiro de teste
INSERT INTO engenheiros_projetos (eng_id, nome_eng, exclusivo, whatsapp)
VALUES ('ENG001', 'João Silva', false, '+5511999999999');

-- Inserir área de teste
INSERT INTO areas_bd (cod_area, area)
VALUES ('A001', 'Estrutura Metálica');

-- Inserir projeto de teste
INSERT INTO projetos_previsao (
  codigo_projeto,
  eng_id,
  area_id,
  complexidade_id,
  dias_estimados,
  percentual_execucao,
  status_id
)
VALUES (
  'PROJ001',
  'ENG001',
  (SELECT area_id FROM areas_bd WHERE cod_area = 'A001'),
  1, -- Baixa complexidade
  10,
  50,
  2 -- Em execução
);
```

## Passo 7: Reiniciar o Servidor

Após configurar o `.env.local`, reinicie o servidor:

```bash
# Parar o servidor (Ctrl+C)
# Iniciar novamente
cd /Users/maluquintela/tecpred/chatbot-tril/dashboard
npm run dev
```

## Verificação

Acesse http://localhost:3000 e verifique:
- ✅ Dados reais aparecem no dashboard
- ✅ Console do navegador não mostra erros do Supabase
- ✅ Indicador "Conectado" em verde no cabeçalho
- ✅ Atualizações em tempo real funcionando

## Troubleshooting

### Erro: "supabaseUrl is required"
- Verifique se o `.env.local` está na pasta correta (`dashboard/`)
- Reinicie o servidor após editar o arquivo

### Erro: "relation vw_bloco1_visao_geral does not exist"
- Execute o script `views_dashboard_blocos.sql` no Supabase

### Dados não aparecem
- Verifique se há dados nas tabelas principais
- Verifique as políticas RLS (se habilitadas)
- Confira o console do navegador para erros

### Realtime não funciona
- Habilite as tabelas no Replication
- Verifique se o plano do Supabase suporta Realtime
