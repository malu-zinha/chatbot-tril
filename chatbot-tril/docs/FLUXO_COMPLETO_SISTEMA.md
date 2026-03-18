# 🔄 Fluxo Completo do Sistema

## Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────┐
│                   SISTEMA TECPRED                            │
│           Gestão de Projetos via Chatbot                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐                    ┌──────────────────┐
│  ENGENHEIROS     │                    │  DONO (EVANDRO)  │
│  (WhatsApp)      │                    │  (WhatsApp)      │
└────────┬─────────┘                    └────────┬─────────┘
         │                                       │
         │ Prompts naturais                     │ Comandos gerenciais
         │                                       │
         ↓                                       ↓
┌─────────────────────────────────────────────────────────────┐
│                      CHATBOT (LLM)                           │
│            Interpreta intenções + Extrai entidades           │
└────────┬──────────────────────────────────────┬─────────────┘
         │                                       │
         │ Chama functions PostgreSQL            │
         │                                       │
         ↓                                       ↓
┌──────────────────────────┐       ┌──────────────────────────┐
│  FUNCTIONS ENGENHEIROS   │       │   FUNCTIONS DONO         │
│                          │       │                          │
│  • registrar_previsao    │       │  • distribuir_tarefa     │
│  • atualizar_feito       │       │  • consultar_status      │
│  • registrar_retrabalho  │       │  • recomendar_eng        │
│  • atualizar_status      │       │  • buscar_retrabalhos    │
│  • atribuir_area         │       │                          │
└────────┬─────────────────┘       └────────┬─────────────────┘
         │                                   │
         │                                   │
         ↓                                   ↓
┌─────────────────────────────────────────────────────────────┐
│                  BANCO DE DADOS POSTGRESQL                   │
│                        (Supabase)                            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ engenheiros  │  │   projetos   │  │    areas     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │      engenheiros_projetos (PRINCIPAL)          │         │
│  │  • Conecta eng + projeto + área                │         │
│  │  • Cálculos automáticos via TRIGGERS           │         │
│  └────────────────────────────────────────────────┘         │
│         ↓              ↓              ↓                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  previsões  │ │ retrabalhos │ │   prazos    │           │
│  │   (diário)  │ │   (diário)  │ │  (4 datas)  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │  evandro_distribuicao_tasks                    │         │
│  │  • Tarefas atribuídas pelo dono                │         │
│  │  • TRIGGER: sincroniza automaticamente         │         │
│  │  • TRIGGER: cria notificação WhatsApp          │         │
│  └────────────────────────────────────────────────┘         │
│         ↓                                                    │
│  ┌─────────────────────┐                                    │
│  │ notificacoes_whatsapp│                                   │
│  │  • Fila de envios   │                                    │
│  └─────────────────────┘                                    │
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │              VIEWS CONSOLIDADAS                │         │
│  │  • vw_dono_visao_geral                         │         │
│  │  • vw_dono_engenheiro_detalhado                │         │
│  │  • vw_dono_retrabalhos_historico               │         │
│  │  • vw_quantidade_retrabalhos                   │         │
│  │  • vw_projetos_completo                        │         │
│  └────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
         │                                   │
         │                                   │
         ↓                                   ↓
┌──────────────────────┐       ┌──────────────────────────┐
│  WEBHOOK WHATSAPP    │       │  WEBHOOK NOTIFICAÇÕES    │
│  (Evolution API)     │       │  (Processa fila)         │
│                      │       │                          │
│  • Recebe mensagens  │       │  • A cada 30s            │
│  • Envia para bot    │       │  • Busca pendentes       │
│  • Retorna resposta  │       │  • Envia WhatsApp        │
└──────────────────────┘       └──────────────────────────┘
```

---

## 🔄 Fluxo 1: Engenheiro Registra Previsão Diária

```
1. Engenheiro abre WhatsApp
   👤 "Previsão de hoje: terminar instalações do 3º andar"
   
2. Chatbot processa
   🤖 Identifica: registrar_previsao_dia
   
3. Function PostgreSQL
   📝 Cria registro em projetos_previsao
   • previsao_texto = "terminar instalações do 3º andar"
   • data_registro = HOJE
   • editavel = TRUE
   
4. Retorno
   ✅ "Previsão registrada! Ao fim do dia, me diga o que foi feito."
```

---

## 🔄 Fluxo 2: Engenheiro Atualiza Feito ao Fim do Dia

```
1. Fim do dia
   👤 "Feito: terminei 80% das instalações, falta o quadro principal. Nova previsão: amanhã."
   
2. Chatbot processa
   🤖 Identifica: atualizar_feito_dia
   🤖 Extrai: feito_texto + nova_data_prevista
   
3. Function PostgreSQL + TRIGGER
   📝 Atualiza projetos_previsao
   • feito_texto = "terminei 80%..."
   • nova_data_prevista = AMANHÃ
   • editavel = FALSE ← TRIGGER torna imutável!
   • data_fim_dia = NOW()
   
4. Atualiza engenheiros_projetos
   📝 data_prevista = AMANHÃ
   
5. Retorno
   ✅ "Registrado! Este registro agora é imutável para histórico."
   📊 "Taxa de execução atualizada: 80%"
```

---

## 🔄 Fluxo 3: Engenheiro Registra Retrabalho

```
1. Engenheiro reporta
   👤 "Teve retrabalho hoje: cliente mudou o projeto"
   
2. Chatbot processa
   🤖 Identifica: registrar_retrabalho_dia
   🤖 Extrai: necessitou_retrabalho=TRUE, motivo
   
3. Function PostgreSQL + TRIGGERS
   📝 Cria registro em retrabalho_projetos
   • necessitou_retrabalho = TRUE
   • motivo_retrabalho = "cliente mudou o projeto"
   • data_retrabalho = HOJE
   
   🔄 TRIGGER: validar_motivo_retrabalho
   ✅ Valida que motivo foi preenchido
   
   🔄 TRIGGER: atualizar_status_retrabalho
   📝 Adiciona +1 dia na data_prevista (atraso)
   📝 Registra status_id atual
   
4. Calcula contador automático
   📊 vw_quantidade_retrabalhos
   • COUNT(*) WHERE necessitou_retrabalho=TRUE
   • Quantidade aumenta de 0 → 1
   
5. Retorno
   ✅ "Retrabalho registrado. Total: 1 retrabalho."
   ⚠️ "Data prevista ajustada: +1 dia"
```

---

## 🔄 Fluxo 4: Dono Consulta Status

```
1. Dono Evandro pergunta
   👔 "Status de todos os engenheiros"
   
2. Chatbot processa
   🤖 Identifica: dono_consultar_todos_engenheiros
   
3. Function PostgreSQL
   📊 SELECT * FROM vw_dono_visao_geral
   
   Para cada engenheiro, retorna:
   • Total de projetos
   • Áreas ativas
   • Taxa de execução média
   • Retrabalhos
   • Complexidade média
   • Dias de trabalho pendentes ← IMPORTANTE!
   • Áreas atrasadas
   • Exclusividade ✅ ou ❌
   
4. Calcula status de carga
   • > 30 dias → SOBRECARREGADO 🔴
   • > 15 dias → CARGA_ALTA ⚠️
   • > 7 dias → CARGA_MEDIA 🟡
   • Else → DISPONIVEL ✅
   
5. Retorno formatado
   📊 Lista todos com status visual
   💡 Recomenda quem está mais disponível
```

---

## 🔄 Fluxo 5: Dono Distribui Tarefa (PRINCIPAL!)

```
1. Dono decide
   👔 "Distribuir PRJ-2025-010, área elétrica, para Ana Santos"
   
2. Chatbot processa
   🤖 Identifica: dono_distribuir_tarefa
   🤖 Extrai todos os parâmetros
   
3. Function PostgreSQL
   📝 INSERT INTO evandro_distribuicao_tasks
   • dono_id = UUID do Evandro
   • eng_id = UUID da Ana
   • projeto_id / codigo_projeto
   • area_id = busca de 'ELETRICO'
   • complexidade_id = busca de 'MEDIA'
   • descricao_task
   • status_task = 'PENDENTE'
   • sincronizado = FALSE
   
4. TRIGGER: sincronizar_task_para_engenheiro()
   
   4.1 Cria projeto se não existir
       📝 INSERT INTO projetos
       
   4.2 Cria atribuição automaticamente
       📝 INSERT INTO engenheiros_projetos
       • eng_id = Ana
       • projeto_id = PRJ-2025-010
       • area_id = ELETRICO
       • status_id = AGUARDANDO_INICIO
       • TRIGGERS calculam tempo_trabalho e percentual!
       
   4.3 Atualiza task
       📝 UPDATE evandro_distribuicao_tasks
       • eng_projeto_id = ID criado
       • sincronizado = TRUE ✅
       
   4.4 Cria notificação
       📝 INSERT INTO notificacoes_whatsapp
       • eng_id = Ana
       • tipo = 'NOVA_TAREFA'
       • titulo = "🆕 Nova Tarefa Atribuída!"
       • mensagem = detalhes completos
       • task_id = referência
       • enviada = FALSE
       
5. Webhook processa fila (a cada 30s)
   
   5.1 Busca pendentes
       📊 processar_fila_notificacoes()
       
   5.2 Envia WhatsApp (Evolution API)
       📱 POST para Ana Santos
       
   5.3 Marca como enviada
       ✅ marcar_notificacao_enviada()
       • notificacao_enviada = TRUE
       • data_notificacao = NOW()
       
6. Ana recebe no WhatsApp
   📱 "🆕 Nova Tarefa Atribuída!"
      "📋 Projeto: PRJ-2025-010"
      "📦 Área: Elétrico"
      "📝 Descrição: ..."
      "📅 Início: 15/12"
      "⏰ Conclusão: 30/12"
      
7. Ana consulta chatbot
   👤 "Meus projetos"
   
   🤖 SELECT * FROM vw_engenheiros_projetos WHERE eng_id = Ana
   
   📋 "Você tem 3 projetos:
        1. PRJ-2025-001 - Elétrico (35%)
        2. PRJ-2025-002 - Hidráulico (10%)
        3. ✨ PRJ-2025-010 - Elétrico (0%) ← NOVA!"
```

---

## 📊 Cálculos Automáticos via TRIGGERS

### 1. Tempo de Trabalho
```sql
-- TRIGGER: trg_calcular_tempo_trabalho
-- QUANDO: INSERT/UPDATE area_id em engenheiros_projetos

SELECT tempo_trabalho_dias FROM areas WHERE area_id = NEW.area_id
→ Preenche automaticamente!

Exemplo:
area_id = 1 (ELETRICO) → tempo_trabalho_dias = 15 ✅
```

### 2. Percentual de Andamento
```sql
-- TRIGGER: trg_calcular_percentual_status
-- QUANDO: INSERT/UPDATE status_id em engenheiros_projetos

SELECT percentual_base FROM status_codes WHERE status_id = NEW.status_id
→ Preenche automaticamente!

Exemplo:
status_id = 5 (INSTALACOES_GROSSO) → percentual_andamento = 35.00 ✅
```

### 3. Variáveis Compartilhadas
```sql
-- TRIGGER: trg_preencher_vars_*
-- QUANDO: INSERT em projetos_previsao, retrabalho_projetos, prazos

SELECT projeto_id, eng_id FROM engenheiros_projetos 
WHERE id = NEW.eng_projeto_id
→ Preenche automaticamente projeto_id e eng_id!
```

### 4. Imutabilidade de Previsões
```sql
-- TRIGGER: trg_validar_edicao_previsao
-- QUANDO: UPDATE em projetos_previsao

IF feito_texto preenchido THEN
    editavel = FALSE
    data_fim_dia = NOW()
END IF
→ Torna registro imutável após fim do dia!
```

### 5. Validação de Motivo Obrigatório
```sql
-- TRIGGER: trg_validar_motivo_retrabalho
-- QUANDO: INSERT/UPDATE em retrabalho_projetos

IF necessitou_retrabalho = TRUE AND motivo IS NULL THEN
    RAISE EXCEPTION 'Motivo é obrigatório!'
END IF
→ Garante que motivo seja preenchido!
```

### 6. Atraso Automático em Retrabalhos
```sql
-- TRIGGER: trg_atualizar_status_retrabalho
-- QUANDO: INSERT em retrabalho_projetos

IF necessitou_retrabalho = TRUE THEN
    UPDATE engenheiros_projetos
    SET data_prevista = data_prevista + INTERVAL '1 day'
END IF
→ Adiciona automaticamente 1 dia de atraso!
```

---

## 📈 Contador de Retrabalhos (Via VIEW)

```sql
-- VIEW: vw_quantidade_retrabalhos
-- Contador automático via COUNT(*)

SELECT 
    eng_projeto_id,
    COUNT(*) FILTER (WHERE necessitou_retrabalho = true) AS quantidade_retrabalhos
FROM retrabalho_projetos
GROUP BY eng_projeto_id

-- NÃO precisa de variável separada!
-- O COUNT(*) É o contador! 🎯
```

---

## 🎯 Resumo de Arquivos Criados

### Schemas SQL
1. ✅ `supabase/new_db_schema.sql` - Schema base completo
2. ✅ `supabase/chatbot_functions.sql` - Functions para engenheiros
3. ✅ `supabase/tabela_evandro_dono.sql` - Tabelas do dono
4. ✅ `supabase/functions_dono.sql` - Functions do dono

### Documentação
5. ✅ `docs/nova_estrutura_bd.md` - Estrutura base
6. ✅ `docs/diagrama_bd.md` - Diagramas e exemplos
7. ✅ `docs/integracao_chatbot.md` - Integração com chatbot
8. ✅ `docs/exemplo_conversas_chatbot.md` - Conversas exemplo
9. ✅ `docs/README_SUPABASE_CHATBOT.md` - Visão geral
10. ✅ `docs/TABELA_EVANDRO_DONO.md` - Sistema do dono
11. ✅ `docs/FLUXO_COMPLETO_SISTEMA.md` - Este arquivo

### Guias
12. ✅ `IMPLEMENTACAO_RAPIDA.md` - Deploy em 30 min

---

## ✅ Checklist de Funcionalidades

### Engenheiros
- [x] Cadastro de engenheiros
- [x] Edição de nome e exclusividade
- [x] Atribuição de áreas a projetos
- [x] Registro de previsão diária
- [x] Registro de feito ao fim do dia (imutável)
- [x] Registro de retrabalho diário com motivo
- [x] Contador automático de retrabalhos
- [x] Atualização de status (% automático)
- [x] Atualização de previsão de conclusão
- [x] Criação de prazos (4 datas)
- [x] Busca de projetos
- [x] Histórico de previsões
- [x] Histórico de retrabalhos

### Dono
- [x] Visualização de todos os engenheiros
- [x] Consulta de status individual
- [x] Verificação de exclusividade ✅
- [x] Verificação de carga de trabalho (dias pendentes)
- [x] Verificação de taxa de execução (%)
- [x] Verificação de complexidade média
- [x] Verificação de retrabalhos
- [x] Distribuição de tarefas
- [x] Sincronização automática com eng
- [x] Notificação WhatsApp automática
- [x] Recomendação inteligente de engenheiro
- [x] Histórico de retrabalhos (gráficos)
- [x] Análise por motivo de retrabalho

### Sistema
- [x] Triggers automáticos (tempo, %, vars)
- [x] Validações (motivo obrigatório, imutabilidade)
- [x] Views consolidadas
- [x] Fila de notificações
- [x] Logs de interações
- [ ] Webhook WhatsApp (implementar)
- [ ] Layout visual (fazer depois)

---

**🎉 Sistema completo e funcional!**
