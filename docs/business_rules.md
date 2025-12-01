# 📐 Regras de Negócio - Chatbot Tril Consult

## 1. Execução Diária

### 1.1 Registro de Percentual

- **Percentual Realizado**: 0-100%
  - Representa o quanto foi executado no dia
  - Exemplo: 10% significa 10% do projeto total foi executado hoje

- **Percentual Previsto**: 0-100% (opcional)
  - O que estava planejado executar no dia
  - Usado para análise de desvios

- **Percentual Acumulado**: Calculado automaticamente
  - Soma de todos os percentuais realizados até a data
  - Máximo: 100%
  - Atualiza automaticamente o campo `percentual_total` do projeto

### 1.2 Cálculo de Progresso

```
percentual_acumulado = SUM(percentual_realizado) de todas execuções
```

**Regra**: Se a soma ultrapassar 100%, o sistema limita em 100%.

### 1.3 Status de Execução

| Condição | Status |
|----------|--------|
| `ABS(realizado - previsto) <= 5%` | No prazo ✅ |
| `realizado > previsto + 5%` | Adiantado 🚀 |
| `realizado < previsto - 5%` | Atrasado ⚠️ |

### 1.4 Tendência de Execução

Baseado nas últimas 3 execuções:

```
media_recente = AVG(últimas 3 execuções)
media_geral = AVG(todas execuções)

Se media_recente > media_geral + 1%: "Acelerando" 🚀
Se media_recente < media_geral - 1%: "Desacelerando" 🐌
Caso contrário: "Estável" ➡️
```

### 1.5 Projeção de Conclusão

```
percentual_restante = 100% - percentual_atual
dias_restantes = CEIL(percentual_restante / media_diaria)
data_conclusao = hoje + dias_restantes
```

---

## 2. Retrabalho

### 2.1 Classificação de Motivos

#### Categorias Principais:

1. **Técnico**
   - Erro de Projeto
   - Erro de Planejamento
   - Erro de Execução
   - Falha de Equipamento
   - **Severidade**: Média a Alta

2. **Cliente**
   - Mudança de Escopo
   - Alteração de Projeto
   - Requisitos Incorretos
   - **Severidade**: Média

3. **Fornecedor**
   - Material Incorreto
   - Atraso de Fornecedor
   - Qualidade Inadequada
   - **Severidade**: Alta

4. **Planejamento**
   - Falta de Recursos
   - Cronograma Inadequado
   - **Severidade**: Alta

5. **Externo**
   - Condições Climáticas
   - Problemas Regulatórios
   - **Severidade**: Baixa a Média

### 2.2 Classificação Automática

O sistema usa NLP básico para classificar:

```typescript
texto = motivo + " " + descricao
palavras_chave = ["erro", "projeto", "material", "cliente", ...]

Para cada categoria:
  Se texto contém palavras_chave:
    categoria = categoria_correspondente
```

### 2.3 Severidade Geral do Projeto

Baseado no impacto acumulado:

| Condição | Severidade |
|----------|-----------|
| `impacto_total >= 20%` OU `total_retrabalhos >= 10` | Crítica 🔴 |
| `impacto_total >= 10%` OU `total_retrabalhos >= 5` | Alta 🟠 |
| `impacto_total >= 5%` OU `total_retrabalhos >= 3` | Média 🟡 |
| Caso contrário | Baixa 🟢 |

### 2.4 Recomendações Automáticas

Baseado na severidade e categoria:

- **Crítica**: "Realizar análise de causa raiz urgente"
- **Alta**: "Revisar processos de qualidade"
- **Categoria mais frequente**: "Focar em ações preventivas em [categoria]"
- **Tempo perdido > 40h**: "Implementar controles mais rigorosos"

---

## 3. Status e Fases do Projeto

### 3.1 Fases Baseadas no Percentual

| Percentual | Fase |
|------------|------|
| 100% | Concluído ✅ |
| 75-99% | Em Fase Final 🏁 |
| 50-74% | Em Andamento 🔨 |
| 25-49% | Em Início 🚀 |
| 0-24% | Iniciando 🌱 |

### 3.2 Status do Projeto

Valores permitidos:
- Em Planejamento
- Em Execução
- Parado
- Parado Cliente
- Concluído
- Cancelado

### 3.3 Situação de Atividade

Baseado na última execução registrada:

| Última Execução | Situação |
|----------------|----------|
| <= 3 dias atrás | Ativo 🟢 |
| 4-7 dias atrás | Pouco Ativo 🟡 |
| > 7 dias atrás | Inativo 🔴 |
| Nunca registrado | Sem Registro ⚪ |

---

## 4. Validações de Input

### 4.1 Execução Diária

**Campos Obrigatórios:**
- `projeto_id` ou `codigo_projeto`
- `percentual_realizado` (0-100)

**Campos Opcionais:**
- `data` (default: hoje)
- `percentual_previsto` (0-100)
- `observacoes` (máx 500 caracteres)

**Avisos:**
- Data no futuro
- Data > 1 ano no passado
- Grande diferença entre previsto e realizado (>50%)

### 4.2 Retrabalho

**Campos Obrigatórios:**
- `projeto_id` ou `codigo_projeto`
- `motivo` (mín 5 caracteres)
- `descricao` (mín 10 caracteres, máx 1000)

**Campos Opcionais:**
- `data` (default: hoje)
- `categoria` (classificação automática se não fornecida)
- `impacto_percentual` (0-100)
- `tempo_perdido_horas` (>= 0)

**Avisos:**
- Impacto > 20%
- Tempo perdido > 200h

### 4.3 Projeto

**Campos Obrigatórios:**
- `nome` (mín 5 caracteres)
- `cliente`

**Campos Recomendados:**
- `codigo` (identificador único)
- `data_inicio`
- `data_previsao_termino`

**Validações:**
- `data_previsao_termino` > `data_inicio`
- Prazo < 2 anos (aviso se maior)

---

## 5. Notificações e Alertas

### 5.1 Notificações Diárias (Futuro)

**Manhã (8h):**
- "Bom dia! Qual a previsão de execução para hoje?"

**Noite (18h):**
- "Olá! Vamos registrar a execução do dia?"
- "Houve algum retrabalho hoje?"

### 5.2 Alertas Automáticos

**Projeto Atrasado:**
- Variação negativa > 10% por 3 dias consecutivos
- Notificar engenheiro e supervisor

**Alto Índice de Retrabalho:**
- Mais de 5 retrabalhos no mesmo projeto
- Impacto total > 15%
- Notificar para análise de causa raiz

**Projeto Inativo:**
- Sem registros por 7+ dias
- Lembrete automático ao engenheiro

---

## 6. Sincronização de Dados

### 6.1 Engenheiros → Supabase

**Frequência**: Manual ou agendada (diária)

**Processo:**
1. Ler dados das planilhas individuais
2. Validar formato e consistência
3. Criar ou atualizar projetos no banco
4. Log de erros e sucessos

**Conflitos:**
- Se projeto já existe (por código): ATUALIZAR
- Se projeto novo: CRIAR

### 6.2 Supabase → CEO

**Frequência**: Automática (a cada 30 minutos) ou manual

**Processo:**
1. Query na view `view_dashboard_ceo`
2. Limpar planilha do CEO
3. Escrever dados consolidados
4. Aplicar formatação (cores, negrito, percentuais)
5. Adicionar timestamp de atualização

**Dados Incluídos:**
- Código, Nome, Cliente, Engenheiro
- Área, Tipo de Obra, Status
- % Concluído, Data Início, Previsão Término
- Última Atualização, Total Retrabalhos, Impacto
- Situação (Ativo/Inativo)

---

## 7. Segurança

### 7.1 Permissões

**Engenheiro:**
- Ver apenas seus próprios projetos
- Criar/Editar/Deletar apenas em seus projetos
- Registrar execuções e retrabalhos apenas em seus projetos

**CEO/Admin:**
- Ver todos os projetos de todos engenheiros
- Acesso read-only via planilha consolidada

**Service Role (Edge Functions):**
- Acesso completo para operações do sistema

### 7.2 Validação de Dados

Todas as entradas são validadas em 3 camadas:

1. **Chatbot**: Validação básica de formato
2. **Logic Layer**: Validação de regras de negócio
3. **Edge Function**: Validação final antes de gravar

---

**Última atualização**: Novembro 2024

