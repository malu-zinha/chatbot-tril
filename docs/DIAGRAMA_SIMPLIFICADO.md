# 🎨 Diagrama Simplificado do Sistema

## 🏗️ Estrutura Geral

```
                    SISTEMA TECPRED
                    
┌─────────────┐                    ┌─────────────┐
│ ENGENHEIRO  │                    │    DONO     │
│   (Ana)     │                    │  (Evandro)  │
│             │                    │             │
│ 🔒 Acesso:  │                    │ 🔓 Acesso:  │
│ Só seus     │                    │   TUDO      │
│ projetos    │                    │             │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │ "Previsão de hoje"              │ "Atribuir E4 para Ana"
       │                                  │
       └──────────┬─────────────────────┘
                  │
                  ↓
         ┌────────────────┐
         │  CHATBOT LLM   │
         │  Interpreta    │
         └────────┬───────┘
                  │
     ┌────────────┴────────────┐
     │                         │
     ↓                         ↓
┌─────────────┐         ┌─────────────┐
│  Function   │         │  Function   │
│ Engenheiro  │         │    Dono     │
│             │         │             │
│ WHERE       │         │ SEM         │
│ eng_id=?    │         │ WHERE       │
└──────┬──────┘         └──────┬──────┘
       │                       │
       └──────────┬────────────┘
                  │
                  ↓
         ┌────────────────┐
         │  BANCO DADOS   │
         │   PostgreSQL   │
         │                │
         │  ⚡ Triggers:  │
         │  - Tempo AUTO  │
         │  - % AUTO      │
         │  - Sync AUTO   │
         └────────────────┘
```

---

## 📊 Tabelas Principais

```
TABELA CENTRAL: engenheiros_projetos
┌────────────────────────────────────────────────┐
│ eng_id (🔒 CHAVE DE ACESSO)                    │
│ projeto_id                                     │
│ area_id → tempo_trabalho_dias (AUTO)          │
│ status_id → percentual_andamento (AUTO)       │
└────────────────────────────────────────────────┘
          ↓            ↓            ↓
    ┌─────────┐  ┌──────────┐  ┌────────┐
    │Previsões│  │Retrabalhos│ │Prazos │
    │ Diárias │  │+ Contador │ │4 Datas │
    └─────────┘  └──────────┘  └────────┘
```

---

## 🔐 Controle de Acesso Visual

```
╔═══════════════════════════════════════════╗
║  ENGENHEIRO ANA (eng_id = 'ana-123')     ║
╚═══════════════════════════════════════════╝

Consulta: "Meus projetos"
         ↓
SELECT * FROM engenheiros_projetos
WHERE eng_id = 'ana-123'  🔒
         ↓
┌──────────────────────────────────┐
│ Retorna APENAS projetos da Ana:  │
│                                  │
│ ✅ PRJ-001 (Ana)                 │
│ ✅ PRJ-005 (Ana)                 │
│ ❌ PRJ-002 (João) ← BLOQUEADO    │
│ ❌ PRJ-003 (Maria) ← BLOQUEADO   │
└──────────────────────────────────┘


╔═══════════════════════════════════════════╗
║  DONO EVANDRO (dono_id = 'evandro')      ║
╚═══════════════════════════════════════════╝

Consulta: "Status de todos"
         ↓
SELECT * FROM engenheiros_projetos
-- SEM WHERE! 🔓
         ↓
┌──────────────────────────────────┐
│ Retorna TODOS os projetos:       │
│                                  │
│ ✅ PRJ-001 (Ana)                 │
│ ✅ PRJ-002 (João)                │
│ ✅ PRJ-003 (Maria)               │
│ ✅ PRJ-005 (Ana)                 │
│ ✅ TODOS ← ACESSO TOTAL          │
└──────────────────────────────────┘
```

---

## ⚡ Triggers Automáticos

```
1️⃣ ÁREA → TEMPO (AUTO)
   
   Atribui área: H4
        ↓
   Busca: SELECT tempo FROM areas WHERE codigo='H4'
        ↓
   Preenche: tempo_trabalho_dias = 17 ✅


2️⃣ STATUS → % (AUTO)
   
   Atualiza: status = EM_EXECUCAO
        ↓
   Busca: SELECT % FROM status WHERE codigo='EM_EXECUCAO'
        ↓
   Preenche: percentual_andamento = 50% ✅


3️⃣ DONO → ENGENHEIRO (AUTO)
   
   Dono distribui: tarefa para Ana
        ↓
   Cria em: engenheiros_projetos (Ana)
        ↓
   Cria em: notificacoes_whatsapp
        ↓
   WhatsApp para Ana ✅
```

---

## 🔄 Fluxo: Engenheiro Registra Previsão

```
1. Ana: "Previsão de hoje PRJ-001"
   ↓
2. Chatbot: Busca status atual (EM_EXECUCAO)
   ↓
3. Chatbot: Mostra 16 sugestões
   ↓
4. Ana: Escolhe "6" (Realizar traçado)
   ↓
5. INSERT projetos_previsao
   🔒 WHERE eng_id = 'ana' (validação)
   ↓
6. ⚡ TRIGGER: Preenche projeto_id e eng_id AUTO
   ↓
7. Chatbot: "✅ Previsão registrada!"
```

---

## 🔄 Fluxo: Dono Distribui Tarefa

```
1. Evandro: "Atribuir E4 para Ana"
   ↓
2. Chatbot: Busca area_id de E4
   ↓
3. INSERT evandro_distribuicao_tasks
   🔓 SEM filtro (dono vê tudo)
   ↓
4. ⚡ TRIGGER 1: Cria em engenheiros_projetos
   - eng_id = Ana
   - area_id = E4
   - tempo_trabalho_dias = 25 (AUTO!)
   ↓
5. ⚡ TRIGGER 2: Cria notificacao_whatsapp
   - eng_id = Ana
   - mensagem = "🆕 Nova Tarefa!"
   ↓
6. Webhook: Processa fila
   ↓
7. WhatsApp para Ana ✅
   ↓
8. Ana consulta: "Meus projetos"
   ↓
9. ✨ Nova tarefa JÁ aparece!
```

---

## 📊 22 Áreas → Tempo Automático

```
Engenheiro: "Atribuir H1"
    ↓
┌─────────────────────────┐
│ H1 → 4 dias AUTO        │
│ H2 → 4 dias AUTO        │
│ H3 → 13 dias AUTO       │
│ H4 → 17 dias AUTO       │
│ H5 → 19 dias AUTO       │
│ H6 → 21 dias AUTO       │
│ E1 → 4 dias AUTO        │
│ E2 → 15 dias AUTO       │
│ E3 → 20 dias AUTO       │
│ E4 → 25 dias AUTO ⭐    │
│ ... (mais 12 áreas)     │
└─────────────────────────┘
    ↓
Resultado: tempo_trabalho_dias = X (AUTO)
```

---

## 📊 7 Status → % Automático

```
Engenheiro: "Status = EM_EXECUCAO"
    ↓
┌──────────────────────────────┐
│ AGUARDANDO_INICIO → 0% AUTO  │
│ EM_EXECUCAO → 50% AUTO       │
│ PARADO_CLIENTE → 50% AUTO    │
│ PARADO_TECPRED → 50% AUTO    │
│ AGUARD_INF_CLI → 60% AUTO    │
│ EM_APROVACAO → 75% AUTO      │
│ CONCLUIDO → 100% AUTO        │
└──────────────────────────────┘
    ↓
Resultado: percentual_andamento = X% (AUTO)
```

---

## 🧮 Contador de Retrabalhos

```
Retrabalho #1: "Cliente mudou"
Retrabalho #2: "Erro no projeto"
Retrabalho #3: "Documentação errada"
    ↓
SELECT COUNT(*) 
FROM retrabalho_projetos
WHERE eng_projeto_id = 'abc'
  AND necessitou_retrabalho = TRUE
    ↓
Resultado: 3 retrabalhos ✅
(Calculado automaticamente!)
```

---

## 🎯 Resumo em 3 Pontos

```
1️⃣ ENGENHEIRO (🔒)
   - Vê APENAS seus projetos
   - WHERE eng_id = auth.uid()
   - Pode: registrar previsões, retrabalhos, atualizar status

2️⃣ DONO (🔓)
   - Vê TUDO
   - SEM filtros WHERE
   - Pode: distribuir tarefas, ver todos, recomendar

3️⃣ AUTOMÁTICO (⚡)
   - Área → Tempo (trigger)
   - Status → % (trigger)
   - Dono → Engenheiro (trigger + notificação)
   - Retrabalhos → Contador (VIEW)
```

---

**📚 Ver diagrama completo:** `DIAGRAMA_VISUAL_COMPLETO.md`

