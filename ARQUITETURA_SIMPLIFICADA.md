# 🏗️ Arquitetura Simplificada do Chatbot

**Versão:** 2.0.0  
**Data:** 2025-01-07

---

## 🎯 Visão Geral

Sistema de chatbot WhatsApp focado em **fluxos guiados via menus numerados** para gestão de projetos de engenharia.

---

## 📊 Arquitetura de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                    WHATSAPP MESSAGE                          │
│                    (Texto ou Áudio)                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────────────────────────────────────────┐
│                      SHEETSBOT.TS                             │
│                    (Entry Point)                              │
│                                                               │
│  ✅ Conecta WhatsApp                                         │
│  ✅ Processa áudio → Whisper → texto                         │
│  ✅ Comandos básicos (menu, ajuda)                           │
│  ✅ Despacha para MessageHandler                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────────────────────────────────────────┐
│                   MESSAGEHANDLER.TS                           │
│                    (Orquestrador)                             │
│                                                               │
│  ✅ Gerencia sessões (Map<whatsapp, session>)                │
│  ✅ Classifica intenção simples                              │
│  ✅ Ativa fluxo apropriado                                   │
│  ✅ Mantém contexto de notificações                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ↓                     ↓
┌───────────────────────┐   ┌──────────────────────┐
│ ENGINEERPROJECTFLOW   │   │  NOTIFICATIONFLOWS   │
│  (Principal)          │   │  (Via Cron)          │
│                       │   │                      │
│ ✅ Cadastrar projeto  │   │ ✅ Matinal           │
│ ✅ Atualizar manhã    │   │ ✅ Noturna           │
│ ✅ Atualizar noite    │   │                      │
│                       │   │ (Ativadas por cron   │
│ Menus numerados       │   │  jobs automáticos)   │
│ 11 steps (cadastro)   │   └──────────────────────┘
│ 3 steps (manhã)       │
│ 5 steps (noite)       │
└───────────┬───────────┘
            │
            ↓
┌──────────────────────────────────────────────────────────────┐
│               ENGINEERSHEETSERVICE.TS                         │
│                   (CRUD Planilha)                             │
│                                                               │
│  ✅ createProject()       - Criar novo projeto               │
│  ✅ updateMorningData()   - Atualizar manhã                  │
│  ✅ updateNightData()     - Atualizar noite                  │
│  ✅ listAllProjects()     - Listar projetos                  │
│  ✅ getProject()          - Buscar por código                │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ↓
┌──────────────────────────────────────────────────────────────┐
│                  GOOGLE SHEETS API                            │
│               (Planilha de Engenheiros)                       │
│                                                               │
│  Colunas: 31 campos (A até AE)                               │
│  Range: A2:AE1000                                            │
│  Aba: "Engenheiro(a)"                                        │
└──────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Estrutura de Diretórios

```
chatbot/
│
├── flows/
│   ├── ✅ engineerProjectFlow.ts      (ATIVO - principal)
│   ├── ✅ notificationFlows.ts        (ATIVO - cron jobs)
│   │
│   └── _archived/                     (NÃO USADOS - guardados)
│       ├── registerProgress.ts
│       ├── registerRework.ts
│       ├── checkStatus.ts
│       └── README.md
│
└── handlers/
    ├── ✅ sheetsBot.ts                (ATIVO - entry point)
    ├── ✅ messageHandler.ts           (ATIVO - orquestrador)
    ├── ✅ whisperService.ts           (ATIVO - áudio)
    │
    └── _archived/                     (NÃO USADOS - guardados)
        ├── queryService.ts            (Consultas via IA)
        ├── commandService.ts          (Comandos via IA)
        └── README.md
```

---

## 💬 Fluxos Conversacionais Ativos

### **1. EngineerProjectFlow**

#### **Modo: Cadastrar Novo Projeto**
```
Steps: 11
Duração: ~2-3 minutos

1. Cliente (texto livre)
2. Contato (texto livre)
3. Obra (menu 4 opções)
4. Área (menu 21 opções)
5. Tipo de Projeto (menu 24 opções → gera descrição automática)
6. Data Previsão Interna (DD/MM/AAAA)
7. Data Final Cliente (DD/MM/AAAA)
8. Confirmação
9. Salvar → Google Sheets
```

#### **Modo: Atualizar Manhã** 🌅
```
Steps: 3
Duração: ~1 minuto

1. Escolher projeto (lista numerada)
2. Status do projeto (menu 7 opções)
3. Previsão para o dia (menu dinâmico conforme status)
4. Confirmação
5. Salvar → Google Sheets
```

#### **Modo: Atualizar Noite** 🌙
```
Steps: 5
Duração: ~2 minutos

1. Escolher projeto (lista numerada)
2. Feito ao final do dia (menu dinâmico conforme status)
3. Necessitou de retrabalho? (sim/não)
   └─> Se sim: Motivo (menu 6 opções)
4. Etapa atual (menu 10 opções → % automático)
5. Observações (texto livre, OBRIGATÓRIO)
6. Confirmação
7. Salvar → Google Sheets
```

---

### **2. NotificationFlows**

#### **NotificacaoMatinalFlow** 🌅
```
Ativação: Cron job (ex: 8h00)
Bot envia: "Bom dia! Hora de atualizar [projeto]"

Steps: 2
1. Status do projeto
2. Previsão para o dia
3. Salvar
```

#### **NotificacaoNoturnaFlow** 🌙
```
Ativação: Cron job (ex: 18h00)
Bot envia: "Boa noite! Vamos registrar o dia [projeto]"

Steps: 4
1. Feito ao final do dia
2. Necessitou de retrabalho? + motivo
3. Etapa atual
4. Observações (obrigatório)
5. Salvar
```

---

## 🎮 Comandos Disponíveis

| Comando | Ação |
|---------|------|
| `menu`, `oi`, `olá`, `ajuda` | Mostra menu principal |
| `projeto`, `1` | Inicia fluxo de projetos |
| `cancelar` | Cancela fluxo atual |
| 🎤 Áudio | Transcreve e processa como texto |

---

## 📦 Dependências Ativas

### **Essenciais:**
- `whatsapp-web.js` - Conexão WhatsApp
- `dotenv` - Variáveis de ambiente
- `googleapis` - Google Sheets API
- `openai` - Whisper (transcrição de áudio)
- `typescript` - Linguagem

### **Opcionais (para cron):**
- `node-cron` - Agendamento de notificações

### **Não usadas mais (podem remover se quiser):**
- ❌ `axios` - Era usado por flows arquivados
- ❌ `@supabase/supabase-js` - Será usado na próxima fase

---

## 🔐 Variáveis de Ambiente Necessárias

```env
# Essenciais
OPENAI_API_KEY=sk-...                    (Whisper - áudio)
GOOGLE_SHEETS_ENGINEER_ID=...           (Planilha)
GOOGLE_SHEETS_ENGINEER_NAME=Engenheiro(a)
GOOGLE_SHEETS_ENGINEER_RANGE=A2:AE1000
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json

# Opcionais (não usadas ainda)
SUPABASE_URL=...                         (Próxima fase)
SUPABASE_SERVICE_ROLE_KEY=...           (Próxima fase)
```

---

## 🎯 Estado Atual vs Próximo Passo

### **Estado Atual:**
```
WhatsApp → Chatbot → Google Sheets (Engenheiro)
                          ↓
                      (manual ou script)
                          ↓
                   Google Sheets (CEO)
```

### **Próxima Fase (Supabase):**
```
WhatsApp → Chatbot → Supabase (Banco de Dados)
                          ↓
                    (sync automático)
                          ↓
                  ┌───────┴───────┐
                  ↓               ↓
         Google Sheets      Google Sheets
         (Engenheiro)         (CEO)
```

---

## 📝 Checklist de Funcionalidades

- [x] Fluxos guiados com menus numerados
- [x] Cadastrar novos projetos
- [x] Atualizar projetos (manhã/noite)
- [x] Notificações automáticas (via cron)
- [x] Processamento de áudio (Whisper)
- [x] Salvamento em Google Sheets
- [x] Validações de input
- [x] Cálculos automáticos (prazos, %, etapas)
- [ ] Conexão com Supabase (próxima fase)
- [ ] Sincronização automática (próxima fase)
- [ ] Consultas via IA (arquivado - pode reativar)
- [ ] Comandos de edição via IA (arquivado - pode reativar)

---

**Sistema funcionando e simplificado!** ✨

