# 📐 Regras de Negócio

## Criação de Projetos

### Campos Automáticos
- **Código do Projeto**: Gerado sequencialmente (PRJ-001, PRJ-002, ...)
- **Data de Início**: Data atual
- **Prazos**: Calculados automaticamente baseado nas datas informadas

### Campos Manuais
- Cliente, Contato, Obra, Área
- Tipo de Projeto
- Datas: Início, Previsão Interna, Cliente

### Cálculo de Prazos
- **Prazo Interno (dias úteis)**: Data Início → Data Previsão Interna
- **Prazo Cliente (dias úteis)**: Data Início → Data Cliente

## Notificações Diárias

### Manhã (Status + Previsão)
- **Status do Projeto**: Escolhido pelo usuário
- **Etapa**: Determinada automaticamente baseada no status
- **Previsão do Dia**: Texto livre

### Noite (Feito + Retrabalho)
- **Status do Projeto**: Escolhido pelo usuário
- **Etapa**: Determinada automaticamente baseada no status
- **Feito ao Final do Dia**: Texto livre
- **Retrabalho**: Sim/Não + Motivo (se sim)
- **Observações**: Texto livre

## Mapeamento Status → Etapa

| Status | Etapa Automática |
|--------|------------------|
| aguardando início | Projeto recebido, esperando documentação, reunião ou liberação |
| aguardando inf. Cliente | Aguardando documentação |
| em execução | Engenheiro está trabalhando ativamente no dimensionamento, traçado, pré-projeto ou detalhamento |
| em aprovação | Enviado ao cliente ou responsável; aguardando retorno |
| parado cliente | Aguarda informações, revisões ou decisões do cliente |
| parado tecpred | Aguarda decisão interna, aprovação técnica ou redistribuição |
| concluído | Finalizado e entregue |

## Edição de Projetos

- **Categorias**: Dados do Cliente, Datas e Prazos, Status e Etapa, Observações
- **Campos editáveis**: Qualquer campo dentro das categorias
- **Validação**: Aplicada antes de salvar

## Sincronização

- **Prioridade**: Supabase (armazenamento primário)
- **Frequência**: Automática a cada 5 minutos
- **Filtro**: Opcional por WhatsApp do engenheiro
- **Formato**: 31 colunas (A-AE) na planilha
