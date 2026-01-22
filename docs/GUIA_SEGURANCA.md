# 🔒 Guia de Segurança do Sistema

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Row Level Security (RLS)](#row-level-security-rls)
3. [Autenticação e Autorização](#autenticação-e-autorização)
4. [Políticas de Acesso](#políticas-de-acesso)
5. [Validações e Constraints](#validações-e-constraints)
6. [Proteção contra Ataques](#proteção-contra-ataques)
7. [Auditoria e Logs](#auditoria-e-logs)
8. [Configuração JWT](#configuração-jwt)
9. [Boas Práticas](#boas-práticas)

---

## 🎯 Visão Geral

O sistema implementa **segurança em múltiplas camadas**:

```
┌─────────────────────────────────────┐
│  Camada 1: Autenticação JWT         │
│  (Supabase Auth)                    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Camada 2: Row Level Security (RLS) │
│  (Políticas por função)             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Camada 3: Validações e Constraints │
│  (Banco de dados)                   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Camada 4: Functions Seguras        │
│  (Sanitização de input)             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Camada 5: Auditoria e Logs         │
│  (Rastreamento de ações)            │
└─────────────────────────────────────┘
```

---

## 🛡️ Row Level Security (RLS)

### O que é RLS?

Row Level Security garante que **cada usuário veja apenas os dados que tem permissão** para acessar.

### Implementação

Todas as tabelas têm RLS habilitado:

```sql
ALTER TABLE engenheiros_projetos ENABLE ROW LEVEL SECURITY;
```

### Políticas Criadas

#### 📊 **Para Engenheiros**
- ✅ Veem apenas **seus próprios projetos**
- ✅ Podem atualizar apenas **seus próprios dados**
- ✅ Podem inserir apenas em **suas próprias atribuições**
- ❌ **Não** veem dados de outros engenheiros

#### 👔 **Para Dono (Evandro)**
- ✅ Vê **todos os projetos** de todos os engenheiros
- ✅ Pode **distribuir tarefas** para qualquer engenheiro
- ✅ Acesso **total ao dashboard**
- ✅ Pode consultar **estatísticas gerais**

#### 🔑 **Para Admin**
- ✅ Acesso **total** a todas as tabelas
- ✅ Pode **criar, editar e deletar** qualquer registro
- ✅ Único que pode modificar **tabelas de referência** (áreas, status)

---

## 🔐 Autenticação e Autorização

### Functions de Autenticação

O sistema usa 3 functions principais para identificar usuários:

#### 1. `auth.current_eng_id()`
```sql
SELECT auth.current_eng_id(); -- Retorna UUID do engenheiro logado
```

Pega o `eng_id` do JWT token do usuário autenticado.

#### 2. `auth.is_dono()`
```sql
SELECT auth.is_dono(); -- Retorna true/false
```

Verifica se o usuário tem `role = 'dono'` no JWT.

#### 3. `auth.is_admin()`
```sql
SELECT auth.is_admin(); -- Retorna true/false
```

Verifica se o usuário tem `role = 'admin'` ou `'service_role'` no JWT.

---

## 🎭 Políticas de Acesso

### Estrutura das Políticas

Cada tabela tem políticas específicas para **SELECT**, **INSERT**, **UPDATE** e **DELETE**.

### Exemplo: Tabela `engenheiros_projetos`

```sql
-- SELECT: Engenheiros veem apenas suas atribuições
CREATE POLICY eng_proj_select_policy ON engenheiros_projetos
    FOR SELECT
    USING (
        auth.is_admin() OR 
        auth.is_dono() OR
        eng_id = auth.current_eng_id()
    );

-- UPDATE: Engenheiros atualizam apenas suas atribuições
CREATE POLICY eng_proj_update_policy ON engenheiros_projetos
    FOR UPDATE
    USING (
        auth.is_admin() OR 
        auth.is_dono() OR
        eng_id = auth.current_eng_id()
    );
```

### Tabelas de Referência

Áreas, Status e Complexidades são **públicas para leitura**, mas apenas **admin pode editar**:

```sql
-- Todos podem ler
CREATE POLICY areas_select_policy ON areas
    FOR SELECT
    USING (true);

-- Apenas admin pode editar
CREATE POLICY areas_update_policy ON areas
    FOR UPDATE
    USING (auth.is_admin());
```

---

## ✅ Validações e Constraints

### Constraints Implementados

#### 1. **Percentual entre 0 e 100**
```sql
ALTER TABLE engenheiros_projetos
ADD CONSTRAINT check_percentual_valido 
CHECK (percentual_andamento >= 0 AND percentual_andamento <= 100);
```

#### 2. **Datas válidas**
```sql
ALTER TABLE engenheiros_projetos
ADD CONSTRAINT check_datas_validas
CHECK (data_prevista >= data_inicio);
```

#### 3. **Prazos válidos**
```sql
ALTER TABLE prazos
ADD CONSTRAINT check_prazos_validos
CHECK (prazo_final_eng <= prazo_final_cliente);
```

#### 4. **Valores positivos**
```sql
ALTER TABLE engenheiros_projetos
ADD CONSTRAINT check_tempo_positivo
CHECK (tempo_trabalho_dias >= 0);
```

---

## 🛡️ Proteção contra Ataques

### 1. SQL Injection

**Problema:** Usuário tenta inserir código SQL malicioso

**Solução:** Function `sanitize_input()`

```sql
SELECT sanitize_input('DROP TABLE users; --');
-- Retorna: '' (removido)
```

**Uso:**
```sql
-- ❌ NUNCA fazer assim:
EXECUTE 'SELECT * FROM projetos WHERE codigo = ' || user_input;

-- ✅ SEMPRE usar prepared statements:
SELECT * FROM projetos WHERE codigo = $1;
```

### 2. XSS (Cross-Site Scripting)

**Problema:** Usuário insere scripts maliciosos em campos de texto

**Solução:** Sanitização automática via `sanitize_input()`

```sql
SELECT sanitize_input('<script>alert("XSS")</script>');
-- Retorna: 'scriptalert("XSS")/script' (tags removidas)
```

### 3. Mass Assignment

**Problema:** Usuário tenta modificar campos que não deveria

**Solução:** Functions específicas com validação

```sql
-- ❌ Usuário não pode fazer:
UPDATE engenheiros_projetos 
SET eng_id = 'outro_engenheiro' 
WHERE id = 'xyz';

-- ✅ RLS bloqueia automaticamente (só pode editar próprios dados)
```

---

## 📝 Auditoria e Logs

### Trigger Automático

Todas as operações sensíveis são registradas automaticamente:

```sql
-- Trigger em engenheiros_projetos
CREATE TRIGGER audit_engenheiros_projetos
    AFTER INSERT OR UPDATE OR DELETE ON engenheiros_projetos
    FOR EACH ROW
    EXECUTE FUNCTION audit_log();
```

### Consultar Logs

```sql
-- Ver últimas 10 ações
SELECT 
    eng_id,
    acao_executada,
    created_at,
    metadata
FROM chatbot_logs
ORDER BY created_at DESC
LIMIT 10;
```

### Informações Registradas

- ✅ Quem fez a ação (`eng_id`)
- ✅ Qual ação (`INSERT`, `UPDATE`, `DELETE`)
- ✅ Em qual tabela
- ✅ Quando (`timestamp`)
- ✅ Metadados adicionais (`metadata JSONB`)

---

## 🔑 Configuração JWT

### Claims Necessários

O JWT token deve conter:

```json
{
  "sub": "uuid-do-usuario",
  "role": "engenheiro",  // ou "dono" ou "admin"
  "eng_id": "uuid-do-engenheiro",
  "email": "engenheiro@empresa.com"
}
```

### Configurar no Supabase Auth

1. **No Dashboard Supabase:**
   - Authentication → Policies → JWT Settings

2. **Adicionar Custom Claims:**
```sql
-- Trigger para adicionar claims no registro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Busca eng_id pelo email
  UPDATE auth.users
  SET raw_app_meta_data = 
    raw_app_meta_data || 
    json_build_object(
      'eng_id', (SELECT eng_id FROM engenheiros WHERE email = NEW.email),
      'role', 'engenheiro'
    )::jsonb
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Exemplo de Login (WhatsApp)

```typescript
// Ao autenticar via WhatsApp
const { data, error } = await supabase.auth.signInWithPassword({
  email: engenheiro.email,
  password: hashedPassword
});

// JWT automaticamente terá:
// - eng_id
// - role
// - Políticas RLS aplicadas automaticamente
```

---

## ✨ Boas Práticas

### 1. **SEMPRE use functions seguras**

❌ **Evitar:**
```sql
INSERT INTO projetos_previsao (eng_projeto_id, previsao_texto)
VALUES ($1, $2); -- Sem validação
```

✅ **Preferir:**
```sql
SELECT registrar_previsao_seguro(
  p_eng_projeto_id := 'uuid',
  p_previsao_texto := 'Minha previsão'
);
```

### 2. **Nunca desabilite RLS**

❌ **NUNCA fazer:**
```sql
ALTER TABLE engenheiros_projetos DISABLE ROW LEVEL SECURITY;
```

### 3. **Sempre valide input do usuário**

```typescript
// Frontend/Backend validation
if (input.length < 5) {
  throw new Error('Input muito curto');
}

// Database validation (via function)
SELECT registrar_previsao_seguro(...);
```

### 4. **Use transactions para operações múltiplas**

```sql
BEGIN;
  -- Operação 1
  INSERT INTO ...;
  -- Operação 2
  UPDATE ...;
COMMIT;
```

### 5. **Monitore logs regularmente**

```sql
-- Buscar ações suspeitas
SELECT *
FROM chatbot_logs
WHERE sucesso = false
  OR acao_executada LIKE '%DELETE%'
ORDER BY created_at DESC;
```

---

## 🚨 Incidentes de Segurança

### Checklist de Resposta

1. ✅ **Identificar** - O que aconteceu?
2. ✅ **Isolar** - Revogar tokens comprometidos
3. ✅ **Investigar** - Consultar `chatbot_logs`
4. ✅ **Remediar** - Corrigir vulnerabilidade
5. ✅ **Documentar** - Registrar lições aprendidas

### Comandos Úteis

```sql
-- Revogar sessões de um engenheiro
UPDATE auth.users
SET banned_until = NOW() + INTERVAL '1 hour'
WHERE email = 'engenheiro@empresa.com';

-- Ver tentativas de acesso negado
SELECT *
FROM chatbot_logs
WHERE sucesso = false
  AND metadata->>'error' LIKE '%permission%';
```

---

## 📊 Métricas de Segurança

### Dashboards Recomendados

1. **Tentativas de acesso negado** (últimas 24h)
2. **Operações por usuário** (últimos 7 dias)
3. **Modificações em tabelas sensíveis**
4. **Logins por IP** (detectar anomalias)

### Consultas Úteis

```sql
-- Top 10 usuários mais ativos
SELECT 
  e.nome,
  COUNT(*) AS total_acoes
FROM chatbot_logs l
JOIN engenheiros e ON e.eng_id = l.eng_id
WHERE l.created_at >= NOW() - INTERVAL '7 days'
GROUP BY e.nome
ORDER BY total_acoes DESC
LIMIT 10;

-- Ações fora do horário comercial
SELECT *
FROM chatbot_logs
WHERE EXTRACT(HOUR FROM created_at) NOT BETWEEN 8 AND 18
  OR EXTRACT(DOW FROM created_at) IN (0, 6); -- Fim de semana
```

---

## 🔄 Manutenção

### Revisão Trimestral

- [ ] Revisar e atualizar políticas RLS
- [ ] Analisar logs de segurança
- [ ] Atualizar senhas e tokens
- [ ] Testar recuperação de desastre
- [ ] Verificar backups

### Auditorias

- [ ] Mensal: Revisar acessos e permissões
- [ ] Trimestral: Penetration testing
- [ ] Anual: Auditoria externa completa

---

## 📞 Contato

Para reportar vulnerabilidades de segurança:
- 📧 Email: seguranca@empresa.com
- 🔒 PGP Key: [disponível no site]
- ⏰ SLA: Resposta em 24h

---

**Última atualização:** Janeiro 2026  
**Versão:** 1.0  
**Desenvolvido com 🔒 segurança em mente**

