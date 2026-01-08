# 📦 Flows Arquivados

Esta pasta contém **flows conversacionais não utilizados** que foram substituídos pelo `EngineerProjectFlow`.

## 📁 Flows Arquivados

### **RegisterProgressFlow** (`registerProgress.ts`)
- **Função:** Fluxo para registrar execução diária (% previsto, % realizado, observações)
- **Conectava com:** Supabase Edge Function `/registrarExecucao`
- **Por que foi arquivado:** Substituído pela atualização noturna do `EngineerProjectFlow`
- **Diferenças com o novo fluxo:**
  - Antigo: Conectava direto com Supabase
  - Novo: Salva no Google Sheets
- **Quando usar:** Se quiser implementar conexão direta com Supabase no futuro

### **RegisterReworkFlow** (`registerRework.ts`)
- **Função:** Fluxo dedicado para registrar retrabalhos
- **Conectava com:** Supabase Edge Function `/registrarRetrabalho`
- **Por que foi arquivado:** Pergunta de retrabalho já está integrada no `EngineerProjectFlow` (atualização noturna)
- **Diferenças:**
  - Antigo: Fluxo separado, muito detalhado
  - Novo: Integrado, mais simples
- **Quando usar:** Se precisar de fluxo de retrabalho muito detalhado e separado

### **CheckStatusFlow** (`checkStatus.ts`)
- **Função:** Fluxo para consultar status detalhado de projetos
- **Conectava com:** Supabase Edge Function `/statusProjeto`
- **Mostrava:** 
  - Progresso detalhado
  - Tendências (acelerando/desacelerando)
  - Estatísticas completas
  - Últimas execuções
  - Retrabalhos acumulados
- **Por que foi arquivado:** Sistema atual não tem funcionalidade de consulta de status
- **Quando usar:** Se quiser implementar dashboard de status via chatbot

---

## 🔄 Como Eram Ativados (Sistema Antigo)

Estes flows eram ativados pelo `messageHandler.ts` através dos métodos:

```typescript
// Linhas deletadas do messageHandler.ts:
private async iniciarFluxoExecucao(sessao: UserSession) {
  const flow = new RegisterProgressFlow(sessao.whatsapp);
  // ...
}

private async iniciarFluxoRetrabalho(sessao: UserSession) {
  const flow = new RegisterReworkFlow(sessao.whatsapp);
  // ...
}

private async iniciarFluxoStatus(sessao: UserSession) {
  const flow = new CheckStatusFlow(sessao.whatsapp);
  // ...
}
```

---

## 🎯 Sistema Atual

**Fluxo único:** `EngineerProjectFlow`
- Cadastrar novos projetos
- Atualizar manhã (status + previsão)
- Atualizar noite (feito + retrabalho + etapa + obs)

**Notificações:** `NotificationFlows`
- Matinal (via cron)
- Noturna (via cron)

---

## ⚠️ Nota Importante

Estes flows **dependem de Edge Functions do Supabase** que podem não estar implementadas ainda:
- `/registrarExecucao`
- `/registrarRetrabalho`
- `/statusProjeto`

Se quiser reativá-los, você precisará:
1. Implementar as Edge Functions correspondentes
2. Ou adaptar para salvar direto no Google Sheets (como o EngineerProjectFlow faz)

---

**Data de arquivamento:** 2025-01-07  
**Versão do sistema:** 2.0.0

