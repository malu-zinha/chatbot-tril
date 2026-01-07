# 👔 Tabela Evandro - Visão do Dono/Gerencial

## 📋 Visão Geral

Sistema completo para o **dono da empresa (Evandro)** distribuir tarefas, monitorar engenheiros e tomar decisões baseadas em dados.

### Funcionalidades Principais

✅ **Distribuição de Tarefas** - Atribuir projetos/áreas para engenheiros  
✅ **Sincronização Automática** - Task aparece automaticamente no BD do engenheiro  
✅ **Notificações WhatsApp** - Engenheiro recebe alerta de nova tarefa  
✅ **Consulta de Status** - Ver carga de trabalho, execução e retrabalhos  
✅ **Recomendação Inteligente** - Sistema sugere melhor engenheiro  
✅ **Histórico de Retrabalhos** - Análise completa com gráficos  
✅ **Verificação de Exclusividade** - Saber se eng trabalha só na empresa  

---

## 🏗️ Estrutura das Tabelas

### 1. **dono_empresa**
Cadastro do dono/gestor.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| dono_id | UUID | ID único |
| nome | TEXT | Nome do dono |
| email | TEXT | Email (único) |
| telefone | TEXT | Telefone |

**Seed inicial:** Evandro já cadastrado

---

### 2. **complexidade_tarefas**
Níveis de complexidade das tarefas.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| complexidade_id | SERIAL | ID único |
| codigo | TEXT | Ex: MEDIA, COMPLEXA |
| descricao | TEXT | Descrição completa |
| nivel | INTEGER | 1 (baixa) a 5 (muito alta) |
| tempo_estimado_dias | INTEGER | Tempo estimado |

**Níveis pré-cadastrados:**
1. **MUITO_SIMPLES** (Nível 1) - 1 dia
2. **SIMPLES** (Nível 2) - 3 dias
3. **MEDIA** (Nível 3) - 7 dias
4. **COMPLEXA** (Nível 4) - 15 dias
5. **MUITO_COMPLEXA** (Nível 5) - 30 dias

> ⚠️ **Envie sua tabela de complexidade para substituir esses valores**

---

### 3. **evandro_distribuicao_tasks** ⭐ (Principal)
Distribuição de tarefas pelo dono.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| task_id | UUID | ID único da task |
| dono_id | UUID | Quem distribuiu |
| eng_id | UUID | Para quem |
| projeto_id | UUID | Projeto (existente) |
| codigo_projeto | TEXT | Código (se projeto novo) |
| cliente | TEXT | Cliente (se projeto novo) |
| area_id | INTEGER | Área designada |
| complexidade_id | INTEGER | Complexidade |
| descricao_task | TEXT | Descrição da task |
| data_inicio_prevista | DATE | Início previsto |
| data_conclusao_prevista | DATE | Conclusão prevista |
| status_task | TEXT | PENDENTE, ACEITA, EM_ANDAMENTO, CONCLUIDA |
| **notificacao_enviada** | BOOLEAN | **TRUE quando WhatsApp foi enviado** |
| **sincronizado** | BOOLEAN | **TRUE quando criado em engenheiros_projetos** |
| eng_projeto_id | UUID | Referência para engenheiros_projetos |

**Fluxo automático:**
```
1. Dono distribui task
   ↓
2. TRIGGER cria automaticamente em engenheiros_projetos
   ↓
3. TRIGGER cria notificação na fila
   ↓
4. Sistema externo envia WhatsApp
   ↓
5. Engenheiro recebe alerta
```

---

### 4. **notificacoes_whatsapp**
Fila de notificações para envio.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| notificacao_id | UUID | ID único |
| eng_id | UUID | Destinatário |
| tipo | TEXT | NOVA_TAREFA, PRAZO_VENCIDO, etc. |
| titulo | TEXT | Título da notificação |
| mensagem | TEXT | Mensagem completa |
| task_id | UUID | Referência para task |
| enviada | BOOLEAN | TRUE quando enviada |
| data_envio | TIMESTAMP | Quando foi enviada |
| tentativas | INTEGER | Número de tentativas |

---

## 🔄 Fluxo Completo de Distribuição

### Passo a Passo

```
1️⃣ Dono consulta status dos engenheiros
   → Function: dono_consultar_todos_engenheiros()
   → Retorna: carga de trabalho, taxa de execução, retrabalhos, exclusividade

2️⃣ Dono escolhe engenheiro (ou pede recomendação)
   → Function: dono_recomendar_engenheiro()
   → Sistema calcula score baseado em disponibilidade

3️⃣ Dono distribui tarefa
   → Function: dono_distribuir_tarefa()
   → TRIGGER: sincronizar_task_para_engenheiro()
   → Cria automaticamente em engenheiros_projetos
   → Cria automaticamente notificação WhatsApp

4️⃣ Sistema processa fila de notificações
   → Function: processar_fila_notificacoes()
   → Sistema externo (webhook) envia WhatsApp
   → Function: marcar_notificacao_enviada()

5️⃣ Engenheiro recebe no WhatsApp
   → "🆕 Nova Tarefa Atribuída!"
   → Projeto, área, descrição, prazos

6️⃣ Engenheiro acessa seu chatbot
   → Comando: "meus projetos"
   → Nova tarefa já aparece automaticamente!
```

---

## 💬 Exemplos de Uso via Chatbot

### Cenário 1: Consultar Todos os Engenheiros

**👔 Dono Evandro:** "Mostrar status de todos os engenheiros"

**🤖 Bot:**
```
📊 Status Geral - 5 Engenheiros

1️⃣ Ana Santos ⭐ (Exclusiva)
   • Projetos ativos: 2
   • Taxa de execução: 75%
   • Carga atual: 12 dias
   • Retrabalhos: 1
   • Status: DISPONIVEL ✅

2️⃣ João Silva ⭐ (Exclusivo)
   • Projetos ativos: 3
   • Taxa de execução: 85%
   • Carga atual: 22 dias
   • Retrabalhos: 0
   • Status: CARGA_ALTA ⚠️

3️⃣ Carlos Souza (Não exclusivo)
   • Projetos ativos: 1
   • Taxa de execução: 60%
   • Carga atual: 8 dias
   • Retrabalhos: 3
   • Status: DISPONIVEL ✅

4️⃣ Maria Oliveira ⭐ (Exclusiva)
   • Projetos ativos: 4
   • Taxa de execução: 90%
   • Carga atual: 35 dias
   • Retrabalhos: 0
   • Status: SOBRECARREGADO 🔴

5️⃣ Pedro Costa (Não exclusivo)
   • Projetos ativos: 2
   • Taxa de execução: 70%
   • Carga atual: 15 dias
   • Retrabalhos: 2
   • Status: CARGA_MEDIA ⚠️

💡 Recomendação: Ana Santos ou Carlos Souza estão mais disponíveis
```

---

### Cenário 2: Consultar Engenheiro Específico

**👔 Dono:** "Ver detalhes da Ana Santos"

**🤖 Bot:**
```
👤 Ana Santos (Exclusiva) ⭐

📊 Resumo Geral:
• Total de projetos: 2
• Áreas ativas: 3
• Taxa de execução média: 75%
• Retrabalhos: 1
• Dias de trabalho pendentes: 12
• Áreas atrasadas: 0

📋 Projetos Ativos:

🏢 PRJ-2025-001 - Construtora ABC
   ⚡ Elétrico
      • Status: Instalações de Primeira Fase (35%)
      • Complexidade: Média
      • Prazo: 25/12/2025
      • Atraso: 0 dias ✅
      • Retrabalhos: 0
   
   💧 Hidráulico
      • Status: Em Planejamento (5%)
      • Complexidade: Simples
      • Prazo: 05/01/2026
      • Atraso: 0 dias ✅
      • Retrabalhos: 0

🏢 PRJ-2025-002 - Edifícios XYZ
   🏗️ Estrutural
      • Status: Detalhamento (55%)
      • Complexidade: Complexa
      • Prazo: 15/01/2026
      • Atraso: 0 dias ✅
      • Retrabalhos: 1

💡 Análise: Engenheira com boa taxa de execução e baixa carga. 
   Recomendada para tarefas de média complexidade.
```

---

### Cenário 3: Solicitar Recomendação

**👔 Dono:** "Quem você recomenda para uma tarefa complexa?"

**🤖 Bot:**
```
🎯 Top 5 Engenheiros Recomendados (Tarefa Complexa)

🥇 1º - Ana Santos ⭐ (Score: 87)
   • Motivo: Baixa carga de trabalho
   • Exclusiva: Sim
   • Carga atual: 12 dias
   • Taxa de execução: 75%
   • Retrabalhos: 1
   • Status: DISPONIVEL ✅

🥈 2º - Carlos Souza (Score: 82)
   • Motivo: Disponível
   • Exclusivo: Não
   • Carga atual: 8 dias
   • Taxa de execução: 60%
   • Retrabalhos: 3
   • Status: DISPONIVEL ✅

🥉 3º - Pedro Costa (Score: 75)
   • Motivo: Baixa carga
   • Exclusivo: Não
   • Carga atual: 15 dias
   • Taxa de execução: 70%
   • Retrabalhos: 2
   • Status: CARGA_MEDIA ⚠️

4️⃣ João Silva ⭐ (Score: 68)
   • Motivo: Alta taxa de execução
   • Exclusivo: Sim
   • Carga atual: 22 dias
   • Taxa de execução: 85%
   • Retrabalhos: 0
   • Status: CARGA_ALTA ⚠️

5️⃣ Maria Oliveira ⭐ (Score: 45)
   • Motivo: Alta taxa de execução
   • Exclusiva: Sim
   • Carga atual: 35 dias
   • Taxa de execução: 90%
   • Retrabalhos: 0
   • Status: SOBRECARREGADO 🔴

💡 Recomendo: Ana Santos - melhor equilíbrio entre carga e desempenho
```

---

### Cenário 4: Distribuir Nova Tarefa

**👔 Dono:** "Atribuir projeto PRJ-2025-010 para Ana Santos, área elétrica, complexidade média, descrição: Instalações elétricas completas do edifício comercial"

**🤖 Bot:** Processando atribuição...

✅ **Tarefa distribuída com sucesso!**

📋 **Detalhes:**
• Engenheira: Ana Santos
• Projeto: PRJ-2025-010
• Área: Elétrico
• Complexidade: Média (7 dias estimados)
• Status: PENDENTE
• Descrição: Instalações elétricas completas do edifício comercial

🔄 **Ações automáticas:**
✅ Task criada no banco de dados
✅ Sincronizada com planilha da Ana
✅ Notificação WhatsApp enviada
✅ Ana receberá o alerta

---

### Cenário 5: Consultar Retrabalhos (Para Gráficos)

**👔 Dono:** "Mostrar histórico de retrabalhos dos últimos 30 dias"

**🤖 Bot:**
```
📊 Histórico de Retrabalhos (Últimos 30 dias)

📈 Estatísticas Gerais:
• Total de retrabalhos: 8
• Engenheiros afetados: 4
• Projetos afetados: 5

📉 Por Motivo (Top 5):
1. Alterações solicitadas pelo cliente: 3 (37.5%)
2. Erro no projeto inicial: 2 (25%)
3. Documentação incorreta: 1 (12.5%)
4. Falha de comunicação: 1 (12.5%)
5. Material inadequado: 1 (12.5%)

📅 Últimos Retrabalhos:

🔴 05/12/2025 - Carlos Souza
   • Projeto: PRJ-2025-003
   • Área: Estrutural
   • Motivo: Alterações solicitadas pelo cliente
   • Status na época: Detalhamento

🔴 03/12/2025 - Pedro Costa
   • Projeto: PRJ-2025-007
   • Área: Hidráulico
   • Motivo: Erro no projeto inicial
   • Status na época: Instalações Primeira Fase

🔴 01/12/2025 - Ana Santos
   • Projeto: PRJ-2025-002
   • Área: Estrutural
   • Motivo: Documentação incorreta
   • Status na época: Em Planejamento

💡 Análise: Principal causa é alteração do cliente (37.5%)
   Sugestão: Validar escopo antes de iniciar execução
```

---

## 📊 Views Disponíveis para o Dono

### 1. **vw_dono_visao_geral**
Resumo estatístico de todos os engenheiros.

**Campos:**
- eng_id, nome, exclusivo
- total_projetos, total_areas
- media_percentual (taxa de execução)
- areas_ativas
- total_retrabalhos
- complexidade_media
- dias_trabalho_pendentes
- areas_atrasadas

**Uso:**
```sql
SELECT * FROM vw_dono_visao_geral
ORDER BY dias_trabalho_pendentes ASC;
```

---

### 2. **vw_dono_engenheiro_detalhado**
Detalhamento completo por projeto/área de cada engenheiro.

**Campos:**
- Dados do engenheiro (nome, exclusivo)
- Dados do projeto (código, cliente)
- Dados da área (descrição)
- Status, taxa de execução, complexidade
- Retrabalhos, dias de atraso, prazos

**Uso:**
```sql
SELECT * FROM vw_dono_engenheiro_detalhado
WHERE engenheiro_nome = 'Ana Santos'
ORDER BY taxa_execucao ASC;
```

---

### 3. **vw_dono_retrabalhos_historico**
Histórico completo de retrabalhos.

**Campos:**
- Engenheiro, projeto, área
- Data, motivo, tipo, descrição
- Status na época

**Uso para Gráficos:**
```sql
-- Retrabalhos por engenheiro
SELECT engenheiro_nome, COUNT(*) AS total
FROM vw_dono_retrabalhos_historico
GROUP BY engenheiro_nome
ORDER BY total DESC;

-- Retrabalhos por mês
SELECT 
    DATE_TRUNC('month', data_retrabalho) AS mes,
    COUNT(*) AS total
FROM vw_dono_retrabalhos_historico
GROUP BY mes
ORDER BY mes DESC;
```

---

### 4. **vw_dono_retrabalhos_por_motivo**
Agrupamento de retrabalhos por motivo.

**Campos:**
- motivo_retrabalho
- quantidade
- engenheiros_afetados
- projetos_afetados

**Uso para Gráficos:**
```sql
SELECT * FROM vw_dono_retrabalhos_por_motivo
ORDER BY quantidade DESC
LIMIT 10;
```

---

### 5. **vw_dono_taxa_execucao_ranking**
Ranking de engenheiros por desempenho.

**Campos:**
- eng_id, nome, exclusivo
- taxa_execucao_media
- total_areas, areas_concluidas
- percentual_conclusao

**Uso:**
```sql
SELECT * FROM vw_dono_taxa_execucao_ranking
ORDER BY taxa_execucao_media DESC;
```

---

## 🎯 Functions Disponíveis

### 1. **dono_distribuir_tarefa()**
Distribui nova tarefa para um engenheiro.

**Parâmetros:**
- `p_dono_id` - UUID do dono
- `p_eng_id` - UUID do engenheiro
- `p_projeto_id` - UUID do projeto (ou NULL se novo)
- `p_codigo_projeto` - Código do projeto novo
- `p_cliente` - Nome do cliente
- `p_area_codigo` - Código da área (ex: 'ELETRICO')
- `p_complexidade_codigo` - Código da complexidade (ex: 'MEDIA')
- `p_descricao_task` - Descrição da tarefa
- `p_data_inicio_prevista` - Data de início
- `p_data_conclusao_prevista` - Data de conclusão
- `p_observacoes_dono` - Observações adicionais

**Exemplo:**
```sql
SELECT dono_distribuir_tarefa(
    p_dono_id := 'uuid-evandro',
    p_eng_id := 'uuid-ana',
    p_projeto_id := NULL,
    p_codigo_projeto := 'PRJ-2025-010',
    p_cliente := 'Construtora XYZ',
    p_area_codigo := 'ELETRICO',
    p_complexidade_codigo := 'MEDIA',
    p_descricao_task := 'Instalações elétricas completas',
    p_data_inicio_prevista := '2025-12-15',
    p_data_conclusao_prevista := '2025-12-30',
    p_observacoes_dono := 'Projeto prioritário'
);
```

---

### 2. **dono_consultar_status_engenheiro()**
Consulta status completo de um engenheiro.

**Exemplo:**
```sql
SELECT dono_consultar_status_engenheiro(
    p_dono_id := 'uuid-evandro',
    p_eng_id := 'uuid-ana'
);
```

---

### 3. **dono_consultar_todos_engenheiros()**
Lista todos os engenheiros com status de carga.

**Exemplo:**
```sql
SELECT dono_consultar_todos_engenheiros(
    p_dono_id := 'uuid-evandro'
);
```

---

### 4. **dono_buscar_historico_retrabalhos()**
Busca histórico de retrabalhos com filtros.

**Exemplo:**
```sql
SELECT dono_buscar_historico_retrabalhos(
    p_dono_id := 'uuid-evandro',
    p_eng_id := NULL, -- Todos os engenheiros
    p_projeto_id := NULL, -- Todos os projetos
    p_data_inicio := '2025-11-01',
    p_data_fim := '2025-12-31'
);
```

---

### 5. **dono_recomendar_engenheiro()**
Recomenda melhor engenheiro baseado em score.

**Exemplo:**
```sql
SELECT dono_recomendar_engenheiro(
    p_dono_id := 'uuid-evandro',
    p_complexidade_desejada := 4 -- Tarefa complexa
);
```

---

## 📱 Sistema de Notificações WhatsApp

### Fluxo de Notificações

```
1. TRIGGER cria notificação em notificacoes_whatsapp
   ↓
2. Webhook/Cron chama processar_fila_notificacoes()
   ↓
3. Sistema externo envia via Evolution API / Twilio
   ↓
4. Chama marcar_notificacao_enviada()
   ↓
5. Engenheiro recebe no WhatsApp
```

### Processar Fila (Webhook)

```javascript
// webhook-notificacoes.js
const express = require('express');
const fetch = require('node-fetch');

const app = express();

// Executar a cada 30 segundos
setInterval(async () => {
    // 1. Busca notificações pendentes
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/processar_fila_notificacoes`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
        }
    });
    
    const { notificacoes } = await response.json();
    
    // 2. Envia cada notificação
    for (const notif of notificacoes || []) {
        try {
            // Envia via Evolution API / Twilio
            await enviarWhatsApp(notif.telefone, notif.mensagem);
            
            // Marca como enviada
            await fetch(`${SUPABASE_URL}/rest/v1/rpc/marcar_notificacao_enviada`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    p_notificacao_id: notif.notificacao_id,
                    p_sucesso: true
                })
            });
            
        } catch (error) {
            // Marca erro
            await fetch(`${SUPABASE_URL}/rest/v1/rpc/marcar_notificacao_enviada`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    p_notificacao_id: notif.notificacao_id,
                    p_sucesso: false,
                    p_erro: error.message
                })
            });
        }
    }
}, 30000); // 30 segundos

app.listen(3000);
```

---

## 🎨 Próximo Passo: Layout (você pediu para fazer depois)

Quando estiver pronto, vou criar:

1. **Dashboard do Dono**
   - Cards com estatísticas gerais
   - Lista de engenheiros com status visual
   - Gráficos de retrabalhos (Chart.js / Recharts)
   - Formulário de distribuição de tarefas

2. **Dashboard do Engenheiro**
   - Projetos ativos
   - Previsões diárias
   - Histórico de retrabalhos

---

## ✅ Checklist de Implementação

- [x] Tabela dono_empresa
- [x] Tabela complexidade_tarefas
- [x] Tabela evandro_distribuicao_tasks
- [x] Tabela notificacoes_whatsapp
- [x] Trigger de sincronização automática
- [x] Views consolidadas
- [x] Functions de distribuição
- [x] Functions de consulta
- [x] Sistema de recomendação
- [x] Fila de notificações
- [ ] Webhook de envio WhatsApp (implementar externamente)
- [ ] Layout visual (fazer depois)

---

**🎯 Sistema completo para gestão inteligente de tarefas!**




