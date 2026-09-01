# Deploy Twilio + Railway - Resumo das Mudanças

## ✅ Implementação Concluída

Todas as mudanças necessárias foram implementadas para fazer o deploy no Railway com Twilio.

## 📋 Arquivos Criados

### 1. `src/server.ts` (NOVO)
Servidor HTTP Express com:
- Endpoint `/webhook/twilio` - recebe mensagens do Twilio via POST
- Endpoint `/health` - monitoramento de saúde do servidor
- Endpoint `/` - informações básicas do serviço
- Inicialização automática dos cron jobs para notificações
- Integração com `messageHandler` (mesma lógica do terminal)

### 2. `Procfile` (NOVO)
Arquivo de configuração do Railway:
```
web: npm start
```

### 3. `DEPLOY.md` (NOVO)
Guia completo de deploy com:
- Passo a passo Railway
- Configuração do Twilio
- Todas as variáveis de ambiente
- Troubleshooting
- Monitoramento

## 🔧 Arquivos Modificados

### 1. `package.json`
**Dependências adicionadas:**
- `express`: ^4.18.0 (servidor HTTP)
- `@types/express`: ^4.17.0 (tipagem TypeScript)

**Scripts atualizados:**
- `start`: `node dist/server.js` (produção)
- `dev`: `nodemon --exec ts-node --esm src/server.ts` (desenvolvimento)
- `dev:terminal`: `ts-node --esm tests/test-bot-completo.ts` (teste no terminal)

### 2. `tsconfig.json`
**Configurações ajustadas para build:**
- `noEmit: false` (permitir output)
- `module: "CommonJS"` (compatibilidade Railway)
- `allowImportingTsExtensions: false` (build correto)
- `resolveJsonModule: true` (importar JSON)
- Excluir testes do build

### 3. `integrations/whatsapp/whatsappService.ts`
**Adicionado TwilioWhatsAppProvider:**
- Classe completa para envio via Twilio API
- Autenticação com Basic Auth (Account SID + Auth Token)
- Normalização de números (formato `whatsapp:+5511999999999`)
- Suporte a 3 providers: `development`, `meta`, `twilio`

## 🚀 Como Usar

### Desenvolvimento Local

**Testar no terminal (como antes):**
```bash
npm run dev:terminal
```

**Testar servidor HTTP localmente:**
```bash
npm run dev
# Servidor roda em http://localhost:3000
```

### Deploy no Railway

**1. Criar conta e projeto:**
```bash
# Instalar CLI (opcional)
npm i -g @railway/cli
railway login
railway link
```

**2. Configurar variáveis de ambiente no Railway Dashboard:**
```env
# Obrigatórias
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+14155238886
```

**3. Fazer deploy:**
```bash
git add .
git commit -m "feat: adicionar servidor HTTP para Twilio"
git push origin main
```

Railway detecta automaticamente e faz deploy!

**4. Configurar webhook no Twilio:**
- URL: `https://seu-app.railway.app/webhook/twilio`
- Method: POST

**5. Testar:**
- Envie "oi" no WhatsApp para o número do Twilio
- Bot deve responder com o menu principal

## 📊 Arquitetura

```
WhatsApp → Twilio → Railway (Express) → messageHandler → Supabase
                                      ↓
                                  Cron Jobs
                                      ↓
                            Notificações (11:20, 16:30)
```

## ✨ Funcionalidades Mantidas

- ✅ Todos os fluxos conversacionais (criar, editar, notificações)
- ✅ Notificações automáticas (manhã 11:20, noite 16:30)
- ✅ Worker de notificações pendentes (a cada 1 minuto)
- ✅ Autenticação por WhatsApp
- ✅ Salvamento no Supabase
- ❌ Sincronização com Sheets (removida conforme solicitado)

## 🔍 Próximos Passos

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Testar localmente:**
   ```bash
   npm run dev
   ```

3. **Fazer commit e push:**
   ```bash
   git add .
   git commit -m "feat: preparar para deploy Railway + Twilio"
   git push
   ```

4. **Seguir o guia completo em:** [`DEPLOY.md`](DEPLOY.md)

## 📝 Notas Importantes

- O servidor Express **NÃO interfere** com o teste do terminal
- Você pode continuar usando `npm run test:bot-completo` para testes locais
- O `messageHandler` é o mesmo em ambos os casos
- Railway usa `npm start` (servidor HTTP)
- Desenvolvimento usa `npm run dev` (servidor HTTP) ou `npm run dev:terminal` (terminal)

## 💰 Custos Estimados

- **Railway:** $5 grátis/mês (suficiente para testes)
- **Twilio:** ~$0.01 por mensagem (~$10/mês para 1000 mensagens)
- **Supabase:** Plano Free suficiente para começar

**Total para testes:** ~$0/mês (usando créditos gratuitos)

---

**Dúvidas?** Consulte o [`DEPLOY.md`](DEPLOY.md) para guia completo passo a passo.
