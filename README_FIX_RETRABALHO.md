# 🔧 FIX: Retrabalho não está salvando

## 🐛 Problema

Quando o engenheiro tenta registrar a notificação noturna, aparece:
```
❌ Erro ao registrar retrabalho: Já existe um registro de retrabalho para hoje
```

E nada é salvo no banco de dados.

## 📋 Causa

A função SQL `registrar_retrabalho_dia` só faz **INSERT** e bloqueia se já existe um registro para hoje.

### Cenário que causa erro:
1. Engenheiro faz notificação noturna às 18h → INSERT ✅
2. Engenheiro esqueceu algo e refaz às 19h → ERRO ❌ (bloqueia!)

## ✅ Solução

Transformar a função para fazer **UPSERT** (INSERT ou UPDATE):
- Se não existe registro hoje → **INSERT**
- Se já existe registro hoje → **UPDATE**

## 🚀 Como Aplicar

### No Supabase SQL Editor:

Cole e execute o conteúdo de:
```
supabase/FIX_RETRABALHO_UPSERT.sql
```

Este script:
1. ✅ Substitui a função `registrar_retrabalho_dia` com lógica de UPSERT
2. ✅ Testa automaticamente com 2 registros no mesmo dia
3. ✅ Mostra os resultados

## 📊 Comportamento Antes vs Depois

### Antes (com erro):
```
Tentativa 1: INSERT → ✅ Sucesso
Tentativa 2: INSERT → ❌ ERRO "Já existe registro"
```

### Depois (com UPSERT):
```
Tentativa 1: INSERT → ✅ "Registro criado"
Tentativa 2: UPDATE → ✅ "Registro atualizado"
```

## 🧪 Como Testar

### 1. Aplicar o fix no Supabase

```sql
-- Cole o conteúdo de FIX_RETRABALHO_UPSERT.sql
```

### 2. Limpar dados de teste de hoje

```sql
-- Opcional: limpar registros de hoje para testar do zero
DELETE FROM retrabalho_projetos WHERE data_retrabalho = CURRENT_DATE;
```

### 3. Testar no terminal

```bash
npm run test:bot-completo
# Número: +5583996634741

# Primeira notificação
menu > 2 > 1 > 1 > "Feito 1" > 1 (com retrabalho) > 1 (motivo) > 2

# Segunda notificação (mesmo projeto, mesmo dia)
menu > 2 > 1 > 1 > "Feito 2" > 2 (sem retrabalho) > 2
```

**Resultado esperado:**
- ✅ Primeira: "Registro criado"
- ✅ Segunda: "Registro atualizado" (SEM ERRO!)

### 4. Verificar no Supabase

```sql
-- Ver registros de hoje
SELECT 
    data_retrabalho,
    necessitou_retrabalho,
    motivo_retrabalho,
    created_at,
    updated_at
FROM retrabalho_projetos
WHERE data_retrabalho = CURRENT_DATE;
```

**O que esperar:**
- Apenas 1 registro por projeto por dia
- `updated_at` diferente de `created_at` (foi atualizado)
- `necessitou_retrabalho = false` (última atualização)

## 💡 Vantagens do UPSERT

1. ✅ **Flexibilidade**: Engenheiro pode corrigir/atualizar
2. ✅ **Sem erros**: Não bloqueia múltiplas tentativas
3. ✅ **Dados corretos**: Sempre usa a última informação
4. ✅ **UX melhor**: Não frustra o usuário

## 🔍 Detalhes Técnicos

### Lógica Implementada

```sql
-- Verifica se existe
SELECT EXISTS (...) INTO v_existe_hoje;

IF v_existe_hoje THEN
    -- Atualiza registro existente
    UPDATE retrabalho_projetos
    SET necessitou_retrabalho = p_necessitou_retrabalho,
        motivo_retrabalho = p_motivo_retrabalho,
        ...
    WHERE eng_projeto_id = p_atribuicao_id 
    AND data_retrabalho = CURRENT_DATE;
ELSE
    -- Insere novo registro
    INSERT INTO retrabalho_projetos (...) VALUES (...);
END IF;
```

### Constraint Mantida

A constraint `UNIQUE(eng_projeto_id, data_retrabalho)` permanece:
- Garante apenas 1 registro por projeto por dia
- UPSERT respeita a constraint (UPDATE não cria duplicata)

## 📌 Observações

1. **Histórico**: `updated_at` registra quando foi a última atualização
2. **Auditoria**: `created_at` mostra quando foi criado originalmente
3. **Taxa de retrabalho**: Calculada pela view continua funcionando
4. **Compatibilidade**: Mudança 100% retrocompatível

---

**Status:** ✅ Fix pronto para aplicar
**Impacto:** Resolve erro que impedia salvar retrabalhos
**Urgência:** Alta (bloqueador de funcionalidade)

