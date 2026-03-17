# 🏗️ Arquitetura do Sistema

## Visão Geral

Sistema de gestão de projetos via WhatsApp com armazenamento em Supabase e sincronização automática com Google Sheets.

## Componentes Principais

### 1. WhatsApp Bot
- **Tecnologia**: whatsapp-web.js + Node.js + TypeScript
- **Função**: Interface conversacional
- **Fluxos**: Criar projeto, Editar projeto, Notificações diárias

### 2. Message Handler
- **Função**: Orquestra fluxos conversacionais
- **Localização**: `chatbot/handlers/messageHandler.ts`
- **Responsabilidade**: Classificar intenções e direcionar para fluxos apropriados

### 3. Supabase (Banco de Dados)
- **Tecnologia**: PostgreSQL com RLS
- **Função**: Armazenamento primário de dados
- **Tabelas principais**: `projetos`, `engenheiros`, `atualizacoes_diarias`

### 4. Google Sheets
- **Função**: Visualização e análise
- **Sincronização**: Automática a cada 5 minutos (Supabase → Sheets)
- **Formato**: Planilha com 31 colunas (A-AE)

### 5. Sincronização Automática
- **Tecnologia**: Cron jobs (node-cron)
- **Frequência**: A cada 5 minutos (configurável)
- **Função**: Sincronizar dados do Supabase para Google Sheets

## Fluxo de Dados

```
WhatsApp → Message Handler → Engineer Project Flow → Supabase
                                                          ↓
                                                    Google Sheets
```

## Armazenamento

- **Primário**: Supabase (todas as operações salvam primeiro aqui)
- **Secundário**: Google Sheets (apenas visualização, sincronizado automaticamente)

## Segurança

- **RLS (Row Level Security)**: Engenheiros veem apenas seus projetos
- **Variáveis de ambiente**: Credenciais armazenadas em `.env`
- **Service Account**: Google Sheets com permissões restritas
