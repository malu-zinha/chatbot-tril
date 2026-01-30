# 🤖 WhatsApp Chatbot - Sistema de Gestão de Projetos

Bot de WhatsApp para gestão de projetos de engenharia, integrado com Google Sheets e Supabase.

## 🚀 Quick Start

### Desenvolvimento Local (Modo Teste)

1. **Clone e instale dependências:**
   ```bash
   cd chatbot-tril
   npm install
   ```

2. **Configure o .env:**
   ```bash
   cp .env.example .env
   # Edite o .env com suas credenciais
   ```

3. **Adicione credentials.json:**
   - Baixe do Google Cloud Console
   - Coloque na raiz do projeto

4. **Inicie o servidor:**
   ```bash
   npm run dev
   ```

5. **Teste o servidor:**
   ```bash
   curl http://localhost:3000/health
   ```

### Deploy em Produção (Railway + Twilio)

📖 **Veja o guia completo:** [DEPLOY_TWILIO_RAILWAY.md](./DEPLOY_TWILIO_RAILWAY.md)

**Resumo rápido:**

1. **Criar conta Twilio** e obter:
   - Account SID
   - Auth Token
   - Número WhatsApp (ou usar Sandbox)

2. **Deploy no Railway:**
   - Conectar repositório GitHub
   - Configurar variáveis de ambiente
   - Aguardar deploy

3. **Configurar Webhook do Twilio:**
   ```
   https://seu-projeto.up.railway.app/webhook/whatsapp
   ```

4. **Testar bot:**
   - Enviar mensagem para o número Twilio
   - Verificar logs no Railway

## 📁 Estrutura do Projeto

```
chatbot-tril/
├── src/
│   ├── index.ts              # Servidor WhatsApp Web (QR Code)
│   └── server-twilio.ts      # Servidor Twilio (Webhooks)
├── chatbot/
│   ├── handlers/             # Processadores de mensagens
│   └── flows/                # Fluxos conversacionais
├── integrations/
│   ├── whatsapp/             # Serviço WhatsApp (Twilio/Meta/Dev)
│   ├── sheets/               # Google Sheets API
│   ├── supabase/             # Supabase Database
│   ├── cron/                 # Notificações automáticas
│   └── notifications/        # Sistema de notificações
├── logic/                    # Lógica de negócio
└── supabase/                 # Scripts SQL e triggers
```

## 🔧 Modos de Operação

### Modo 1: WhatsApp Web (Local apenas)
- Requer QR Code scanning
- Usa `whatsapp-web.js`
- **NÃO funciona** em servidores sem interface gráfica
- Comando: `npm run dev:whatsapp-web`

### Modo 2: Twilio API (Produção recomendado)
- API REST via webhooks
- Funciona em qualquer servidor
- Custo: ~$0.005/mensagem
- Comando: `npm run dev`

### Modo 3: Meta WhatsApp Business API
- Para empresas com API oficial do WhatsApp
- Requer aprovação da Meta
- Configure `WHATSAPP_PROVIDER=meta`

## 🌍 Variáveis de Ambiente

### Obrigatórias

```env
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
GOOGLE_SHEETS_ENGINEER_ID=sua_planilha_id
GOOGLE_SHEETS_ENGINEER_NAME=nome_da_aba
```

### Recomendadas (Produção)

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_key
TWILIO_ACCOUNT_SID=seu_account_sid
TWILIO_AUTH_TOKEN=seu_auth_token
TWILIO_PHONE_NUMBER=seu_numero_whatsapp
WHATSAPP_PROVIDER=twilio
```

### Opcionais

```env
OPENAI_API_KEY=sk-proj-...  # Para transcrição de áudio
PORT=3000                     # Porta do servidor
```

## 📱 Comandos do Bot

Digite no WhatsApp:

- `menu` - Menu principal
- `ajuda` - Ajuda e informações
- `1` - Cadastrar novo projeto
- `2` - Atualizar projeto existente
- `3` - Visualizar informações (dono)
- `4` - Distribuir projetos (dono)

## 🔄 Notificações Automáticas

O bot envia notificações automáticas para os engenheiros:

- **09:00** (seg-sex): Notificação matinal
- **17:00** (seg-sex): Notificação noturna
- **A cada 1 min**: Worker processa notificações pendentes

## 🗄️ Banco de Dados

O sistema suporta dois modos:

### Modo 1: Google Sheets apenas
- Mais simples
- Boa para começar
- Limitado para grandes volumes

### Modo 2: Supabase + Google Sheets (Recomendado)
- Banco de dados PostgreSQL
- Google Sheets como visualização
- Sincronização automática a cada 5min
- Melhor performance e escalabilidade

## 🧪 Testes

```bash
# Testar conexão Supabase
npm run test:supabase

# Testar bot completo
npm run test:bot-completo

# Testar notificações
npm run test:notifications

# Verificar variáveis de ambiente
npm run check:env
```

## 📊 Endpoints da API

### GET /
Informações do sistema
```json
{
  "status": "online",
  "service": "Twilio WhatsApp Bot",
  "provider": "twilio",
  "database": "supabase"
}
```

### GET /health
Health check
```json
{
  "status": "ok",
  "timestamp": "2026-01-30T00:00:00.000Z"
}
```

### POST /webhook/whatsapp
Webhook para mensagens do Twilio
- Recebe: `From`, `Body`, `MessageSid`
- Retorna: TwiML com resposta

### POST /webhook/status
Webhook para status de mensagens
- Recebe: `MessageSid`, `MessageStatus`, `To`

## 🐛 Troubleshooting

### Servidor não inicia

```bash
# Verificar se a porta está em uso
lsof -ti:3000 | xargs kill

# Verificar variáveis de ambiente
npm run check:env
```

### Erro de Google Sheets

```bash
# Verificar credentials.json
ls -la credentials.json

# Verificar permissões
chmod 600 credentials.json
```

### Twilio não recebe mensagens

1. Verifique webhook no Console Twilio
2. Confirme que WHATSAPP_PROVIDER=twilio
3. Teste health check: `curl https://seu-dominio/health`
4. Verifique logs no Railway

## 📚 Documentação Adicional

- [DEPLOY_TWILIO_RAILWAY.md](./DEPLOY_TWILIO_RAILWAY.md) - Guia completo de deploy
- [DEPLOY.md](./DEPLOY.md) - Documentação técnica detalhada
- [docs/](./docs/) - Documentação da arquitetura

## 🤝 Contribuindo

Este é um projeto privado de gestão interna. Para contribuir:

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📄 Licença

Propriedade privada. Todos os direitos reservados.

## 💬 Suporte

Para dúvidas e suporte:
- Consulte a documentação em [DEPLOY_TWILIO_RAILWAY.md](./DEPLOY_TWILIO_RAILWAY.md)
- Verifique os logs no Railway Dashboard
- Entre em contato com o administrador do sistema
