# Guia Rápido de Teste - Sistema de Notificações

## 🚀 Antes de Começar

### 1. Aplicar Trigger SQL no Supabase

Acesse o Supabase SQL Editor e execute:

```sql
-- Cole o conteúdo completo do arquivo:
-- supabase/triggers_notificacao_novo_projeto.sql
```

### 2. Configurar .env para Desenvolvimento

```bash
# chatbot-tril/.env
WHATSAPP_PROVIDER=development
```

---

## 🧪 Testes Disponíveis

### Teste 1: Notificação Matinal

```bash
npm run test:notifications morning
```

**O que testa:**
- ✅ Busca engenheiros com projetos ativos no Supabase
- ✅ Agrupa projetos por engenheiro
- ✅ Formata mensagem consolidada
- ✅ Simula envio via WhatsApp (logs no console)

**Saída esperada:**
```
🌅 Iniciando notificações matinais...
📊 Engenheiros com projetos ativos: X
✅ Notificação matinal enviada: Nome do Engenheiro (Y projetos)
```

---

### Teste 2: Notificação Noturna

```bash
npm run test:notifications night
```

**O que testa:**
- ✅ Busca engenheiros com projetos ativos
- ✅ Agrupa projetos por engenheiro
- ✅ Formata mensagem noturna consolidada
- ✅ Simula envio via WhatsApp (logs no console)

**Saída esperada:**
```
🌙 Iniciando notificações noturnas...
📊 Engenheiros com projetos ativos: X
✅ Notificação noturna enviada: Nome do Engenheiro (Y projetos)
```

---

### Teste 3: Worker de Notificações Pendentes

```bash
npm run test:notifications worker
```

**O que testa:**
- ✅ Busca notificações pendentes em `notificacoes_whatsapp`
- ✅ Processa até 10 notificações
- ✅ Tenta enviar cada uma
- ✅ Marca como enviada se sucesso
- ✅ Incrementa tentativas se falha

**Saída esperada (sem pendentes):**
```
📬 Processando notificações pendentes...
(nenhuma saída = sem notificações pendentes)
```

**Saída esperada (com pendentes):**
```
📬 Processando 3 notificação(ões) pendente(s)...
   ✅ Notificação enviada: novo_projeto - 5511999999999
   ✅ Notificação enviada: novo_projeto - 5511888888888
✅ Enviadas: 2 | ❌ Falhas: 0
```

---

### Teste 4: Estatísticas

```bash
npm run test:notifications stats
```

**O que mostra:**
- 📬 Notificações pendentes
- ✅ Notificações enviadas (últimas 24h)
- ❌ Notificações falhadas (max tentativas)

**Saída esperada:**
```
📊 Estatísticas das Notificações

📈 Resumo:
   📬 Pendentes: 0
   ✅ Enviadas (24h): 5
   ❌ Falhadas: 0
```

---

## 🧪 Teste de Novo Projeto (Via Chatbot)

### 1. Iniciar chatbot em modo teste

```bash
npm run test:bot-completo
```

### 2. Login como Evandro (dono)

```
Digite seu número WhatsApp: 5511980614680
> oi
```

### 3. Distribuir um projeto

```
> 2  (Distribuir Projetos)
> 1  (Escolher engenheiro)
> 1  (Escolher projeto)
> 1  (Escolher área)
> ... (seguir fluxo até o final)
```

### 4. Verificar notificação criada

```bash
# Em outro terminal
npm run test:notifications stats
```

Deve mostrar `Pendentes: 1`

### 5. Processar notificação

```bash
npm run test:notifications worker
```

Deve enviar a notificação e mostrar log simulado.

---

## 🧪 Teste de Visualização de Projetos (Engenheiro)

### 1. Iniciar chatbot em modo teste

```bash
npm run test:bot-completo
```

### 2. Login como Engenheiro

```
Digite seu número WhatsApp: 5511912345678
> oi
```

### 3. Escolher opção de visualização

```
> 4  (Visualizar Meus Projetos)
```

**Saída esperada:**
```
📊 Meus Projetos (X)

1️⃣ PRJ-001 - Cliente A
   📦 Área: Elétrica
   📈 Status: Em Andamento
   ⚡ Andamento: 50%
   📅 Previsto: 25/01/2026

2️⃣ PRJ-002 - Cliente B
   ...

Digite o número para ver detalhes completos
Ou "menu" para voltar
```

### 4. Ver detalhes de um projeto

```
> 1
```

**Saída esperada:**
```
📊 Detalhes do Projeto

━━━━━━━━━━━━━━━━━━━━━
📋 Projeto: PRJ-001
👤 Cliente: Cliente A
📦 Área: Elétrica

━━━━━━━━━━━━━━━━━━━━━
📈 Status Atual

📊 Status: Em Andamento
⚡ Andamento: 50%

━━━━━━━━━━━━━━━━━━━━━
📅 Datas

📅 Início: 20/01/2026
⏰ Prazo: 25/01/2026

━━━━━━━━━━━━━━━━━━━━━

Digite "menu" para voltar ao menu principal
```

---

## ✅ Checklist de Validação

### Notificações Matinais
- [ ] Busca engenheiros com projetos ativos
- [ ] Agrupa múltiplos projetos em UMA mensagem
- [ ] Mensagem formatada corretamente
- [ ] Logs no console (modo dev)

### Notificações Noturnas
- [ ] Busca engenheiros com projetos ativos
- [ ] Agrupa múltiplos projetos em UMA mensagem
- [ ] Mensagem formatada corretamente
- [ ] Logs no console (modo dev)

### Worker de Notificações
- [ ] Busca notificações pendentes
- [ ] Processa fila corretamente
- [ ] Marca como enviada após sucesso
- [ ] Incrementa tentativas em falhas

### Trigger SQL (Novo Projeto)
- [ ] Cria notificação ao distribuir projeto
- [ ] Mensagem inclui todas as informações
- [ ] Notificação aparece como pendente
- [ ] Worker processa e envia

### Visualização de Projetos (Engenheiro)
- [ ] Menu mostra opção 4
- [ ] Lista todos os projetos do engenheiro
- [ ] Mostra informações resumidas corretas
- [ ] Permite ver detalhes de cada projeto
- [ ] Detalhes mostram todas as informações

---

## 🐛 Troubleshooting

### "Nenhum engenheiro com projetos ativos"
- Verifique se há projetos atribuídos em `engenheiros_projetos` com `ativo = true`
- Verifique se os projetos também têm `ativo = true` na tabela `projetos`

### "Notificação não foi criada"
- Verifique se o trigger SQL foi aplicado no Supabase
- Verifique logs do Supabase Functions/Logs
- Tente executar o trigger manualmente no SQL Editor

### "Erro ao buscar engenheiros"
- Verifique se o SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão corretos no .env
- Teste a conexão com: `npm run test:supabase`

### "Worker não processa notificações"
- Verifique se há notificações com `enviada = false` na tabela
- Verifique se `tentativas < 5`
- Execute manualmente: `npm run test:notifications worker`

---

## 📊 Monitoramento em Produção

Quando o sistema estiver em produção (`WHATSAPP_PROVIDER=meta`):

### Ver estatísticas
```bash
npm run test:notifications stats
```

### Forçar processamento de pendentes
```bash
npm run test:notifications worker
```

### Retentar notificações falhadas
```javascript
// No Node console ou script
const { getNotificationWorker } = require('./integrations/notifications/notificationWorker.ts');
await getNotificationWorker().retentarFalhadas();
```

### Limpar notificações antigas
```javascript
// No Node console ou script
const { getNotificationWorker } = require('./integrations/notifications/notificationWorker.ts');
await getNotificationWorker().limparNotificacoesAntigas();
```

---

## 🎯 Próximo Passo

Após validar tudo em modo development, configure para produção:

1. Obter credenciais do Meta Business Manager
2. Atualizar .env:
   ```bash
   WHATSAPP_PROVIDER=meta
   META_ACCESS_TOKEN=seu_token
   META_PHONE_NUMBER_ID=seu_id
   ```
3. Reiniciar sistema: `npm start`
4. Monitorar logs: `pm2 logs chatbot`

