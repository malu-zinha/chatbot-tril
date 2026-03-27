# 🔐 Autenticação por WhatsApp - Sistema de Fluxos Diferenciados

## 📋 Visão Geral

O chatbot implementa **autenticação automática por número de WhatsApp**, direcionando cada usuário para o fluxo apropriado:

- ✅ **Engenheiros**: Acesso ao fluxo de gerenciamento de projetos
- ✅ **Dono da Empresa**: Acesso ao fluxo de distribuição de tarefas e relatórios
- ❌ **Não Cadastrados**: Mensagem de acesso negado

---

## 🔍 Como Funciona

### 1. Processo de Autenticação

Quando uma mensagem chega no WhatsApp:

```
Mensagem recebida
    ↓
Normalizar número (+5511999999999)
    ↓
Buscar no banco de dados:
  - Tabela `engenheiros` (campo `telefone`)
  - Tabela `dono_empresa` (campo `telefone`)
    ↓
┌────────────────────────────────────────┐
│  Número encontrado em `engenheiros`?   │ → SIM → Fluxo de Engenheiro
│                                        │
│  Número encontrado em `dono_empresa`?  │ → SIM → Fluxo de Dono
│                                        │
│  Não encontrado em nenhuma tabela?     │ → NÃO → Mensagem de erro
└────────────────────────────────────────┘
```

### 2. Sessão do Usuário

Após a autenticação, uma sessão é criada com:

```typescript
interface UserSession {
  whatsapp: string;              // Número normalizado
  tipo_usuario: 'engenheiro' | 'dono' | 'nao_cadastrado';
  user_id: string;               // eng_id ou dono_id
  fluxo_ativo: 'engineer_project' | 'owner' | null;
  ultima_interacao: Date;
}
```

---

## 🎭 Fluxos por Tipo de Usuário

### 👷 Fluxo do Engenheiro

**Menu Principal:**
```
🤖 Menu do Engenheiro

📋 Gestão de Projetos
1️⃣ Criar novo projeto
2️⃣ Editar projeto existente
3️⃣ Notificações diárias (Manhã/Noite)

❓ Ajuda
Digite "ajuda" para instruções
```

**Funcionalidades:**
- ✅ **Criar Projeto**: Cadastrar novo projeto com todos os dados
- ✅ **Editar Projeto**: Modificar informações de projetos existentes
- ✅ **Notificações**:
  - 🌅 **Manhã (09:00)**: Status + Previsão do dia
  - 🌙 **Noite (17:00)**: Feito + Retrabalho + Observações

**Restrições:**
- ❌ Não pode distribuir tarefas
- ❌ Não pode ver projetos de outros engenheiros
- ✅ Vê apenas seus próprios projetos (RLS no Supabase)

---

### 👔 Fluxo do Dono

**Menu Principal:**
```
👔 Menu do Dono

📊 Gestão da Empresa
1️⃣ Distribuir tarefa para engenheiro
2️⃣ Verificar status dos projetos
3️⃣ Consultar histórico e relatórios

❓ Ajuda
Digite "ajuda" para instruções
```

**Funcionalidades:**
- ✅ **Distribuir Tarefas**: Atribuir projetos aos engenheiros
  - Escolher engenheiro
  - Definir área e tipo de projeto
  - Configurar prazos e complexidade
- ✅ **Verificar Projetos**: Ver status de TODOS os projetos
- ✅ **Relatórios**: Histórico e indicadores de performance

**Permissões:**
- ✅ Acesso total a todos os projetos (RLS no Supabase)
- ✅ Pode criar, editar e deletar projetos
- ✅ Pode atribuir tarefas a qualquer engenheiro

---

## 🚫 Mensagem para Não Cadastrados

```
🚫 Número não cadastrado

Seu número de WhatsApp não está cadastrado no sistema.

Para obter acesso, entre em contato com o administrador da TecPred.

📞 Informações necessárias:
• Seu nome completo
• Cargo/função (Engenheiro ou Dono)
• Número de WhatsApp (este número)

Após o cadastro, você receberá acesso automático ao sistema.
```

---

## 🔧 Configuração no Banco de Dados

### Cadastrar um Engenheiro

```sql
-- 1. Inserir engenheiro
INSERT INTO engenheiros (nome, email, telefone)
VALUES (
  'João Silva',
  'joao.silva@tecpred.com',
  '+5511999999999'  -- ⚠️ FORMATO IMPORTANTE: +55XXXXXXXXXXX
);

-- 2. Atribuir áreas de atuação
INSERT INTO engenheiros_areas (eng_id, area_codigo)
SELECT 
  (SELECT eng_id FROM engenheiros WHERE telefone = '+5511999999999'),
  area_codigo
FROM areas
WHERE codigo IN ('ELETRICO', 'HIDRAULICO');
```

### Cadastrar o Dono

```sql
-- Inserir dono (já existe no seed)
INSERT INTO dono_empresa (nome, email, telefone, empresa_nome)
VALUES (
  'Evandro',
  'evandro@tecpred.com',
  '+5583988990772',  -- ⚠️ FORMATO IMPORTANTE: +55XXXXXXXXXXX
  'TecPred Engenharia'
);
```

### ⚠️ Formato do Telefone

**CRÍTICO**: O telefone deve estar no formato:

```
+55XXXXXXXXXXX
```

**Exemplos corretos:**
- ✅ `+5511999999999` (11 dígitos após +55)
- ✅ `+5583988990772` (11 dígitos após +55)

**Exemplos errados:**
- ❌ `11999999999` (sem +55)
- ❌ `5511999999999` (sem +)
- ❌ `+55 (11) 99999-9999` (com formatação)
- ❌ `+55 11 9 9999-9999` (com espaços)

---

## 🔄 Comandos Globais

Funcionam para **todos os tipos de usuário**:

| Comando | Descrição |
|---------|-----------|
| `menu` ou `oi` | Volta ao menu principal |
| `ajuda` | Mostra ajuda contextual (engenheiro ou dono) |
| `cancelar` | Sai do fluxo atual |
| `sync` | Força sincronização Supabase → Sheets |

---

## 🧪 Testando a Autenticação

### Teste via Terminal

```bash
npm run test:bot-completo
```

**Simule diferentes números:**

```
Digite o número de telefone (ex: +5511999999999):
> +5511999999999  # Engenheiro

Digite uma mensagem:
> oi

# Deve mostrar: 🤖 Menu do Engenheiro
```

```
Digite o número de telefone (ex: +5511999999999):
> +5583988990772  # Dono

Digite uma mensagem:
> oi

# Deve mostrar: 👔 Menu do Dono
```

```
Digite o número de telefone (ex: +5511999999999):
> +5511000000000  # Não cadastrado

Digite uma mensagem:
> oi

# Deve mostrar: 🚫 Número não cadastrado
```

### Teste via WhatsApp

1. **Cadastre seu número** no Supabase
2. **Inicie o bot**: `npm start`
3. **Escaneie o QR Code** com seu WhatsApp
4. **Envie**: `oi`
5. **Verifique** qual menu aparece (engenheiro ou dono)

---

## 🛡️ Segurança: Row Level Security (RLS)

O Supabase aplica políticas de segurança automáticas:

### Engenheiros (RLS Limitado)

```sql
-- Engenheiros veem apenas seus próprios projetos
CREATE POLICY "engenheiros_veem_seus_projetos"
ON projetos
FOR SELECT
USING (
  eng_id = auth.uid()  -- Apenas projetos atribuídos a ele
);
```

### Dono (RLS Completo)

```sql
-- Dono vê todos os projetos
CREATE POLICY "dono_ve_todos_projetos"
ON projetos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM dono_empresa
    WHERE dono_id = auth.uid()
  )
);
```

---

## 🐛 Troubleshooting

### Problema: "Número não cadastrado"

**Causa**: O número do WhatsApp não está na tabela `engenheiros` ou `dono_empresa`

**Solução:**
```sql
-- Verificar se o número existe
SELECT * FROM engenheiros WHERE telefone = '+5511999999999';
SELECT * FROM dono_empresa WHERE telefone = '+5511999999999';

-- Se não existir, adicionar
INSERT INTO engenheiros (nome, email, telefone)
VALUES ('Seu Nome', 'email@tecpred.com', '+5511999999999');
```

### Problema: Menu errado aparece

**Causa**: Número cadastrado em tabela errada

**Solução:**
```sql
-- Verificar em qual tabela está
SELECT 'engenheiro' as tipo, nome, telefone FROM engenheiros WHERE telefone = '+5511999999999'
UNION
SELECT 'dono' as tipo, nome, telefone FROM dono_empresa WHERE telefone = '+5511999999999';

-- Mover para tabela correta se necessário
```

### Problema: Formato @lid em vez de @c.us

**Causa**: WhatsApp está usando Linked Device ID

**Solução**: O bot já trata isso automaticamente, convertendo `@lid` para `@c.us` via `contact.number`

---

## 📚 Arquivos Relacionados

- **Autenticação**: `chatbot/handlers/messageHandler.ts` (linhas 234-254)
- **Fluxo Engenheiro**: `chatbot/flows/engineerProjectFlow.ts`
- **Fluxo Dono**: `chatbot/flows/ownerFlow.ts`
- **Supabase Service**: `integrations/supabase/supabaseService.ts`
- **Banco de Dados**: `supabase/MASTER_SCHEMA_COMPLETO.sql`

---

## ✅ Checklist de Implementação

- [x] ✅ Autenticação por número de WhatsApp
- [x] ✅ Fluxos separados (engenheiro vs dono)
- [x] ✅ Mensagem para não cadastrados
- [x] ✅ Sessões persistentes
- [x] ✅ Menus contextuais
- [x] ✅ Comandos globais
- [x] ✅ RLS no Supabase
- [x] ✅ Normalização de números (+55XXXXXXXXXXX)
- [x] ✅ Tratamento de @lid (Linked Device ID)

---

**Sistema pronto para produção! 🚀**

