# 🔄 Correção da Taxa de Retrabalho

## 🐛 Problema Identificado

A taxa de retrabalho estava sempre mostrando **100%** mesmo quando o engenheiro registrava dias sem retrabalho.

### Causa Raiz

A tabela `retrabalho_projetos` só recebia registros quando havia retrabalho (`necessitou_retrabalho = true`). Dias sem retrabalho não eram registrados.

**Exemplo:**
- Dia 1: COM retrabalho → Registrado ✅
- Dia 2: SEM retrabalho → NÃO registrado ❌
- Resultado: 1/1 = **100%** (incorreto!)

### Cálculo da Taxa (View SQL)

```sql
-- vw_quantidade_retrabalhos
ROUND(
  (COUNT(*) FILTER (WHERE necessitou_retrabalho = true)::NUMERIC / 
   NULLIF(COUNT(*), 0)::NUMERIC) * 100, 
  2
) AS percentual_retrabalhos
```

**O problema:** `COUNT(*)` só conta registros existentes. Se não registrar dias sem retrabalho, o denominador fica errado.

## ✅ Solução Implementada

### Arquivo Modificado

**`chatbot/flows/engineerProjectFlow.ts`**

Método: `stepRetrabalhoPergunta()`

### O Que Mudou

**Antes:**
```typescript
} else if (resposta === '2') {
  // Não teve retrabalho
  this.state.teveRetrabalho = false;
  this.state.step = 'observacoes_pergunta';
  // ❌ NÃO registrava nada
  
  return { mensagem: `✅ Sem retrabalho!...`, finalizado: false };
}
```

**Depois:**
```typescript
} else if (resposta === '2') {
  // Não teve retrabalho
  this.state.teveRetrabalho = false;
  
  // ✅ AGORA REGISTRA com necessitou_retrabalho = false
  await this.supabase.registrarRetrabalho(
    this.state.selectedAtribuicaoId!,
    false, // sem retrabalho
    null   // sem motivo
  );
  
  this.state.step = 'observacoes_pergunta';
  
  return { mensagem: `✅ Sem retrabalho!...`, finalizado: false };
}
```

## 📊 Comportamento Correto

### Exemplo de Uso

**Cenário: 4 dias de trabalho**
- Dia 1: SEM retrabalho → `INSERT (necessitou_retrabalho = false, motivo = null)`
- Dia 2: COM retrabalho → `INSERT (necessitou_retrabalho = true, motivo = 'Erro de dimensionamento')`
- Dia 3: SEM retrabalho → `INSERT (necessitou_retrabalho = false, motivo = null)`
- Dia 4: SEM retrabalho → `INSERT (necessitou_retrabalho = false, motivo = null)`

**Cálculo da Taxa:**
```
quantidade_retrabalhos = 1 (apenas Dia 2)
total_dias_registrados = 4
taxa = (1 / 4) * 100 = 25% ✅
```

### Verificar no Supabase

```sql
-- Ver registros de retrabalho
SELECT 
    r.data_retrabalho,
    r.necessitou_retrabalho,
    r.motivo_retrabalho,
    p.codigo_projeto,
    e.nome as engenheiro
FROM retrabalho_projetos r
JOIN projetos p ON p.projeto_id = r.projeto_id
JOIN engenheiros e ON e.eng_id = r.eng_id
WHERE r.eng_projeto_id = 'seu_id_atribuicao'
ORDER BY r.data_retrabalho DESC;

-- Ver taxa calculada
SELECT 
    eng_projeto_id,
    quantidade_retrabalhos,
    total_dias_registrados,
    percentual_retrabalhos
FROM vw_quantidade_retrabalhos
WHERE eng_projeto_id = 'seu_id_atribuicao';
```

## 🧪 Como Testar

### 1. Limpar Dados Antigos (Opcional)

Se você quer recalcular do zero:

```sql
-- Limpar registros antigos de retrabalho
DELETE FROM retrabalho_projetos 
WHERE eng_projeto_id = 'id_do_projeto';
```

### 2. Fazer Notificações Noturnas

**Teste com 4 dias:**

```bash
npm run test:bot-completo
# Número: +5583996634741

# Dia 1
menu > 2 > 1 > 1 > "Trabalho dia 1" > 2 (Não) > 2 (Sem obs)

# Dia 2  
menu > 2 > 1 > 1 > "Trabalho dia 2" > 1 (Sim) > 1 (Erro dimensionamento) > 2 (Sem obs)

# Dia 3
menu > 2 > 1 > 1 > "Trabalho dia 3" > 2 (Não) > 2 (Sem obs)

# Dia 4
menu > 2 > 1 > 1 > "Trabalho dia 4" > 2 (Não) > 2 (Sem obs)
```

### 3. Visualizar como Dono

```bash
npm run test:bot-completo
# Número: +5583988990772

menu > 1 > a > 1 > 1
```

**Resultado Esperado:**
```
🔄 *Retrabalhos:* 1
📊 *Taxa:* 25%
```

## 📈 Vantagens da Correção

1. ✅ **Taxa realista**: Reflete a realidade do trabalho
2. ✅ **Histórico completo**: Todos os dias são registrados
3. ✅ **Métricas confiáveis**: Dono pode confiar nos números
4. ✅ **Análise precisa**: Identifica padrões de retrabalho

## 🎯 Casos de Uso

### Caso 1: Projeto sem retrabalhos
- 10 dias registrados
- 0 retrabalhos
- Taxa: **0%** ✅

### Caso 2: Projeto com muito retrabalho
- 10 dias registrados
- 8 retrabalhos
- Taxa: **80%** ⚠️ (alerta!)

### Caso 3: Projeto normal
- 20 dias registrados
- 2 retrabalhos
- Taxa: **10%** ✅ (aceitável)

## 🔍 Monitoramento

### Query para Dashboard do Dono

```sql
-- Taxa de retrabalho por projeto
SELECT 
    p.codigo_projeto,
    a.descricao as area,
    e.nome as engenheiro,
    vr.quantidade_retrabalhos,
    vr.total_dias_registrados,
    vr.percentual_retrabalhos
FROM vw_quantidade_retrabalhos vr
JOIN engenheiros_projetos ep ON ep.id = vr.eng_projeto_id
JOIN projetos p ON p.projeto_id = ep.projeto_id
JOIN areas a ON a.area_id = ep.area_id
JOIN engenheiros e ON e.eng_id = ep.eng_id
WHERE ep.ativo = true
ORDER BY vr.percentual_retrabalhos DESC;
```

### Query para Identificar Problemas

```sql
-- Projetos com taxa de retrabalho > 30%
SELECT 
    p.codigo_projeto,
    e.nome as engenheiro,
    vr.percentual_retrabalhos,
    vr.quantidade_retrabalhos,
    vr.total_dias_registrados
FROM vw_quantidade_retrabalhos vr
JOIN engenheiros_projetos ep ON ep.id = vr.eng_projeto_id
JOIN projetos p ON p.projeto_id = ep.projeto_id
JOIN engenheiros e ON e.eng_id = ep.eng_id
WHERE vr.percentual_retrabalhos > 30
AND ep.ativo = true
ORDER BY vr.percentual_retrabalhos DESC;
```

## 📝 Observações Importantes

1. **Registros Diários**: Cada notificação noturna deve criar um registro em `retrabalho_projetos`
2. **Constraint Única**: `UNIQUE(eng_projeto_id, data_retrabalho)` impede duplicatas no mesmo dia
3. **Histórico Permanente**: Registros não são apagados, mantendo histórico completo
4. **Cálculo Automático**: A view `vw_quantidade_retrabalhos` atualiza automaticamente

---

**Status:** ✅ Correção aplicada
**Data:** 19/01/2026
**Impacto:** Melhora significativa na precisão das métricas de retrabalho

