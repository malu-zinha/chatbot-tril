-- =====================================================
-- SISTEMA DE STATUS E WORKFLOW
-- Com sugestões inteligentes para previsão e feito
-- =====================================================

# 📊 Sistema de Status e Workflow

## Visão Geral

Sistema completo de gerenciamento de status dos projetos com **sugestões automáticas** de atividades baseadas no workflow real da empresa.

---

## 🔄 Status Disponíveis (7)

### 1. **AGUARDANDO_INICIO** (0%)
**Significado:** Projeto recebido, esperando documentação, reunião ou liberação

**Previsões típicas:**
- Revisão de documentação enviada pelo cliente

**Feitos típicos:**
- Aguardando Início
- Checklist inicial concluído

---

### 2. **EM_EXECUCAO** (50%)
**Significado:** Engenheiro está trabalhando ativamente no dimensionamento, traçado, pré-projeto ou detalhamento

**Previsões típicas (16):**
1. Solicitar planta baixa/arquitetônico
2. Checar compatibilização com disciplinas
3. Preparar checklist de requisitos técnicos
4. Confirmar horário com o cliente
5. Organizar arquivos e criar pasta do projeto
6. Realizar pré-dimensionamento
7. Realizar traçado preliminar
8. Dimensionar ramais principais
9. Dimensionar quadros/painéis/coletores
10. Executar levantamento de cargas
11. Gerar prancha de lançamento
12. Realizar detalhamento final
13. Conferir normas e requisitos
14. Cumprir 50% do detalhamento
15. Finalizar detalhamento
16. Ajustar compatibilização com área elétrica/hidráulica

**Feitos típicos (12):**
1. Documentação solicitada ao cliente
2. Arquitetônico/técnico tramitado
3. Pasta do projeto criada e organizada
4. Pré-dimensionamento finalizado
5. Traçado preliminar concluído
6. Dimensionamento de ramais principais concluído
7. Prancha X finalizada
8. Revisão interna atendida
9. Compatibilização concluída
10. Detalhamento 70% executado
11. Cálculo de carga concluído
12. Revisões internas aplicadas

---

### 3. **PARADO_CLIENTE** (50%)
**Significado:** Aguarda informações, revisões ou decisões do cliente

**Previsões típicas (12):**
1. Preparar material para revisão interna
2. Revisar desvios encontrados no projeto
3. Enviar projeto revisado ao cliente
4. Responder observações pendentes do cliente
5. Realizar pequenas correções antes do envio
6. Registrar pendências do cliente para controle
7. Acompanhar retorno do cliente até 17h
8. Cobrar documentação pendente
9. Atualizar planilha com pendências do cliente
10. Enviar e-mail formal de solicitação de informações
11. Preparar relatório de pendências técnicas
12. Aguardar retorno da revisão do cliente

**Feitos típicos (11):**
1. Ajustes solicitados pelo cliente aplicados
2. Projeto reenviado para análise
3. Checklist de pendências atualizado
4. Checklist de revisão preenchido
5. E-mail de cobrança enviado
6. Contato telefônico realizado
7. Aguardando envio de plantas corrigidas
8. Cliente confirmou retorno para amanhã
9. Arquivos enviados ao cliente
10. Projeto arquivado
11. Checklist final concluído

---

### 4. **PARADO_TECPRED** (50%)
**Significado:** Aguarda decisão interna, aprovação técnica ou redistribuição

**Previsões típicas (5):**
1. Aguardar decisão interna
2. Aguardar retorno do Chefe
3. Analisar documentos e diagramas internos
4. Preparar justificativa técnica para decisão
5. Registrar motivo da pausa

**Feitos típicos (3):**
1. Aguardando validação do Engenheiro Chefe
2. Projeto revisado internamente, aguardando decisão
3. Pauta da reunião interna organizada

---

### 5. **AGUARDANDO_INF_CLIENTE** (60%)
**Significado:** Aguarda informações, revisões ou decisões do cliente

---

### 6. **EM_APROVACAO** (75%)
**Significado:** Para Aprovação significa que está responsável; aguardando retorno

**Previsões típicas (3):**
1. Conferir normas e requisitos
2. Cumprir 50% do detalhamento
3. Finalizar detalhamento

**Feitos típicos (4):**
1. Ajustes solicitados pelo cliente aplicados
2. Projeto reenviado para análise
3. Checklist de pendências atualizado
4. Checklist de revisão preenchido

---

### 7. **CONCLUIDO** (100%)
**Significado:** Finalizado e entregue

**Previsões típicas (4):**
1. Enviar arquivos finais
2. Organizar arquivos para arquivamento
3. Gerar versão final das pranchas
4. Subir documentação pro portal

**Feitos típicos (4):**
1. Finalizado e entregue
2. Arquivos enviados ao cliente
3. Projeto arquivado
4. Checklist final concluído

---

## 🤖 Como Funciona via Chatbot

### Cenário 1: Registrar Previsão com Sugestões

```
👤 "Previsão de hoje para o PRJ-001"

🤖 "Qual a previsão para hoje? Veja as sugestões baseadas no seu status atual (Em Execução):

📋 Sugestões:
1️⃣ Solicitar planta baixa/arquitetônico
2️⃣ Checar compatibilização com disciplinas
3️⃣ Preparar checklist de requisitos técnicos
4️⃣ Organizar arquivos e criar pasta do projeto
5️⃣ Realizar pré-dimensionamento
6️⃣ Realizar traçado preliminar
7️⃣ Dimensionar ramais principais
8️⃣ Gerar prancha de lançamento
... (mais 8 sugestões)

💡 Escolha um número ou descreva com suas palavras"

👤 "6"

🤖 "✅ Previsão registrada!
     📝 'Realizar traçado preliminar'
     📅 Data: 19/12/2025
     📊 Status: Em Execução (50%)"
```

---

### Cenário 2: Registrar Feito ao Fim do Dia

```
👤 "Feito do dia para PRJ-001"

🤖 "O que você conseguiu fazer hoje? Veja as sugestões baseadas no status (Em Execução):

✅ Sugestões:
1️⃣ Documentação solicitada ao cliente
2️⃣ Arquitetônico/técnico tramitado
3️⃣ Pasta do projeto criada e organizada
4️⃣ Pré-dimensionamento finalizado
5️⃣ Traçado preliminar concluído
6️⃣ Dimensionamento de ramais principais concluído
7️⃣ Prancha X finalizada
... (mais 5 sugestões)

💡 Escolha um número ou descreva com suas palavras"

👤 "Terminei 80% do traçado preliminar, falta finalizar o térreo"

🤖 "✅ Feito registrado!
     📝 'Terminei 80% do traçado preliminar, falta finalizar o térreo'
     🔒 Este registro agora é IMUTÁVEL (histórico)
     
     Nova previsão de conclusão?"

👤 "Amanhã"

🤖 "✅ Data prevista atualizada para 20/12/2025"
```

---

### Cenário 3: Projeto Parado no Cliente

```
👤 "Previsão de hoje PRJ-002"

🤖 "Status atual: PARADO_CLIENTE (50%)
     💡 Significado: Aguarda informações, revisões ou decisões do cliente
     
     Sugestões de previsão:
     1️⃣ Preparar material para revisão interna
     2️⃣ Revisar desvios encontrados no projeto
     3️⃣ Enviar projeto revisado ao cliente
     4️⃣ Cobrar documentação pendente
     5️⃣ Enviar e-mail formal de solicitação de informações
     6️⃣ Acompanhar retorno do cliente até 17h
     
     O que você planeja fazer hoje?"

👤 "4"

🤖 "✅ Previsão: 'Cobrar documentação pendente'
     
     💡 Dica: Ao fim do dia, registre se conseguiu contato com o cliente"

-- Fim do dia --

👤 "Feito PRJ-002"

🤖 "O que foi feito? Sugestões:
     1️⃣ E-mail de cobrança enviado
     2️⃣ Contato telefônico realizado
     3️⃣ Cliente confirmou retorno para amanhã
     4️⃣ Aguardando envio de plantas corrigidas"

👤 "1 e 2, cliente disse que envia amanhã"

🤖 "✅ Registrado: 'E-mail de cobrança enviado e contato telefônico realizado, cliente disse que envia amanhã'
     🔒 Imutável
     
     Manter previsão de conclusão?"
```

---

## 📊 Functions Disponíveis

### 1. **sugerir_previsoes_por_status(status_codigo)**
Retorna sugestões de previsão baseadas no status.

```sql
SELECT sugerir_previsoes_por_status('EM_EXECUCAO');
```

**Retorno:**
```json
{
  "status": "EM_EXECUCAO",
  "status_nome": "Em Execução",
  "significado": "Engenheiro está trabalhando ativamente...",
  "sugestoes": [
    {"ordem": 1, "atividade": "Solicitar planta baixa/arquitetônico"},
    {"ordem": 2, "atividade": "Checar compatibilização com disciplinas"},
    ...
  ]
}
```

---

### 2. **sugerir_feitos_por_status(status_codigo)**
Retorna sugestões de "feito" baseadas no status.

```sql
SELECT sugerir_feitos_por_status('PARADO_CLIENTE');
```

**Retorno:**
```json
{
  "status": "PARADO_CLIENTE",
  "status_nome": "Parado Cliente",
  "significado": "Aguarda informações, revisões...",
  "sugestoes": [
    {"ordem": 1, "atividade": "Ajustes solicitados pelo cliente aplicados"},
    {"ordem": 2, "atividade": "Projeto reenviado para análise"},
    ...
  ]
}
```

---

### 3. **registrar_previsao_dia_com_sugestoes()**
Registra previsão OU retorna sugestões se não fornecida.

```sql
-- Pedir sugestões
SELECT registrar_previsao_dia_com_sugestoes(
    p_atribuicao_id := 'uuid-atribuicao',
    p_previsao_texto := NULL -- NULL = retorna sugestões
);

-- Registrar escolhendo sugestão
SELECT registrar_previsao_dia_com_sugestoes(
    p_atribuicao_id := 'uuid-atribuicao',
    p_previsao_texto := 'Realizar traçado preliminar'
);
```

---

### 4. **atualizar_feito_dia_com_sugestoes()**
Registra feito OU retorna sugestões se não fornecido.

```sql
-- Pedir sugestões
SELECT atualizar_feito_dia_com_sugestoes(
    p_atribuicao_id := 'uuid-atribuicao',
    p_feito_texto := NULL
);

-- Registrar
SELECT atualizar_feito_dia_com_sugestoes(
    p_atribuicao_id := 'uuid-atribuicao',
    p_feito_texto := 'Traçado preliminar concluído',
    p_nova_data_prevista := '2025-12-25'
);
```

---

### 5. **listar_todos_status_com_info()**
Lista todos os status com informações completas.

```sql
SELECT listar_todos_status_com_info();
```

**Retorno:**
```json
{
  "sucesso": true,
  "total_status": 7,
  "status": [
    {
      "codigo": "AGUARDANDO_INICIO",
      "nome": "Aguardando Início",
      "percentual": 0.00,
      "ordem": 1,
      "significado": "Projeto recebido, esperando...",
      "qtd_sugestoes_previsao": 1,
      "qtd_sugestoes_feito": 2
    },
    ...
  ]
}
```

---

## 🎯 Vantagens do Sistema

✅ **Sugestões Contextuais** - Baseadas no status atual  
✅ **Padronização** - Atividades consistentes entre engenheiros  
✅ **Agilidade** - Engenheiro escolhe número ao invés de digitar  
✅ **Flexibilidade** - Pode digitar texto livre também  
✅ **Histórico Confiável** - Atividades padronizadas facilitam análise  
✅ **Onboarding Fácil** - Novos engenheiros veem o que fazer  

---

## 📈 Estatísticas

| Status | Sugestões Previsão | Sugestões Feito |
|--------|-------------------|-----------------|
| Aguardando Início | 1 | 2 |
| Em Execução | 16 | 12 |
| Parado Cliente | 12 | 11 |
| Parado TecPred | 5 | 3 |
| Aguardando Inf. Cliente | 0 | 0 |
| Em Aprovação | 3 | 4 |
| Concluído | 4 | 4 |
| **TOTAL** | **41** | **36** |

---

## 🔍 Views Disponíveis

### vw_sugestoes_previsao
```sql
SELECT * FROM vw_sugestoes_previsao
WHERE status_codigo = 'EM_EXECUCAO';
```

### vw_sugestoes_feito
```sql
SELECT * FROM vw_sugestoes_feito
WHERE status_codigo = 'PARADO_CLIENTE';
```

### vw_significado_status
```sql
SELECT * FROM vw_significado_status;
```

---

## 🚀 Implementação

### Passo 1: Executar Seeds
```sql
-- 1. Executar seed_status_detalhado.sql
-- Cria status e detalhamentos

-- 2. Executar functions_sugestoes_status.sql
-- Cria functions de sugestões
```

### Passo 2: Verificar
```sql
-- Deve retornar 7 status
SELECT COUNT(*) FROM status_codes;

-- Deve retornar ~80 detalhamentos
SELECT COUNT(*) FROM status_detalhamento;

-- Ver distribuição
SELECT 
    status_codigo,
    COUNT(*) FILTER (WHERE tipo = 'PREVISAO') AS previsoes,
    COUNT(*) FILTER (WHERE tipo = 'FEITO') AS feitos
FROM status_detalhamento
GROUP BY status_codigo;
```

### Passo 3: Testar via Chatbot
```
Engenheiro: "Previsão de hoje"
Bot: [chama sugerir_previsoes_por_status]
     [mostra sugestões numeradas]
Engenheiro: "3"
Bot: [registra previsão escolhida]
```

---

## ✅ Checklist

- [x] 7 status principais cadastrados
- [x] 77 sugestões de atividades cadastradas
- [x] Functions de sugestões criadas
- [x] Views de consulta criadas
- [x] Documentação completa
- [ ] Testado no Supabase
- [ ] Integrado ao chatbot
- [ ] Testado com usuários reais

---

**🎯 Sistema de workflow completo e inteligente!**




