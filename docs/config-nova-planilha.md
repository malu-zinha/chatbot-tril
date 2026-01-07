# Configuração da Nova Planilha de Engenheiros

## Variáveis de Ambiente Necessárias

Para usar o novo fluxo de gestão de projetos, adicione as seguintes variáveis ao seu arquivo `.env`:

```env
# =====================================================
# GOOGLE SHEETS - NOVA PLANILHA DE ENGENHEIROS
# (Para o novo fluxo de cadastro/atualização de projetos)
# =====================================================

# ID da nova planilha (extrair da URL do Google Sheets)
# Exemplo: https://docs.google.com/spreadsheets/d/[ID_AQUI]/edit
GOOGLE_SHEETS_ENGINEER_ID=your_spreadsheet_id_here

# Nome da aba na planilha (conforme as imagens fornecidas)
GOOGLE_SHEETS_ENGINEER_NAME=Engenheiro(a)

# Range de células a serem lidas (A até AE, até linha 1000)
GOOGLE_SHEETS_ENGINEER_RANGE=A1:AE1000
```

## Como Obter o ID da Planilha

1. Abra a planilha no Google Sheets
2. Copie a URL da barra de endereço
3. A URL tem o formato: `https://docs.google.com/spreadsheets/d/[ID_DA_PLANILHA]/edit`
4. Copie apenas a parte `[ID_DA_PLANILHA]`
5. Cole no `.env` como valor de `GOOGLE_SHEETS_ENGINEER_ID`

## Permissões

### 1. Compartilhar a Planilha com a Service Account

A service account precisa ter acesso à planilha:

1. Abra o arquivo `credentials.json` (o arquivo da Google Cloud Service Account)
2. Procure o campo `client_email` - exemplo: `something@project-id.iam.gserviceaccount.com`
3. No Google Sheets, clique em "Compartilhar" (botão verde no canto superior direito)
4. Cole o email da service account
5. Dê permissão de **Editor**
6. Clique em "Enviar"

### 2. Verificar Configuração

Após configurar, você pode verificar se tudo está correto:

```bash
# Execute o bot
npm run dev

# No console, deve aparecer:
# 📊 Configuração:
#    - Nova Planilha Engenheiros: [SEU_ID]
#    - Aba: Engenheiro(a)
```

## Estrutura da Planilha

A nova planilha deve ter a seguinte estrutura de colunas:

### Seção IDENTIFICAÇÃO (A-J)
- A: Código do Projeto
- B: Cliente
- C: Contato
- D: Obra
- E: Área
- F: Eng. Responsável
- G: Tipo de Projeto
- H: Descrição do projeto
- I: Complexidade
- J: Dias estimados (interno)

### Seção PRAZOS (L-P)
- L: Data de Previsão de entrega (interna)
- M: Data Final (acordado com o cliente)
- N: Prazo Interno (dias úteis)
- O: Prazo Cliente (dias úteis)
- P: Dias de atraso

### Seção EXECUÇÃO (Q-Y)
- Q: Status do projeto
- R: Previsão para o dia
- S: Feito ao final do dia
- T: Necessitou de retrabalho?
- U: motivo da revisão
- V: Data do registro do retrabalho
- W: Etapa
- X: % executado
- Y: Observações

### Seção RETRABALHO (AA-AE)
- Z: Métrica de retrabalho
- AA: Dias estimados (dias úteis)
- AB: Data de entrega real
- AC: Lead Time (dias úteis)
- AD: Dias Parado cliente (dias úteis)
- AE: Dias parado TecPred (dias úteis)

## Testando o Novo Fluxo

### Cadastrar Novo Projeto

1. No WhatsApp, envie: **"projeto"**
2. Escolha: **1** (Cadastrar novo projeto)
3. Siga as instruções com os botões
4. Confirme no final
5. Verifique se apareceu na planilha

### Atualizar Projeto Existente

1. No WhatsApp, envie: **"atualizar projeto"**
2. Escolha o número do projeto da lista
3. Preencha status, previsão do dia, feito, retrabalho, etapa
4. Confirme no final
5. Verifique se atualizou na planilha

## Troubleshooting

### Erro: "Projeto não encontrado"
- Verifique se o código do projeto está correto
- Certifique-se de que a coluna A tem os códigos (PRJ-001, PRJ-002, etc)

### Erro: "Não consegui acessar a planilha"
- Verifique se o ID está correto no .env
- Confirme que a service account tem permissão de Editor
- Teste a conexão: `npm run verificar`

### Erro: "Header obrigatório faltando"
- A planilha precisa ter todos os headers esperados na linha 1
- Verifique a estrutura da planilha (seções acima)

### Nenhum projeto aparece ao atualizar
- Certifique-se de que a coluna F (Eng. Responsável) está preenchida
- O nome do engenheiro deve corresponder ao usado no chatbot

## Compatibilidade

O novo fluxo funciona **em paralelo** com os fluxos existentes:
- `registrar execução` - continua funcionando normalmente
- `registrar retrabalho` - continua funcionando normalmente
- `consultar status` - continua funcionando normalmente

Os engenheiros podem escolher qual sistema usar baseado na palavra-chave.
