# 📋 Sistema de Áreas e Complexidade

## Visão Geral

O sistema utiliza **códigos de área** que automaticamente preenchem:
1. ✅ **Descrição completa** do tipo de projeto
2. ✅ **Dias de trabalho** estimados (calculado via trigger)

---

## 🏗️ Categorias de Áreas (22 áreas)

### 🔵 H - Hidráulico (6 áreas)

| Código | Descrição | Dias |
|--------|-----------|------|
| **H1** | CASA PADRÃO: TÉRREO E PAV. SUPERIOR | 4 |
| **H2** | CASA PADRÃO (MODELO ÉDREI): TÉRREO E PAV. SUPERIOR | 4 |
| **H3** | CASA PADRÃO: TÉRREO E PAV. SUPERIOR: 1° PAV, PAV TIPO, COBERTURA, COBERTA, RESERVATÓRIOS | 13 |
| **H4** | PRÉDIO PADRÃO: SUBSOLO, TÉRREO, 1°PAV, PAV TIPO, COBERTURA, COBERTA, RESERVATÓRIOS | 17 |
| **H5** | PRÉDIO PADRÃO: SUBSOLO, TÉRREO, MEZANINO, 1°PAV, PAV TIPO, COBERTURA, COBERTA, RESERVATÓRIOS | 19 |
| **H6** | PRÉDIO PADRÃO: SUBSOLO 01, SUBSOLO 02, TÉRREO, MEZANINO, 1°PAV, PAV TIPO, COBERTURA, COBERTA, RESERVATÓRIOS | 21 |

**Complexidade:** De simples (4 dias) a muito complexa (21 dias)

---

### ⚡ E - Elétrico (4 áreas)

| Código | Descrição | Dias |
|--------|-----------|------|
| **E1** | CASA PADRÃO (MODELO SETAI): TÉRREO E PAV. SUPERIOR | 4 |
| **E2** | CASA PADRÃO (MODELO ÉDREI): SUBSOLO E TÉRREO | 15 |
| **E3** | PRÉDIO (MODELO ATLANTIS NEW): SEMISUBSOLO, TÉRREO, 1°PAV, PAV TIPO, COBERTURA, CORTE ESQUEMÁTICO, ENERGISA | 20 |
| **E4** | PRÉDIO (MODELO ALLIANCE ESSENCE): SUBSOLO-03, SUBSOLO-02, SUBSOLO-01, TÉRREO, SOBRESSOLO, PAV. LAZER, PAV TIPO A,B, PAV. TIPO C,D, ROOFTOP, CORTE ESQUEMÁTICO, ENERGISA | 25 |

**Complexidade:** De simples (4 dias) a muito complexa (25 dias)

---

### 📞 T - Telefonia e Dados (4 áreas)

| Código | Descrição | Dias |
|--------|-----------|------|
| **T1** | CASA PADRÃO (MODELO SETAI): TÉRREO E PAV. SUPERIOR | 1 |
| **T2** | CASA PADRÃO (MODELO ÉDREI): SUBSOLO E TÉRREO | 1 |
| **T3** | PRÉDIO (MODELO ATLANTIS NEW): SEMISUBSOLO, TÉRREO, 1°PAV, PAV TIPO, COBERTURA, CORTE ESQUEMÁTICO, ENERGISA | 3 |
| **T4** | PRÉDIO (MODELO ALLIANCE ESSENCE): SUBSOLO-03, SUBSOLO-02, SUBSOLO-01, TÉRREO, SOBRESSOLO, PAV. LAZER, PAV TIPO A,B, PAV. TIPO C,D, ROOFTOP, CORTE ESQUEMÁTICO, ENERGISA | 5 |

**Complexidade:** De muito simples (1 dia) a média (5 dias)

---

### 🔥 G - Gás (4 áreas)

| Código | Descrição | Dias |
|--------|-----------|------|
| **G1** | CASA PADRÃO (MODELO SETAI): TÉRREO E PAV. SUPERIOR | 1 |
| **G2** | CASA PADRÃO (MODELO ÉDREI): SUBSOLO E TÉRREO | 1 |
| **G3** | PRÉDIO (MODELO ATLANTIS NEW): SEMISUBSOLO, TÉRREO, 1°PAV, PAV TIPO, COBERTURA, CORTE ESQUEMÁTICO, ENERGISA | 2 |
| **G4** | PRÉDIO (MODELO ALLIANCE ESSENCE): SUBSOLO-03, SUBSOLO-02, SUBSOLO-01, TÉRREO, SOBRESSOLO, PAV. LAZER, PAV TIPO A,B, PAV. TIPO C,D, ROOFTOP, CORTE ESQUEMÁTICO, ENERGISA | 3 |

**Complexidade:** De muito simples (1 dia) a simples (3 dias)

---

### ❄️ CL - Climatização (4 áreas)

| Código | Descrição | Dias |
|--------|-----------|------|
| **CL1** | CASA PADRÃO (MODELO SETAI): TÉRREO E PAV. SUPERIOR | 1 |
| **CL2** | CASA PADRÃO (MODELO ÉDREI): SUBSOLO E TÉRREO | 1 |
| **CL3** | PRÉDIO (MODELO ATLANTIS NEW): SEMISUBSOLO, TÉRREO, 1°PAV, PAV TIPO, COBERTURA, CORTE ESQUEMÁTICO, ENERGISA | 2 |
| **CL4** | PRÉDIO (MODELO ALLIANCE ESSENCE): SUBSOLO-03, SUBSOLO-02, SUBSOLO-01, TÉRREO, SOBRESSOLO, PAV. LAZER, PAV TIPO A,B, PAV. TIPO C,D, ROOFTOP, CORTE ESQUEMÁTICO, ENERGISA | 3 |

**Complexidade:** De muito simples (1 dia) a simples (3 dias)

---

## 🔄 Como Funciona a Automação

### 1. Engenheiro Atribui Área

```
👤 Engenheiro: "Quero trabalhar na área H4 do projeto PRJ-001"

🤖 Chatbot:
   1. Identifica código: H4
   2. Chama: atribuir_area_projeto(..., area_codigo := 'H4')
   
📊 Function PostgreSQL:
   SELECT area_id, descricao, tempo_trabalho_dias
   FROM areas
   WHERE codigo = 'H4'
   
   Retorna:
   • area_id = X
   • descricao = "H - PRÉDIO PADRÃO: SUBSOLO, TÉRREO..."
   • tempo_trabalho_dias = 17
   
🔄 TRIGGER: trg_calcular_tempo_trabalho
   INSERT INTO engenheiros_projetos
   • area_id = X
   • tempo_trabalho_dias = 17 ← PREENCHIDO AUTOMATICAMENTE!
   • descricao vem via JOIN com tabela areas
```

### 2. Resultado

```
✅ Área H4 atribuída!

📋 Detalhes AUTOMÁTICOS:
• Descrição: "H - PRÉDIO PADRÃO: SUBSOLO, TÉRREO, 1°PAV..."
• Tempo de trabalho: 17 dias
• Complexidade: Alta (baseado nos dias)
```

---

## 📊 Estatísticas das Áreas

### Por Categoria

| Categoria | Total | Dias Mín | Dias Máx | Média |
|-----------|-------|----------|----------|-------|
| **H** - Hidráulico | 6 | 4 | 21 | 13.0 |
| **E** - Elétrico | 4 | 4 | 25 | 16.0 |
| **T** - Telefonia | 4 | 1 | 5 | 2.5 |
| **G** - Gás | 4 | 1 | 3 | 1.75 |
| **CL** - Climatização | 4 | 1 | 3 | 1.75 |

**Total:** 22 áreas cadastradas

---

## 🎯 Classificação por Complexidade

### Muito Simples (1 dia)
- T1, T2, G1, G2, CL1, CL2

### Simples (2-5 dias)
- H1, H2, E1, T3, T4, G3, G4, CL3, CL4

### Média (13-15 dias)
- H3, E2

### Complexa (17-21 dias)
- H4, H5, H6, E3

### Muito Complexa (25+ dias)
- E4

---

## 💬 Exemplos de Uso via Chatbot

### Exemplo 1: Casa Simples - Hidráulico

```
👤 "Atribuir área H1 do PRJ-2025-001"

🤖 Processando...

✅ Área atribuída!
📋 Tipo: CASA PADRÃO: TÉRREO E PAV. SUPERIOR
⏱️ Tempo: 4 dias (automático)
📊 Complexidade: Simples
```

### Exemplo 2: Prédio Complexo - Elétrico

```
👤 "Pegar área E4 do projeto ABC"

🤖 Processando...

✅ Área atribuída!
📋 Tipo: PRÉDIO (MODELO ALLIANCE ESSENCE): SUBSOLO-03, SUBSOLO-02, SUBSOLO-01...
⏱️ Tempo: 25 dias (automático)
📊 Complexidade: Muito Alta
⚠️ Esta é uma área complexa. Verifique sua carga atual.
```

### Exemplo 3: Múltiplas Áreas

```
👤 "Quero H3 e T3 do PRJ-2025-005"

🤖 Atribuindo 2 áreas...

✅ H3 atribuída!
📋 Hidráulico - Casa Padrão (completa)
⏱️ 13 dias

✅ T3 atribuída!
📋 Telefonia - Prédio Atlantis
⏱️ 3 dias

📊 Total: 16 dias de trabalho estimado
```

---

## 🔍 Consultas Úteis

### Ver todas as áreas disponíveis

```sql
SELECT codigo, descricao, tempo_trabalho_dias 
FROM areas 
ORDER BY codigo;
```

### Áreas por complexidade

```sql
SELECT 
    CASE 
        WHEN tempo_trabalho_dias <= 1 THEN 'Muito Simples'
        WHEN tempo_trabalho_dias <= 5 THEN 'Simples'
        WHEN tempo_trabalho_dias <= 15 THEN 'Média'
        WHEN tempo_trabalho_dias <= 22 THEN 'Complexa'
        ELSE 'Muito Complexa'
    END AS complexidade,
    codigo,
    tempo_trabalho_dias
FROM areas
ORDER BY tempo_trabalho_dias;
```

### Áreas mais usadas

```sql
SELECT 
    a.codigo,
    a.descricao,
    COUNT(ep.id) AS total_usos,
    AVG(ep.percentual_andamento) AS media_execucao
FROM areas a
LEFT JOIN engenheiros_projetos ep ON ep.area_id = a.area_id
GROUP BY a.codigo, a.descricao
ORDER BY total_usos DESC
LIMIT 10;
```

### Tempo médio real vs estimado

```sql
SELECT 
    a.codigo,
    a.tempo_trabalho_dias AS tempo_estimado,
    ROUND(AVG(EXTRACT(DAY FROM (ep.data_conclusao - ep.data_inicio)))) AS tempo_real_medio,
    ROUND(AVG(EXTRACT(DAY FROM (ep.data_conclusao - ep.data_inicio)))) - a.tempo_trabalho_dias AS diferenca
FROM areas a
JOIN engenheiros_projetos ep ON ep.area_id = a.area_id
WHERE ep.data_conclusao IS NOT NULL
GROUP BY a.codigo, a.tempo_trabalho_dias
ORDER BY diferenca DESC;
```

---

## ⚙️ Implementação

### Passo 1: Executar Seed

```bash
# Via Supabase SQL Editor
# Cole o conteúdo de: seed_areas_completo.sql
```

### Passo 2: Verificar

```sql
-- Deve retornar 22 áreas
SELECT COUNT(*) FROM areas;

-- Verificar por categoria
SELECT 
    SUBSTRING(codigo FROM '^[A-Z]+') AS categoria,
    COUNT(*) AS total
FROM areas
GROUP BY SUBSTRING(codigo FROM '^[A-Z]+');
```

### Passo 3: Testar Trigger

```sql
-- Atribuir área H4
SELECT atribuir_area_projeto(
    p_eng_id := 'uuid-engenheiro',
    p_projeto_id := 'uuid-projeto',
    p_area_codigo := 'H4'
);

-- Verificar se tempo foi preenchido automaticamente
SELECT tempo_trabalho_dias 
FROM engenheiros_projetos 
WHERE eng_id = 'uuid-engenheiro';

-- Deve retornar: 17 ✅
```

---

## 📈 Recomendações por Área

### Dono Consulta antes de Distribuir

```
👔 Dono: "Quem tem capacidade para área E4?"

🤖 Analisando...

💡 Recomendações para E4 (25 dias):

1️⃣ Ana Santos
   • Carga atual: 12 dias
   • Nova carga: 37 dias (aceitável)
   • Taxa de execução: 85%
   • Recomendação: ✅ ADEQUADA

2️⃣ João Silva
   • Carga atual: 22 dias
   • Nova carga: 47 dias (alta!)
   • Taxa de execução: 90%
   • Recomendação: ⚠️ SOBRECARREGADO

3️⃣ Maria Costa
   • Carga atual: 8 dias
   • Nova carga: 33 dias (aceitável)
   • Taxa de execução: 75%
   • Recomendação: ✅ BOA OPÇÃO

💡 Melhor escolha: Maria Costa (menor carga atual)
```

---

## 🎨 Layout Visual (Futuro)

### Cards por Categoria

```
┌─────────────────────────┐
│    🔵 HIDRÁULICO        │
│    6 áreas              │
│    4-21 dias            │
│    [Ver detalhes]       │
└─────────────────────────┘

┌─────────────────────────┐
│    ⚡ ELÉTRICO          │
│    4 áreas              │
│    4-25 dias            │
│    [Ver detalhes]       │
└─────────────────────────┘
```

### Gráfico de Distribuição

```
Áreas mais usadas:
H4 ████████████ 45%
E2 ████████ 30%
T3 █████ 15%
G2 ██ 10%
```

---

## ✅ Checklist

- [x] 22 áreas cadastradas
- [x] Seed SQL criado
- [x] Documentação completa
- [x] Trigger funcionando
- [x] Descrições automáticas
- [x] Dias automáticos
- [ ] Testado no Supabase
- [ ] Integrado ao chatbot
- [ ] Layout visual

---

**🎯 Sistema de áreas completo e automatizado!**






