# 🧹 COMO LIMPAR E TESTAR DO ZERO

## 📋 Guia Rápido

### Passo 1: Limpar Dados de Teste

```sql
-- No Supabase SQL Editor, execute:
\i supabase/LIMPAR_DADOS_TESTE.sql
```

**O que este script faz:**
- ✅ Deleta todos os projetos
- ✅ Deleta todas as atribuições (engenheiros_projetos)
- ✅ Deleta todos os prazos
- ✅ Deleta todas as tarefas distribuídas (evandro_distribuicao_tasks)
- ✅ Deleta todas as notificações
- ✅ Deleta todos os retrabalhos
- ✅ Deleta todas as previsões diárias
- ✅ **MANTÉM:** Engenheiros, Áreas, Status, Complexidades, Dono

### Passo 2: Criar Projetos de Teste (Opcional)

```sql
-- No Supabase SQL Editor, execute:
\i supabase/CRIAR_PROJETO_TESTE.sql
```

**Projetos criados:**
- PRJ-RES-001 - Cliente Residencial A
- PRJ-COM-001 - Cliente Comercial B
- PRJ-IND-001 - Cliente Industrial C
- PRJ-INF-001 - Cliente Infraestrutura D
- PRJ-TESTE - Cliente Teste

### Passo 3: Testar no Terminal

```bash
cd chatbot-tril
npm run test:bot-completo
```

**Digite:** `+5583988990772` (número do dono)

## 🎯 Cenários de Teste

### Teste 1: Criar Novo Projeto
```
1. Digite: menu
2. Digite: 3 (Criar novo projeto)
3. Código: PRJ-NOVO-001
4. Cliente: Meu Cliente Teste
5. Descrição: Projeto criado pelo teste
6. Confirmar: 1
```

### Teste 2: Distribuir Projeto com Prazos
```
1. Digite: menu
2. Digite: 2 (Distribuir projeto)
3. Escolha engenheiro: 1
4. Escolha projeto: 1 (PRJ-RES-001)
5. Escolha área: 1
6. Data início: hoje
7. Data início cliente: pular
8. Prazo interno: 15/03/2026
9. Prazo cliente: 30/03/2026
10. Observações: pular
11. Confirmar: 1
```

### Teste 3: Visualizar por Projeto
```
1. Digite: menu
2. Digite: 1 (Visualizar)
3. Digite: a (Por Projeto)
4. Escolha projeto: 1
5. Escolha área: 1
```

### Teste 4: Visualizar por Engenheiro
```
1. Digite: menu
2. Digite: 1 (Visualizar)
3. Digite: b (Por Engenheiro)
4. Escolha engenheiro: 1
5. Escolha projeto: 1
```

### Teste 5: Histórico de Retrabalhos
```
1. Digite: menu
2. Digite: 1 (Visualizar)
3. Digite: c (Histórico Retrabalhos)
4. Digite: 1 (Ver todos)
```

## 📊 Verificar no Supabase

### Ver projetos ativos
```sql
SELECT 
    projeto_id,
    codigo_projeto,
    cliente,
    created_at
FROM projetos
WHERE ativo = true
ORDER BY created_at DESC;
```

### Ver atribuições recentes
```sql
SELECT 
    ep.id,
    e.nome as engenheiro,
    p.codigo_projeto,
    a.descricao as area,
    ep.data_inicio,
    ep.data_prevista,
    s.descricao as status,
    ep.created_at
FROM engenheiros_projetos ep
JOIN engenheiros e ON e.eng_id = ep.eng_id
JOIN projetos p ON p.projeto_id = ep.projeto_id
JOIN areas a ON a.area_id = ep.area_id
LEFT JOIN status_codes s ON s.status_id = ep.status_id
WHERE ep.ativo = true
ORDER BY ep.created_at DESC
LIMIT 10;
```

### Ver prazos cadastrados
```sql
SELECT 
    pr.id,
    p.codigo_projeto,
    e.nome as engenheiro,
    a.descricao as area,
    pr.data_inicio_projeto,
    pr.prazo_final_eng,
    pr.prazo_final_cliente,
    pr.prazo_interno_dias,
    pr.prazo_cliente_dias,
    pr.created_at
FROM prazos pr
JOIN projetos p ON p.projeto_id = pr.projeto_id
JOIN engenheiros e ON e.eng_id = pr.eng_id
JOIN engenheiros_projetos ep ON ep.id = pr.eng_projeto_id
JOIN areas a ON a.area_id = ep.area_id
ORDER BY pr.created_at DESC
LIMIT 10;
```

### Ver tarefas distribuídas pelo Evandro
```sql
SELECT 
    t.task_id,
    e.nome as engenheiro,
    p.codigo_projeto,
    a.descricao as area,
    t.descricao_task,
    t.status_task,
    t.sincronizado,
    t.created_at
FROM evandro_distribuicao_tasks t
JOIN engenheiros e ON e.eng_id = t.eng_id
JOIN projetos p ON p.projeto_id = t.projeto_id
JOIN areas a ON a.area_id = t.area_id
ORDER BY t.created_at DESC
LIMIT 10;
```

### Ver notificações pendentes
```sql
SELECT 
    n.notificacao_id,
    e.nome as engenheiro,
    n.telefone,
    n.tipo,
    n.titulo,
    n.enviada,
    n.tentativas,
    n.created_at
FROM notificacoes_whatsapp n
JOIN engenheiros e ON e.eng_id = n.eng_id
ORDER BY n.created_at DESC
LIMIT 10;
```

## 🔄 Resetar Completamente (Incluindo Seeds)

**⚠️ CUIDADO: Isso deleta TUDO, incluindo engenheiros e áreas!**

```sql
-- Delete TUDO (use com cuidado!)
TRUNCATE TABLE 
    notificacoes_whatsapp,
    chatbot_logs,
    retrabalho_projetos,
    projetos_previsao,
    prazos,
    evandro_distribuicao_tasks,
    engenheiros_projetos,
    projetos,
    engenheiros,
    areas,
    status_codes,
    complexidade_tarefas,
    tipos_projeto,
    dono_empresa
RESTART IDENTITY CASCADE;

-- Depois, executar os seeds novamente:
-- 1. MASTER_SCHEMA_COMPLETO.sql
-- 2. seed_areas_completo.sql
-- 3. seed_status_detalhado.sql
-- 4. adicionar_telefone_auth.sql
-- 5. chatbot_functions.sql
-- 6. functions_dono.sql
-- 7. triggers_e_views.sql
-- 8. sync_datas_prazos.sql
-- 9. sync_status_previsao.sql
-- 10. auto_conclusao_projeto.sql
-- 11. REMOVER_BLOQUEIO_EDICAO.sql (IMPORTANTE!)
```

## 💡 Dicas

1. **Antes de cada teste:** Execute `LIMPAR_DADOS_TESTE.sql`
2. **Para testes rápidos:** Use `CRIAR_PROJETO_TESTE.sql` para ter projetos prontos
3. **Verificar dados:** Use as queries de verificação após cada teste
4. **Limpar sessão do bot:** Reinicie o terminal entre testes para limpar cache

## 🐛 Solução de Problemas

### "Nenhum projeto encontrado"
```sql
-- Execute:
\i supabase/CRIAR_PROJETO_TESTE.sql
```

### "Nenhum engenheiro encontrado"
```sql
-- Verificar engenheiros:
SELECT * FROM engenheiros WHERE ativo = true;

-- Se vazio, execute os seeds novamente
```

### "Erro de foreign key"
```sql
-- Execute a limpeza na ordem correta:
\i supabase/LIMPAR_DADOS_TESTE.sql
```

## 📁 Arquivos Criados

- `supabase/LIMPAR_DADOS_TESTE.sql` - Limpa dados de teste mantendo seeds
- `supabase/CRIAR_PROJETO_TESTE.sql` - Cria 5 projetos para teste rápido
- `COMO_LIMPAR_E_TESTAR.md` - Este arquivo

---

**Pronto para testar!** 🚀

