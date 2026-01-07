# 📱 Guia de Uso - Sistema de Notificações Automáticas

## 🎯 Visão Geral

O sistema envia **2 notificações automáticas por dia** para cada projeto ativo:
- 🌅 **Manhã (09:00):** Status + Previsão do dia
- 🌙 **Noite (17:00):** Feito + Retrabalho + Etapa + Observações

---

## 🚀 Como Funciona

### 1. Cadastrar Novo Projeto

**Comando:** Digite `projeto` no WhatsApp

**Fluxo:**
```
1. Escolha: Cadastrar novo projeto
2. Digite: Nome do cliente
3. Digite: Contato do cliente
4. Escolha: Tipo de obra (casa/prédio/comercial/misto)
5. Escolha: Área (21 opções)
6. Escolha: Tipo de projeto (24 opções)
   → Descrição gerada automaticamente
7. Digite: Data de previsão interna (DD/MM/AAAA)
8. Digite: Data final cliente (DD/MM/AAAA)
9. Confirme

✅ Projeto criado com código PRJ-XXX
```

**Campos automáticos gerados:**
- Código: PRJ-001, PRJ-002...
- Descrição: Conforme tipo escolhido
- Data de início: Data do cadastro
- Prazo interno: Calculado em dias úteis
- Prazo cliente: Calculado em dias úteis
- Dias de atraso: 0 (inicial)

---

### 2. Notificação Matinal (09:00)

**Você receberá automaticamente:**
```
🌅 Notificação Matinal

📊 Projeto: PRJ-004 - Empresa ABC
🏗️ Obra: prédio
📍 Status atual: em execução

Por favor, atualize:
1️⃣ Status do projeto
2️⃣ Previsão para o dia

Responda a esta mensagem para iniciar
```

**Responda qualquer coisa para iniciar o fluxo:**

```
Você: ok

Bot: 📌 Qual o STATUS atual do projeto?
     1️⃣ aguardando início
     2️⃣ aguardando inf. cliente
     3️⃣ em execução
     4️⃣ em aprovação
     5️⃣ parado cliente
     6️⃣ parado tecpred
     7️⃣ concluído

Você: 3

Bot: ✅ Status: em execução
     
     📝 PREVISÃO PARA O DIA
     O que você planeja realizar hoje?
     
     1️⃣ Realizar pré-dimensionamento
     2️⃣ Realizar traçado preliminar
     3️⃣ Dimensionar ramais principais
     4️⃣ Dimensionar quadros/painéis/coletores
     5️⃣ Executar levantamento de cargas
     6️⃣ Gerar prancha de lançamento
     7️⃣ Realizar detalhamento final
     8️⃣ Conferir normas e requisitos
     9️⃣ Completar 50% do detalhamento
     🔟 Finalizar circuito/ramal X
     1️⃣1️⃣ Ajustar compatibilização com área elétrica/hidráulica
     1️⃣2️⃣ Preparar material para revisão interna
     1️⃣3️⃣ Revisar desvios encontrados no projeto

Você: 7

Bot: ✅ Previsão registrada
     
     📋 CONFIRMAÇÃO
     🆔 Projeto: PRJ-004
     📊 Status: em execução
     📝 Previsão: Realizar detalhamento final
     
     Confirma os dados?
     1️⃣ Sim, salvar
     2️⃣ Não, cancelar

Você: 1

Bot: ✅ Atualização matinal salva!
     
     Tenha um ótimo dia! 🌟
```

---

### 3. Notificação Noturna (17:00)

**Você receberá automaticamente:**
```
🌙 Notificação Noturna

📊 Projeto: PRJ-004 - Empresa ABC
🏗️ Obra: prédio
📍 Etapa atual: Detalhamento e instalações

Por favor, registre:
1️⃣ O que foi feito hoje
2️⃣ Houve retrabalho?
3️⃣ Etapa atual
4️⃣ Observações (obrigatório)

Responda a esta mensagem para iniciar
```

**Responda qualquer coisa para iniciar o fluxo:**

```
Você: ok

Bot: ✔️ O que foi FEITO ao final do dia?
     
     1️⃣ Pré-dimensionamento finalizado
     2️⃣ Traçado preliminar concluído
     3️⃣ Dimensionamento dos ramais principais concluído
     4️⃣ Prancha X finalizada
     5️⃣ Revisão interna submetida
     6️⃣ Compatibilização concluída
     7️⃣ Detalhamento 70% executado
     8️⃣ Cálculo de carga concluído
     9️⃣ Revisões internas aplicadas

Você: 7

Bot: ✅ Feito registrado
     
     🔄 Necessitou de RETRABALHO?
     1️⃣ Sim
     2️⃣ Não

Você: 2

Bot: ✅ Sem retrabalho
     
     📍 Qual a ETAPA atual do projeto?
     1️⃣ Aguardando início
     2️⃣ Recebimento da documentação
     3️⃣ Serviços Preliminares e Infraestrutura
     4️⃣ Instalações de Primeira Fase (Grosso)
     5️⃣ Detalhamento e instalações
     6️⃣ Instalações de Segunda Fase (Acabamento)
     7️⃣ Revisão interna
     8️⃣ Enviado ao cliente
     9️⃣ Aprovado cliente/concessionária
     🔟 Concluído

Você: 5

Bot: ✅ Etapa: Detalhamento e instalações
     
     📝 OBSERVAÇÕES sobre o dia (OBRIGATÓRIO)
     
     Digite suas observações sobre o dia de trabalho:
     
     Mínimo 5 caracteres

Você: abc

Bot: ❌ Observações são OBRIGATÓRIAS!
     
     Digite pelo menos 5 caracteres descrevendo o dia de trabalho.
     
     Este campo não pode ser pulado na atualização noturna.

Você: Detalhamento da prancha 3 concluído, iniciada prancha 4

Bot: ✅ Observações registradas
     
     📋 CONFIRMAÇÃO
     🆔 Projeto: PRJ-004
     ✔️ Feito: Detalhamento 70% executado
     🔄 Retrabalho: não
     📍 Etapa: Detalhamento e instalações
     📝 Observações: Detalhamento da prancha 3 concluído...
     
     Confirma os dados?
     1️⃣ Sim, salvar
     2️⃣ Não, cancelar

Você: 1

Bot: ✅ Atualização noturna salva!
     
     🆔 Projeto: PRJ-004
     ✔️ Feito: Detalhamento 70% executado
     🔄 Retrabalho: não
     📍 Etapa: Detalhamento e instalações
     
     Até amanhã! 🌙
```

---

## ⚠️ REGRAS IMPORTANTES

### Campos Obrigatórios

#### Notificação Matinal:
- ✅ Status do projeto
- ✅ Previsão para o dia

#### Notificação Noturna:
- ✅ Feito ao final do dia
- ✅ Necessitou de retrabalho? (sim/não)
- ✅ Etapa atual
- ✅ **Observações (mínimo 5 caracteres)** ← NÃO PODE PULAR

#### Campos Condicionais:
- Motivo da revisão → Só aparece se retrabalho = SIM

#### Campos Automáticos:
- Data do registro do retrabalho → Preenchida automaticamente
- % executado → Preenchido automaticamente conforme etapa

---

## 📊 Menus Dinâmicos

### Previsão para o Dia

As opções mudam conforme o **status do projeto**:

**Status: aguardando início** (6 opções)
```
1. Revisar documentação enviada pelo cliente
2. Solicitar planta baixa/arquitetônico
3. Checar compatibilização com disciplinas
4. Preparar checklist de requisitos técnicos
5. Confirmar briefing com o cliente
6. Organizar arquivos e criar pasta do projeto
```

**Status: em execução** (13 opções)
```
1. Realizar pré-dimensionamento
2. Realizar traçado preliminar
3. Dimensionar ramais principais
... (13 opções no total)
```

**Status: em aprovação** (5 opções)
```
1. Enviar projeto revisado ao cliente
2. Responder observações pendentes do cliente
... (5 opções no total)
```

E assim por diante para cada status.

### Feito ao Final do Dia

As opções também mudam conforme o **status do projeto**:

**Status: aguardando início** (4 opções)
```
1. Checklist inicial concluído
2. Documentação solicitada ao cliente
3. Arquitetônico recebido e validado
4. Pasta do projeto criada e organizada
```

**Status: em execução** (9 opções)
```
1. Pré-dimensionamento finalizado
2. Traçado preliminar concluído
... (9 opções no total)
```

---

## 🧪 Como Testar

### Teste Rápido (Terminal)

```bash
npm run test:notifications
```

Escolha:
- **Opção 3:** Listar projetos ativos
- **Opção 5:** Validar campos obrigatórios
- **Opção 1:** Testar fluxo matinal (interativo)
- **Opção 2:** Testar fluxo noturno (interativo)

### Teste de Disparo Manual

```bash
npm run test:notifications
# Escolha opção 4
# Escolha 1 (matinal) ou 2 (noturna)
```

### Teste em Produção

```bash
npm run dev
```

Aguarde 09:00 ou 17:00 (seg-sex) e veja as notificações chegarem automaticamente!

---

## 🔧 Configuração

### Variáveis de Ambiente

Certifique-se de ter no `.env`:

```env
# Google Sheets
GOOGLE_SHEETS_ENGINEER_ID=...
GOOGLE_SHEETS_ENGINEER_NAME=Engenheiro(a)
GOOGLE_SHEETS_ENGINEER_RANGE=A1:AE1000

# OpenAI (para outros fluxos)
OPENAI_API_KEY=...

# Credenciais Google
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
```

### Iniciar Sistema

```bash
# Desenvolvimento (com hot reload)
npm run dev

# Produção
npm start
```

**Logs esperados:**
```
🚀 Iniciando Chatbot WhatsApp + Google Sheets...

✅ WhatsApp conectado!

⏰ Iniciando sistema de notificações automáticas...

✅ Cron Jobs iniciados com sucesso!

📅 Agendamentos configurados:
   🌅 Notificação Matinal:  09:00 (seg-sex)
   🌙 Notificação Noturna:  17:00 (seg-sex)
   🌍 Timezone: America/Sao_Paulo

✅ Sistema completo iniciado com sucesso!
```

---

## 🐛 Problemas Comuns

### Notificações não são enviadas

**Causa:** Nenhum projeto ativo  
**Solução:** Cadastre projetos com status diferente de "concluído"

### Menu dinâmico vazio

**Causa:** Status do projeto não reconhecido  
**Solução:** Verifique se o status está exatamente como nas constantes (lowercase)

### Observações podem ser puladas

**Causa:** Fluxo errado sendo usado  
**Solução:** Certifique-se de usar `NotificacaoNoturnaFlow` para notificações noturnas

### Cron não dispara

**Causa:** Timezone incorreto ou sistema não rodando  
**Solução:** 
- Verifique timezone: `America/Sao_Paulo`
- Mantenha bot rodando 24/7

---

## 📞 Comandos Úteis

### Cancelar Fluxo
```
Digite: cancelar
```

### Ver Menu
```
Digite: menu
```

### Ver Ajuda
```
Digite: ajuda
```

---

## 🎯 Dicas de Uso

1. **Responda às notificações assim que receber** para manter histórico atualizado
2. **Use os menus de opções** sempre que possível (mais rápido que digitar)
3. **Observações são importantes** - descreva o que foi feito, problemas encontrados, etc
4. **Se teve retrabalho**, seja específico no motivo para análises futuras
5. **Mantenha o status atualizado** para que os menus dinâmicos sejam relevantes

---

## 📊 Exemplo Completo

### Dia 1 - Cadastro

```
09:00 - Você: projeto
        Bot: [Fluxo de cadastro]
        Você: [Preenche todos os campos]
        Bot: ✅ Projeto PRJ-005 criado!
```

### Dia 2 - Primeira Notificação

```
09:00 - Bot: 🌅 Notificação Matinal - PRJ-005
        Você: ok
        Bot: [Status?]
        Você: 3 (em execução)
        Bot: [Previsão?]
        Você: 1 (Realizar pré-dimensionamento)
        Bot: ✅ Atualização matinal salva!

17:00 - Bot: 🌙 Notificação Noturna - PRJ-005
        Você: ok
        Bot: [Feito?]
        Você: 1 (Pré-dimensionamento finalizado)
        Bot: [Retrabalho?]
        Você: 2 (Não)
        Bot: [Etapa?]
        Você: 3 (Serviços Preliminares)
        Bot: [Observações?]
        Você: Pré-dimensionamento concluído sem problemas
        Bot: ✅ Atualização noturna salva!
```

### Dia 3 - Continuação

```
09:00 - Bot: 🌅 Notificação Matinal - PRJ-005
        [Repete o fluxo...]

17:00 - Bot: 🌙 Notificação Noturna - PRJ-005
        [Repete o fluxo...]
```

---

## 🎓 Perguntas Frequentes

### Posso ter múltiplos projetos?

Sim! Você receberá uma notificação para CADA projeto ativo.

Exemplo:
- PRJ-001 (ativo)
- PRJ-002 (ativo)
- PRJ-003 (concluído)

Você receberá 2 notificações matinais (09:00) e 2 notificações noturnas (17:00).

### O que acontece se eu não responder?

Nada! A notificação fica aguardando sua resposta. Você pode responder a qualquer momento.

### Posso cancelar no meio do fluxo?

Sim! Digite `cancelar` a qualquer momento.

### Posso editar depois de salvar?

Sim! Use o comando `atualizar projeto` e escolha o projeto para fazer nova atualização.

### O que são "dias úteis"?

Dias úteis = dias de segunda a sexta (excluindo sábados e domingos).

Exemplo:
- Início: 18/12/2024 (quarta)
- Fim: 23/12/2024 (segunda)
- Dias úteis: 3 (qui, sex, seg)

---

## 📚 Documentação Completa

- **SISTEMA-NOTIFICACOES.md** - Documentação técnica da implementação
- **COMECE-AQUI.md** - Guia de início rápido
- **README.md** - Visão geral do sistema

---

_Guia criado em: Dezembro 2024_  
_Versão: 1.0_

