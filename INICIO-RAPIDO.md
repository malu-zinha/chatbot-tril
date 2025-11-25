# 🚀 Início Rápido: Sistema de Edição de Planilhas

## ⚡ Em 3 Passos

### 1️⃣ Configurar Variáveis de Ambiente

Adicione ao seu arquivo `.env`:

```env
# Já existentes (mantém como estão)
OPENAI_API_KEY=sua-chave
GOOGLE_SHEETS_ID=1ie_-khm3Me_DdVjDIUPXqDmUpJjQNy_xHHl5jiHk_60
GOOGLE_SHEETS_RANGE=A1:Z1000
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json

# NOVAS (adicione estas linhas)
GOOGLE_SHEETS_ENGINEER_SHEET=Engenheiro
GOOGLE_SHEETS_EVANDRO_SHEET=Evandro
```

### 2️⃣ Testar no Terminal (Sem WhatsApp)

```bash
npm run test:update
```

Digite um comando:
```
Mude o projeto PRJ-001 para Em Execução
```

O bot vai:
- Interpretar o comando
- Mostrar preview das mudanças
- Pedir confirmação
- Executar e sincronizar

### 3️⃣ Usar via WhatsApp

```bash
npm run dev
```

1. Escaneie QR Code
2. Envie: `Mude o PRJ-001 para Em Execução`
3. Bot mostra preview
4. Confirme com `sim`
5. Pronto! ✅

## 💬 Exemplos de Comandos

### Atualizar Status
```
Mude o projeto PRJ-001 para Em Execução
Atualize o status do PRJ-002 para Parado Cliente
```

### Adicionar Projeto
```
Adicione novo projeto: Cliente Alfa Ltda, Obra Predial, Área Elétrico
```

### Consultar (não altera nada)
```
Qual o status do projeto PRJ-001?
Quantos projetos em execução?
```

## 📚 Documentação Completa

- `GUIA-EDICAO-PLANILHAS.md` - Guia completo de uso
- `IMPLEMENTACAO-COMPLETA.md` - Detalhes técnicos
- `ENV_CONFIG.md` - Configuração de ambiente
- `README.md` - Visão geral

## 🆘 Ajuda Rápida

**No WhatsApp:**
```
menu
ajuda
```

**Dúvidas comuns:**

Q: Como sei se meu comando vai alterar dados?
R: O bot sempre mostra um PREVIEW antes de executar

Q: Posso cancelar após enviar um comando?
R: Sim! Responda "não" ou "cancelar"

Q: As mudanças são reversíveis?
R: Por enquanto não. Por isso há confirmação obrigatória

Q: Posso adicionar projetos?
R: Sim! O bot gera o próximo ID automaticamente

Q: E se eu errar a confirmação?
R: O comando só executa se você responder "sim" ou "confirmar"

## ✅ Status do Sistema

Todos os recursos implementados e testados:

- ✅ Edição via WhatsApp
- ✅ Comandos por texto e áudio
- ✅ Sincronização automática
- ✅ Sistema de confirmação
- ✅ Preview de mudanças
- ✅ Adicionar novos projetos
- ✅ Testes sem WhatsApp

**Sistema pronto para uso! 🎉**

