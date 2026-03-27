# 🔒 Políticas de Segurança - Ordem de Execução

## 📋 Execute os scripts SQL nesta ordem:

### 1️⃣ Schema Base
```bash
MASTER_SCHEMA_COMPLETO.sql
```
Cria tabelas, indexes, seed data

---

### 2️⃣ Tabelas do Dono
```bash
tabela_evandro_dono.sql
```
Distribuição de tarefas, notificações, views do dono

---

### 3️⃣ Functions do Dono
```bash
functions_dono.sql
```
Functions para distribuir tarefas, consultar status

---

### 4️⃣ Views dos 6 Blocos
```bash
views_dashboard_blocos.sql
```
Views para dashboard (Visão Geral, Atrasos, Carga, Execução, Retrabalho, Gráficos)

---

### 5️⃣ **Políticas de Segurança** ⭐ IMPORTANTE
```bash
security_policies.sql
```

**O que implementa:**
- ✅ Row Level Security (RLS) em todas as tabelas
- ✅ Políticas de acesso por função (engenheiro, dono, admin)
- ✅ Validações de input e constraints
- ✅ Proteção contra SQL injection e XSS
- ✅ Auditoria automática de ações
- ✅ Functions seguras para inserção
- ✅ Permissões granulares

**Execute no Supabase SQL Editor:**
```sql
-- Cole o conteúdo de security_policies.sql
-- Clique em "Run"
```

---

## 🔐 Configuração JWT

Após executar os scripts, configure os JWT claims no Supabase Auth:

```json
{
  "eng_id": "uuid-do-engenheiro",
  "role": "engenheiro"  // ou "dono" ou "admin"
}
```

---

## ✅ Verificação

Teste se a segurança está funcionando:

```sql
-- 1. Verificar RLS habilitado
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;
-- Deve retornar todas as tabelas principais

-- 2. Verificar políticas criadas
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
-- Deve retornar ~30+ políticas

-- 3. Testar autenticação
SELECT auth.current_eng_id();
-- Deve retornar seu eng_id ou NULL

-- 4. Testar permissões
SELECT auth.is_dono();
SELECT auth.is_admin();
```

---

## 📚 Documentação Completa

Para entender como a segurança funciona em detalhes:

📖 **Leia:** `/docs/GUIA_SEGURANCA.md`

Contém:
- Explicação detalhada de cada camada de segurança
- Exemplos de uso
- Boas práticas
- Resposta a incidentes
- Métricas e monitoramento

---

## ⚠️ ATENÇÃO

**NUNCA:**
- ❌ Desabilite RLS em produção
- ❌ Commit de API keys ou secrets
- ❌ Dê acesso service_role ao frontend
- ❌ Execute queries dinâmicas sem prepared statements

**SEMPRE:**
- ✅ Use functions seguras (`registrar_previsao_seguro`, `registrar_retrabalho_seguro`)
- ✅ Valide input do usuário
- ✅ Use HTTPS em produção
- ✅ Monitore logs regularmente
- ✅ Mantenha backups atualizados

---

## 🆘 Suporte

Dúvidas sobre segurança:
- 📖 Leia `/docs/GUIA_SEGURANCA.md`
- 📧 Email: suporte@empresa.com

Reportar vulnerabilidade:
- 🔒 seguranca@empresa.com (resposta em 24h)

---

**Desenvolvido com 🔒 segurança máxima**

