# 🔧 FIX: "undefined dias" na lista de áreas

## 🐛 Problema

Ao distribuir um projeto, o dono vê:
```
📦 *Escolha a Área:*

1️⃣ Automação (undefined dias)
2️⃣ Canteiro de Obra BRT (undefined dias)
3️⃣ Elétrico (undefined dias)
...
```

## 📋 Causa

**Incompatibilidade de nomes de campos:**

### Função SQL (`listar_areas_disponiveis`):
```sql
json_build_object(
    'codigo', codigo,
    'descricao', descricao,
    'tempo_dias', tempo_trabalho_dias  -- ❌ Nome errado
)
```

### Código TypeScript (`ownerFlow.ts`):
```typescript
msg += `${idx + 1}️⃣ ${area.descricao} (${area.tempo_trabalho_dias} dias)\n`;
                                          // ↑ Tentando acessar campo que não existe
```

**Resultado:** `area.tempo_trabalho_dias` é `undefined`

## ✅ Solução

Corrigir a função SQL para retornar o nome correto do campo:

### Antes:
```sql
'tempo_dias', tempo_trabalho_dias  -- ❌
```

### Depois:
```sql
'tempo_trabalho_dias', tempo_trabalho_dias  -- ✅
```

## 🚀 Como Aplicar

### No Supabase SQL Editor:

Cole e execute:
```
supabase/FIX_LISTAR_AREAS.sql
```

## 📊 Resultado Esperado

Depois de aplicar o fix:

```
📦 *Escolha a Área:*

1️⃣ Automação (5 dias)
2️⃣ Canteiro de Obra BRT (10 dias)
3️⃣ Elétrico (7 dias)
4️⃣ Hidráulico (8 dias)
...
```

## 🧪 Como Testar

### 1. Aplicar o fix no Supabase

```sql
-- Cole o conteúdo de FIX_LISTAR_AREAS.sql
```

### 2. Testar no terminal

```bash
npm run test:bot-completo
# Número: +5583988990772 (dono)

menu > 2 (Distribuir) > 1 (engenheiro) > 1 (projeto)
```

### 3. Verificar a saída

Deve mostrar:
- ✅ Nome da área
- ✅ Número de dias (ex: "5 dias", "10 dias")
- ❌ NÃO deve mostrar "undefined dias"

### 4. Verificar no Supabase (Opcional)

```sql
-- Ver a função retornando corretamente
SELECT listar_areas_disponiveis();

-- Ver os dados direto da tabela
SELECT 
    area_id,
    codigo,
    descricao,
    tempo_trabalho_dias
FROM areas
WHERE ativo = true
ORDER BY descricao;
```

## 🔍 Detalhes Técnicos

### Estrutura da Tabela `areas`:

```sql
CREATE TABLE areas (
    area_id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE,
    descricao VARCHAR(255),
    tempo_trabalho_dias INTEGER,  -- Este campo
    ativo BOOLEAN DEFAULT true
);
```

### Função SQL Corrigida:

```sql
CREATE OR REPLACE FUNCTION listar_areas_disponiveis()
RETURNS JSON AS $$
BEGIN
    SELECT json_agg(
        json_build_object(
            'area_id', area_id,
            'codigo', codigo,
            'descricao', descricao,
            'tempo_trabalho_dias', tempo_trabalho_dias  -- ✅ Nome correto
        ) ORDER BY descricao
    ) INTO v_result
    FROM areas
    WHERE ativo = true;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

### Código TypeScript (sem alterações necessárias):

```typescript
resultado.forEach((area: any, idx: number) => {
  msg += `${idx + 1}️⃣ ${area.descricao} (${area.tempo_trabalho_dias} dias)\n`;
});
```

## 💡 Bônus: Também adicionei `area_id`

A função agora também retorna `area_id`, que pode ser útil para referências futuras.

## ⚠️ Impacto

- ✅ **Baixo risco**: Apenas adiciona/corrige campos no JSON retornado
- ✅ **Retrocompatível**: Não quebra código existente
- ✅ **Resolve bug visual**: Informação de dias agora aparece corretamente

---

**Status:** ✅ Fix pronto para aplicar
**Prioridade:** Média (bug visual, não bloqueia funcionalidade)
**Arquivo:** `supabase/FIX_LISTAR_AREAS.sql`

