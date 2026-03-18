# 🤖 Integração Chatbot ↔ Banco de Dados

## Visão Geral

O banco de dados foi projetado para ser **alimentado exclusivamente via chatbot** através de prompts em linguagem natural. O chatbot interpreta os prompts e chama as funções PostgreSQL apropriadas.

## 🎯 Fluxo de Interação

```
Usuário (Engenheiro)
    ↓
Prompt em linguagem natural
    ↓
Chatbot/LLM (interpreta intenção)
    ↓
Function PostgreSQL (executa ação)
    ↓
Retorno JSON (feedback ao usuário)
    ↓
Chatbot formata resposta
    ↓
Usuário recebe confirmação
```

## 📝 Functions Disponíveis

### 1. **cadastrar_engenheiro**
Cadastra novo engenheiro no sistema.

**Prompts esperados:**
- "Me cadastre no sistema"
- "Meu nome é João Silva e trabalho exclusivamente aqui"
- "Quero me registrar, sou Ana Santos"
- "Cadastrar engenheiro Carlos Souza, trabalha em outros lugares também"

**Chamada:**
```sql
SELECT cadastrar_engenheiro(
    p_nome := 'João Silva',
    p_exclusivo := true
);
```

**Retorno:**
```json
{
  "sucesso": true,
  "mensagem": "Engenheiro cadastrado com sucesso!",
  "eng_id": "abc-123-xyz",
  "nome": "João Silva",
  "exclusivo": true
}
```

**Resposta do chatbot:**
> "✅ Ótimo, João Silva! Você foi cadastrado com sucesso. Seu ID é `abc-123-xyz`. Como você trabalha exclusivamente aqui, já configurei isso no seu perfil."

---

### 2. **atualizar_engenheiro**
Permite engenheiro editar nome ou exclusividade.

**Prompts esperados:**
- "Quero mudar meu nome para João Pedro Silva"
- "Agora trabalho em outros lugares também"
- "Alterar exclusividade para não"
- "Meu nome está errado, é Ana Carolina"

**Chamada:**
```sql
SELECT atualizar_engenheiro(
    p_eng_id := 'abc-123-xyz',
    p_nome := 'João Pedro Silva',
    p_exclusivo := NULL -- não altera
);
```

**Retorno:**
```json
{
  "sucesso": true,
  "mensagem": "Dados atualizados com sucesso",
  "campos_atualizados": ["nome"]
}
```

---

### 3. **criar_projeto**
Cria novo projeto.

**Prompts esperados:**
- "Criar projeto PRJ-2025-001 para o cliente Construtora ABC"
- "Novo projeto: código PRJ-500, cliente Edifícios XYZ"
- "Cadastrar obra PRJ-123 do cliente João Mendes"

**Chamada:**
```sql
SELECT criar_projeto(
    p_codigo := 'PRJ-2025-001',
    p_cliente := 'Construtora ABC',
    p_descricao := 'Edifício Residencial 20 andares'
);
```

**Retorno:**
```json
{
  "sucesso": true,
  "mensagem": "Projeto criado com sucesso!",
  "projeto_id": "xyz-789",
  "codigo": "PRJ-2025-001",
  "cliente": "Construtora ABC"
}
```

**Resposta do chatbot:**
> "✅ Projeto `PRJ-2025-001` criado! Cliente: Construtora ABC. Agora você pode se atribuir às áreas deste projeto."

---

### 4. **atribuir_area_projeto** ⭐ (Principal)
Atribui engenheiro a uma área específica do projeto.

**Prompts esperados:**
- "Vou trabalhar na parte elétrica do projeto PRJ-001"
- "Me adicione na área hidráulica do PRJ-500, começo dia 15/01"
- "Quero pegar a área de climatização do projeto ABC, previsão para 28/02"
- "Assumir área estrutural do PRJ-2025-001"

**Chamada:**
```sql
SELECT atribuir_area_projeto(
    p_eng_id := 'abc-123-xyz',
    p_projeto_id := 'xyz-789',
    p_area_codigo := 'ELETRICO',
    p_data_inicio := '2025-01-15',
    p_data_prevista := '2025-02-15',
    p_status_codigo := 'AGUARDANDO_INICIO'
);
```

**Retorno:**
```json
{
  "sucesso": true,
  "mensagem": "Área atribuída com sucesso! Tempo e percentual calculados automaticamente.",
  "atribuicao_id": "def-456",
  "tempo_trabalho_dias": 15,
  "percentual_andamento": 0.00
}
```

**Resposta do chatbot:**
> "✅ Perfeito! Você foi adicionado à área **Elétrico** do projeto `PRJ-2025-001`.  
> 📅 Data de início: 15/01/2025  
> ⏱️ Tempo estimado: **15 dias** (calculado automaticamente)  
> 📊 Status: Aguardando Início (0%)  
> 
> Quer adicionar outra área neste mesmo projeto?"

---

### 5. **atualizar_status_projeto**
Atualiza status da área (percentual é calculado automaticamente).

**Prompts esperados:**
- "Mudei o status para em planejamento"
- "Já estou nas instalações de primeira fase"
- "Atualizar para em aprovação"
- "O projeto foi concluído"

**Chamada:**
```sql
SELECT atualizar_status_projeto(
    p_atribuicao_id := 'def-456',
    p_status_codigo := 'INSTALACOES_GROSSO'
);
```

**Retorno:**
```json
{
  "sucesso": true,
  "mensagem": "Status atualizado! Percentual calculado automaticamente.",
  "percentual_andamento": 35.00
}
```

**Resposta do chatbot:**
> "✅ Status atualizado para **Instalações de Primeira Fase**!  
> 📊 Seu progresso agora está em **35%** (calculado automaticamente).  
> 
> Continue assim! 🚀"

---

### 6. **atualizar_previsao**
Atualiza data prevista (atualização diária recomendada).

**Prompts esperados:**
- "Mudar previsão para dia 20/02"
- "Vou terminar dia 28 de fevereiro"
- "Atualizar data prevista para 15/03/2025"
- "Nova previsão: 10/02"

**Chamada:**
```sql
SELECT atualizar_previsao(
    p_atribuicao_id := 'def-456',
    p_nova_data := '2025-02-20'
);
```

**Retorno:**
```json
{
  "sucesso": true,
  "mensagem": "Previsão atualizada com sucesso!",
  "nova_data": "2025-02-20"
}
```

**Resposta do chatbot:**
> "✅ Previsão atualizada para **20/02/2025**. Vou registrar isso no histórico para acompanhamento."

---

### 7. **registrar_retrabalho**
Registra necessidade de retrabalho.

**Prompts esperados:**
- "Preciso refazer por erro no projeto"
- "Retrabalho: cliente pediu alterações"
- "Teve retrabalho porque a documentação estava errada"

**Chamada:**
```sql
SELECT registrar_retrabalho(
    p_atribuicao_id := 'def-456',
    p_motivo := 'Alterações solicitadas pelo cliente',
    p_descricao := 'Cliente solicitou mudança no layout elétrico'
);
```

**Retorno:**
```json
{
  "sucesso": true,
  "mensagem": "Retrabalho registrado",
  "retrabalho_id": "ghi-789"
}
```

**Resposta do chatbot:**
> "✅ Retrabalho registrado. Motivo: _Alterações solicitadas pelo cliente_.  
> Isso será considerado nas métricas. Precisa de ajuda com algo?"

---

### 8. **buscar_meus_projetos**
Lista projetos do engenheiro.

**Prompts esperados:**
- "Quais são meus projetos?"
- "Mostrar minhas obras"
- "O que estou fazendo?"
- "Ver meus trabalhos"

**Chamada:**
```sql
SELECT buscar_meus_projetos('abc-123-xyz');
```

**Retorno:**
```json
[
  {
    "projeto_codigo": "PRJ-2025-001",
    "cliente": "Construtora ABC",
    "area": "Elétrico",
    "data_inicio": "2025-01-15",
    "data_prevista": "2025-02-20",
    "status": "Instalações de Primeira Fase",
    "percentual": 35.00,
    "tempo_trabalho_dias": 15
  },
  {
    "projeto_codigo": "PRJ-2025-001",
    "cliente": "Construtora ABC",
    "area": "Hidráulico",
    "data_inicio": "2025-02-01",
    "data_prevista": "2025-02-28",
    "status": "Em Planejamento",
    "percentual": 5.00,
    "tempo_trabalho_dias": 12
  }
]
```

**Resposta do chatbot:**
> "📋 **Seus projetos ativos:**
> 
> **1. PRJ-2025-001** - Construtora ABC  
> • **Elétrico:** 35% concluído | Previsão: 20/02/2025  
> • **Hidráulico:** 5% concluído | Previsão: 28/02/2025  
> 
> Total: 27 dias de trabalho estimado."

---

### 9. **listar_areas_disponiveis**
Lista áreas disponíveis para atribuição.

**Prompts esperados:**
- "Quais áreas posso escolher?"
- "Listar áreas disponíveis"
- "O que tem de área?"

**Retorno:**
```json
[
  {"codigo": "ELETRICO", "descricao": "Elétrico", "tempo_dias": 15},
  {"codigo": "HIDRAULICO", "descricao": "Hidráulico", "tempo_dias": 12},
  {"codigo": "ESTRUTURAL", "descricao": "Estrutural", "tempo_dias": 20},
  ...
]
```

**Resposta do chatbot:**
> "📦 **Áreas disponíveis:**
> 
> 1. **Elétrico** (15 dias)  
> 2. **Hidráulico** (12 dias)  
> 3. **Estrutural** (20 dias)  
> 4. **Climatização** (10 dias)  
> 5. **Prevenção e Combate a Incêndio** (8 dias)  
> 6. **Gás** (5 dias)  
> 7. **Telefonia e Dados** (7 dias)  
> 8. **SPDA (Para-raios)** (5 dias)  
> 9. **Automação** (10 dias)
> 
> Qual você quer assumir?"

---

## 🔄 Cenários Completos

### Cenário 1: Engenheiro novo no sistema

**Conversa:**

> **Usuário:** "Oi, meu nome é João Silva e trabalho só aqui na empresa"

> **Chatbot:** Chama `cadastrar_engenheiro('João Silva', true)`

> **Chatbot:** "✅ Bem-vindo, João Silva! Você foi cadastrado. Seu ID é `abc-123`. Quer cadastrar um projeto ou ver áreas disponíveis?"

---

### Cenário 2: Atribuir múltiplas áreas

> **Usuário:** "Quero trabalhar no projeto PRJ-001 nas áreas elétrica e hidráulica"

> **Chatbot:** 
> 1. Chama `atribuir_area_projeto(..., 'ELETRICO', ...)`
> 2. Chama `atribuir_area_projeto(..., 'HIDRAULICO', ...)`

> **Chatbot:** "✅ Você foi adicionado a 2 áreas do PRJ-001:  
> • **Elétrico:** 15 dias (0%)  
> • **Hidráulico:** 12 dias (0%)  
> Total: 27 dias de trabalho estimado.  
> Quando você começa?"

---

### Cenário 3: Atualização diária

> **Usuário:** "Bom dia! Mudei o status do elétrico para instalações e a nova previsão é 25/02"

> **Chatbot:**
> 1. Chama `atualizar_status_projeto(..., 'INSTALACOES_GROSSO')`
> 2. Chama `atualizar_previsao(..., '2025-02-25')`

> **Chatbot:** "☀️ Bom dia! Atualizações registradas:  
> ✅ Status: **Instalações de Primeira Fase** (35%)  
> ✅ Nova previsão: **25/02/2025**  
> Continue assim! 💪"

---

## 📊 Log de Interações

Todas as interações são registradas na tabela `chatbot_logs`:

```sql
SELECT 
    prompt_original,
    acao_executada,
    sucesso,
    mensagem_retorno,
    created_at
FROM chatbot_logs
WHERE eng_id = 'abc-123-xyz'
ORDER BY created_at DESC
LIMIT 10;
```

**Exemplo:**
| Prompt | Ação | Sucesso | Mensagem | Data |
|--------|------|---------|----------|------|
| "Mudei status para instalações" | atualizar_status_projeto | ✅ | Status atualizado (35%) | 05/12 10:30 |
| "Quais meus projetos?" | buscar_meus_projetos | ✅ | 2 projetos retornados | 05/12 09:15 |

---

## 🛡️ Validações Automáticas

As functions incluem validações:

✅ **Duplicidade:** Não permite atribuir mesma área duas vezes  
✅ **Existência:** Verifica se engenheiro/projeto/área existem  
✅ **Campos obrigatórios:** Nome, código, área não podem ser vazios  
✅ **Formatos:** Códigos são convertidos para maiúsculas automaticamente  

**Exemplo de erro:**
```json
{
  "sucesso": false,
  "mensagem": "Engenheiro já está atribuído a esta área neste projeto"
}
```

**Chatbot responde:**
> "⚠️ Você já está trabalhando nessa área deste projeto. Quer atualizar o status ou adicionar outra área?"

---

## 🚀 Próximos Passos

1. **Edge Functions** (Supabase) para expor APIs REST
2. **Webhooks** para notificações
3. **RLS (Row Level Security)** para segurança
4. **Integração com Google Sheets** para visualização
5. **Dashboard em tempo real** (Grafana/Metabase)

---

## 💡 Dicas para o Chatbot/LLM

### Como interpretar prompts:

**Cadastro:**
- "me cadastre" → `cadastrar_engenheiro`
- "registrar", "criar conta" → `cadastrar_engenheiro`

**Atribuição:**
- "trabalhar em", "pegar área", "assumir" → `atribuir_area_projeto`
- "adicionar área", "me bota em" → `atribuir_area_projeto`

**Atualização de status:**
- "mudei status", "agora estou em" → `atualizar_status_projeto`
- "atualizar para", "avançar para" → `atualizar_status_projeto`

**Atualização de previsão:**
- "nova previsão", "vou terminar dia" → `atualizar_previsao`
- "mudar data", "previsão para" → `atualizar_previsao`

**Consultas:**
- "meus projetos", "o que estou fazendo" → `buscar_meus_projetos`
- "mostrar", "ver minhas obras" → `buscar_meus_projetos`

### Extração de entidades:

**Datas:**
- "dia 15" → inferir mês/ano atual
- "15/02" → inferir ano atual
- "amanhã" → CURRENT_DATE + 1

**Áreas:**
- "elétrica" → ELETRICO
- "hidráulica", "hidro" → HIDRAULICO
- "estrutura" → ESTRUTURAL

**Status:**
- "planejamento" → EM_PLANEJAMENTO
- "instalações" → INSTALACOES_GROSSO (ou perguntar qual fase)
- "concluído", "terminei" → CONCLUIDO
