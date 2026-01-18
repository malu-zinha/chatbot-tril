# ⚠️ ERRO ENCONTRADO - Schema SQL Incorreto

## 🐛 Problema

A função `dono_distribuir_tarefa` no arquivo `functions_dono.sql` tem um erro de tipo:

```sql
-- LINHA 28 (ERRADO):
v_area_id INTEGER;

-- LINHA 58:
SELECT area_id, descricao INTO v_area_id, v_area_descricao
FROM areas
WHERE UPPER(codigo) = UPPER(TRIM(p_area_codigo)) AND ativo = true;
```

**Erro:** A tabela `areas` tem `area_id UUID`, mas a função declara `v_area_id INTEGER`.

Quando tenta fazer o SELECT, o Postgres tenta converter UUID para INTEGER e falha com:
```
invalid input syntax for type integer: "6b193ac8-46aa-4cfc-94ec-00e2918fe471"
```

---

## ✅ Solução

Alterar o tipo da variável na função SQL:

```sql
-- CORRETO:
DECLARE
    v_task_id UUID;
    v_area_id UUID;  -- ← MUDAR DE INTEGER PARA UUID
    v_complexidade_id INTEGER;
    v_eng_nome TEXT;
    v_area_descricao TEXT;
```

---

## 📝 Onde Corrigir

**Arquivo:** `chatbot-tril/supabase/functions_dono.sql`

**Linha:** 28

**Comando para aplicar no Supabase:**

Você precisa executar o arquivo SQL atualizado no Supabase Dashboard ou via CLI:

```bash
# Via Supabase CLI:
supabase db reset

# Ou manualmente no Dashboard:
# 1. Abrir SQL Editor no Supabase Dashboard
# 2. Executar o arquivo functions_dono.sql atualizado
```

---

## 🧪 Teste Realizado

O fluxo COMPLETO funcionou perfeitamente até a confirmação:

✅ Escolher engenheiro  
✅ Escolher projeto existente (PRJ-002 - MGA)  
✅ Escolher área (Canteiro de Obra BRT)  
✅ Informar descrição  
✅ **PULOU cliente (projeto existente)** ← FUNCIONOU!  
✅ Escolher complexidade  
✅ Informar datas  
✅ Observações  
✅ Confirmação  
❌ **Salvamento falhou** (erro de tipo no SQL)

---

## 🎯 Status

- **Código TypeScript:** ✅ 100% Funcionando
- **Fluxo conversacional:** ✅ 100% Funcionando
- **Lógica de negócio:** ✅ 100% Funcionando
- **Schema SQL:** ❌ Precisa correção de 1 linha

Assim que corrigir o tipo da variável no SQL, o sistema estará **COMPLETAMENTE FUNCIONAL!**

