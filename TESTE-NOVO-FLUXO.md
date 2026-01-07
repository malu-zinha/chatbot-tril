# 🧪 TESTE DO NOVO FLUXO CONVERSACIONAL

## ✅ O QUE FOI FEITO

O `messageHandler` foi integrado ao `sheetsBot.ts`! Agora o bot tem **dois sistemas**:

1. **SISTEMA NOVO (Prioridade)**: Fluxos conversacionais guiados
   - Cadastrar/Atualizar projetos
   - Registrar execução
   - Registrar retrabalho
   - Consultar status

2. **SISTEMA ANTIGO (Fallback)**: Query/Command via IA
   - Perguntas em linguagem natural
   - Comandos de edição

---

## 🔄 COMO FUNCIONA AGORA

```
Mensagem → sheetsBot →
  [É menu/ajuda? → responde e para]
  [Tem confirmação pendente? → processa e para]
  [Tenta processar via messageHandler]
    ✅ Se processar → retorna resposta
    ❌ Se não processar → usa sistema antigo (IA)
```

---

## 🧪 TESTES PARA FAZER

### 1️⃣ **Teste: Novo Fluxo de Projeto**

**Envie:** `projeto`

**Esperado:**
```
👋 Olá! Bem-vindo ao sistema de gestão de projetos.

O que você gostaria de fazer?

1️⃣ Cadastrar novo projeto
2️⃣ Atualizar projeto existente

Digite o número da opção desejada.
```

Depois siga o fluxo com botões!

---

### 2️⃣ **Teste: Variações do Comando**

Teste diferentes formas:
- `cadastrar projeto`
- `novo projeto`
- `atualizar projeto`
- `criar projeto`

**Esperado:** Todas devem ativar o novo fluxo conversacional.

---

### 3️⃣ **Teste: Menu Continua Funcionando**

**Envie:** `menu`

**Esperado:** Menu do sheetsBot (com todas as opções)

---

### 4️⃣ **Teste: Sistema Antigo Ainda Funciona**

**Envie:** `Quantos projetos temos?`

**Esperado:** 
```
🤖 Analisando mensagem...
[Resposta com quantidade de projetos]
```

---

### 5️⃣ **Teste: Cancelar Fluxo**

1. **Envie:** `projeto`
2. Bot responde com opções
3. **Envie:** `cancelar`

**Esperado:**
```
❌ Fluxo cancelado.

Digite "menu" para ver as opções.
```

---

### 6️⃣ **Teste: Áudio**

1. Grave áudio: "projeto"
2. Bot transcreve
3. Deve ativar o fluxo de projeto

---

## 🔍 LOGS ESPERADOS

No terminal do bot, você verá:

```
🔄 Tentando processar via messageHandler...
✅ Processado via messageHandler
```

Ou, se não processar (ex: pergunta):

```
🔄 Tentando processar via messageHandler...
⚠️ MessageHandler não processou, usando sistema antigo...
```

---

## 🎯 CHECKLIST DE VALIDAÇÃO

- [ ] Comando `projeto` ativa o fluxo conversacional
- [ ] Fluxo mostra opções com botões (1️⃣, 2️⃣)
- [ ] Possível cancelar com `cancelar`
- [ ] Menu (`menu`, `oi`, `ajuda`) ainda funciona
- [ ] Sistema antigo (perguntas) ainda funciona
- [ ] Áudio funciona com transcrição + fluxo
- [ ] Logs mostram "processado via messageHandler"

---

## 🐛 TROUBLESHOOTING

### Bot não responde a "projeto"
**Causa:** messageHandler não está sendo chamado  
**Solução:** Verifique se o bot foi reiniciado após a modificação

### Mensagem "não entendi"
**Causa:** messageHandler não reconheceu o comando  
**Solução:** Use exatamente: `projeto`, `cadastrar projeto`, ou `atualizar projeto`

### Sistema antigo sempre é usado
**Causa:** Condição de verificação pode estar errada  
**Solução:** Verifique os logs. Se mostrar "não processou", o messageHandler está retornando "não entendi"

---

## 📝 PRÓXIMOS PASSOS

Depois de validar que o fluxo funciona:

1. ✅ Configurar variáveis da nova planilha (`.env`)
2. ✅ Compartilhar planilha com service account
3. ✅ Testar cadastro completo de projeto
4. ✅ Testar atualização de projeto existente
5. ✅ Validar dados na planilha

---

**Data da Integração:** 12 de Dezembro de 2024  
**Status:** ✅ Integrado e pronto para testes
