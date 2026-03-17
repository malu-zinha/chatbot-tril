# 🔄 Fluxo de Dados

## Fluxo Principal: Criar/Editar/Notificar

```
WhatsApp → Message Handler → Engineer Project Flow → Supabase → Google Sheets
```

### 1. Criar Projeto

```
Usuário envia "1" ou "criar"
  ↓
Message Handler classifica intenção
  ↓
Engineer Project Flow inicia
  ↓
Coleta dados (automáticos + manuais)
  ↓
Calcula prazos automaticamente
  ↓
Salva no Supabase
  ↓
Sincronização automática → Google Sheets (5 min)
```

### 2. Editar Projeto

```
Usuário envia "2" ou "editar"
  ↓
Message Handler classifica intenção
  ↓
Engineer Project Flow inicia modo edição
  ↓
Lista projetos disponíveis
  ↓
Usuário escolhe projeto
  ↓
Mostra categorias editáveis
  ↓
Usuário escolhe categoria e campo
  ↓
Solicita novo valor
  ↓
Salva no Supabase (campo específico)
  ↓
Sincronização automática → Google Sheets (5 min)
```

### 3. Notificações Diárias

#### Manhã
```
Usuário envia "3" → "1" (Manhã)
  ↓
Escolhe projeto
  ↓
Informa status → Etapa determinada automaticamente
  ↓
Informa previsão do dia
  ↓
Salva no Supabase (atualizacoes_diarias)
  ↓
Sincronização automática → Google Sheets (5 min)
```

#### Noite
```
Usuário envia "3" → "2" (Noite)
  ↓
Escolhe projeto
  ↓
Informa status → Etapa determinada automaticamente
  ↓
Informa feito do dia
  ↓
Informa retrabalho (se houver)
  ↓
Informa observações
  ↓
Salva no Supabase (atualizacoes_diarias)
  ↓
Sincronização automática → Google Sheets (5 min)
```

## Sincronização Automática

```
Cron Job (a cada 5 minutos)
  ↓
Lê projetos do Supabase (ativo = true)
  ↓
Filtra por engenheiro (se configurado)
  ↓
Formata dados para planilha (31 colunas)
  ↓
Limpa planilha atual
  ↓
Escreve novos dados
```

## Normalização de Dados

### WhatsApp → Supabase
- Números: Normalizados para formato `+55XXXXXXXXXXX`
- Datas: Convertidas para formato ISO (YYYY-MM-DD)
- Status: Validados contra lista permitida
- Etapa: Determinada automaticamente baseada no status

### Supabase → Google Sheets
- Datas: Formatadas para exibição (DD/MM/YYYY)
- Valores nulos: Convertidos para strings vazias
- Booleanos: Convertidos para "sim"/"não"
- Percentuais: Formatados como números
