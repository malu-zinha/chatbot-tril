# 🚀 Início Rápido - Sistema Simplificado

## ✅ Pré-requisitos

- Node.js v18+
- Credenciais Google Sheets (credentials.json)
- Chave OpenAI (para Whisper - áudio)
- WhatsApp ativo

---

## 📦 1. Instalar Dependências

\`\`\`bash
npm install
\`\`\`

---

## ⚙️ 2. Configurar .env

Crie arquivo \`.env\` na raiz:

\`\`\`env
# OpenAI (Whisper para áudio)
OPENAI_API_KEY=sk-...

# Google Sheets
GOOGLE_SHEETS_ENGINEER_ID=id-da-planilha
GOOGLE_SHEETS_ENGINEER_NAME=Engenheiro(a)
GOOGLE_SHEETS_ENGINEER_RANGE=A2:AE1000
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
\`\`\`

---

## ▶️ 3. Iniciar Bot

\`\`\`bash
npm run dev
\`\`\`

**Resultado esperado:**
\`\`\`
🚀 Iniciando Chatbot WhatsApp + Google Sheets...
✅ MessageHandler integrado
✅ Fluxo principal: EngineerProjectFlow
✅ Notificações: Matinal e Noturna (via cron)
📱 Escaneie o QR Code:
[QR Code aparece no terminal]
\`\`\`

---

## 📱 4. Conectar WhatsApp

1. Abra WhatsApp no celular
2. Vá em **Configurações** → **Aparelhos Conectados**
3. Escaneie o QR Code que apareceu no terminal
4. Aguarde: **"✅ WhatsApp conectado!"**

---

## 🧪 5. Testar

Envie mensagem para o número do WhatsApp conectado:

### **Teste 1: Menu**
\`\`\`
Você: "menu"

Bot: 👋 Olá! Bem-vindo ao Sistema de Gestão de Projetos

📊 MODIFICAR PROJETOS (Engenheiros)
   Cadastrar novos ou atualizar diariamente
   Digite: 1 ou projeto
   
   Atualizações diárias:
   🌅 Manhã: Status + Previsão do dia
   🌙 Noite: Feito + Retrabalho + Etapa + Obs

🔔 NOTIFICAÇÕES AUTOMÁTICAS:
   Você receberá lembretes automáticos...

Digite "projeto" para começar
\`\`\`

### **Teste 2: Iniciar Fluxo**
\`\`\`
Você: "projeto"

Bot: 👋 Olá!

📊 Gestão de Projetos de Engenharia

O que você quer fazer?

1️⃣ Cadastrar novo projeto
2️⃣ Atualizar projeto existente

Digite o número da opção
\`\`\`

### **Teste 3: Áudio**
\`\`\`
Você: [grava áudio falando "menu"]

Bot: 🎤 Transcrevendo áudio...
Bot: 📝 Você disse: "menu"
Bot: [Mostra menu]
\`\`\`

---

## ✅ Checklist Pós-Instalação

- [ ] Bot iniciou sem erros
- [ ] QR Code apareceu
- [ ] WhatsApp conectado
- [ ] Comando "menu" funciona
- [ ] Comando "projeto" funciona
- [ ] Áudio funciona (opcional)

---

## 🐛 Troubleshooting

### **Erro: "OPENAI_API_KEY não configurado"**
→ Adicione a chave no \`.env\`

### **Erro: "GOOGLE_SHEETS_ID não configurado"**
→ Adicione o ID da planilha no \`.env\`

### **Erro: "credentials.json not found"**
→ Baixe as credenciais do Google Cloud e coloque na raiz

### **QR Code não aparece**
→ Verifique se a porta não está em uso

### **WhatsApp não conecta**
→ Delete pasta \`.wwebjs_auth\` e tente novamente

---

## 📚 Próximos Passos

1. ✅ Sistema funcionando
2. ⏳ Aplicar migration do Supabase
3. ⏳ Conectar banco de dados
4. ⏳ Configurar sincronizações automáticas

---

## 📖 Documentação Completa

- **ARQUITETURA_SIMPLIFICADA.md** - Arquitetura do sistema
- **LIMPEZA_REALIZADA.md** - O que foi limpo
- **ANTES_DEPOIS_LIMPEZA.md** - Comparação visual
- **chatbot/handlers/_archived/README.md** - Como reativar IA
- **chatbot/flows/_archived/README.md** - Flows arquivados

---

**Sistema pronto para uso!** 🎉
