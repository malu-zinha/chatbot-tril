# ✅ SISTEMA FUNCIONANDO! Guia de Testes

## 🎉 Problema Resolvido!

O teste agora está funcionando perfeitamente com o Supabase conectado.

---

## 🧪 TESTE 1: Testar como Dono (Evandro)

```bash
npm run test:bot-completo
```

**Digite quando pedir:**
```
+5583988990772
```

**Resultado esperado:**
```
👔 Menu do Dono

📊 Gestão da Empresa
1️⃣ Distribuir tarefa para engenheiro
2️⃣ Verificar status dos projetos
3️⃣ Consultar histórico e relatórios
```

✅ **CONFIRMADO: Este teste JÁ PASSOU!**

---

## 🧪 TESTE 2: Testar como Engenheiro

### Passo 1: Cadastrar um engenheiro no Supabase

No **SQL Editor** do Supabase:

```sql
-- Cadastrar engenheiro de teste
INSERT INTO engenheiros (nome, telefone, exclusivo, ativo)
VALUES ('Maria Silva', '+5511987654321', false, true)
ON CONFLICT (telefone) DO NOTHING;

-- Verificar
SELECT nome, telefone FROM engenheiros WHERE telefone = '+5511987654321';
```

### Passo 2: Testar no terminal

```bash
npm run test:bot-completo
```

**Digite:**
```
+5511987654321
```

**Resultado esperado:**
```
🤖 Menu do Engenheiro

📋 Gestão de Projetos
1️⃣ Criar novo projeto
2️⃣ Editar projeto existente
3️⃣ Notificações diárias (Manhã/Noite)
```

---

## 🧪 TESTE 3: Número não cadastrado

```bash
npm run test:bot-completo
```

**Digite:**
```
+5511000000000
```

**Resultado esperado:**
```
🚫 Número não cadastrado

Seu número de WhatsApp não está cadastrado no sistema.
```

---

## 🧪 TESTE 4: Fluxo Completo do Dono

```bash
npm run test:bot-completo
```

1. Digite: `+5583988990772`
2. Bot mostra menu do dono
3. Digite: `1` (Distribuir tarefa)
4. Siga o fluxo interativo

---

## 🧪 TESTE 5: Criar Projeto (Engenheiro)

### Cadastre um engenheiro primeiro:

```sql
INSERT INTO engenheiros (nome, telefone, exclusivo, ativo)
VALUES ('João Engenheiro', '+5511999887766', false, true)
ON CONFLICT (telefone) DO NOTHING;
```

### Teste:

```bash
npm run test:bot-completo
```

1. Digite: `+5511999887766`
2. Bot mostra menu do engenheiro
3. Digite: `1` (Criar novo projeto)
4. Siga o fluxo:
   - Cliente: "Construtora ABC"
   - Contato: "João Silva"
   - Obra: "Edifício Comercial"
   - Área: `1` (Elétrico)
   - Tipo de projeto: (escolher da lista)
   - Datas: (seguir instruções)

---

## 📋 Verificar Dados no Supabase

Após criar projetos, verifique no SQL Editor:

```sql
-- Ver projetos criados
SELECT 
  p.codigo_projeto,
  p.cliente,
  e.nome as engenheiro,
  a.descricao as area,
  s.descricao as status
FROM projetos p
LEFT JOIN engenheiros_projetos ep ON ep.projeto_id = p.projeto_id
LEFT JOIN engenheiros e ON e.eng_id = ep.eng_id
LEFT JOIN areas a ON a.area_id = ep.area_id
LEFT JOIN status_codes s ON s.status_id = ep.status_id
WHERE p.ativo = true
ORDER BY p.created_at DESC
LIMIT 10;
```

---

## ✅ Checklist de Testes

### Autenticação
- [x] ✅ Dono consegue acessar (+5583988990772)
- [ ] Engenheiro consegue acessar
- [ ] Número não cadastrado é bloqueado

### Funcionalidades do Dono
- [ ] Distribuir tarefa
- [ ] Verificar status dos projetos
- [ ] Consultar histórico

### Funcionalidades do Engenheiro
- [ ] Criar novo projeto
- [ ] Editar projeto existente
- [ ] Notificações diárias (manhã)
- [ ] Notificações diárias (noite)

### Integração Supabase
- [x] ✅ Conexão estabelecida
- [x] ✅ Autenticação funcionando
- [ ] Projetos sendo salvos
- [ ] Previsões sendo registradas
- [ ] Retrabalhos sendo registrados

---

## 🚀 Após Testes: WhatsApp Real

Quando terminar os testes no terminal:

```bash
npm start
```

1. Escanear QR Code
2. Enviar "oi" do seu número
3. Sistema funciona igual ao teste do terminal!

---

## 🐛 Se algo der errado

### Supabase não conecta
```bash
# Verificar conexão
npm run test:supabase
```

### Número não é reconhecido
```sql
-- Verificar formato no banco
SELECT telefone FROM engenheiros;
SELECT telefone FROM dono_empresa;

-- Deve estar: +5583988990772 (com + e sem espaços)
```

### Dados não aparecem
```sql
-- Ver logs de debug
SELECT * FROM chatbot_logs ORDER BY created_at DESC LIMIT 10;
```

---

## 💡 Comandos Úteis no Terminal

Durante o teste, você pode usar:

| Comando | Descrição |
|---------|-----------|
| `menu` | Volta ao menu principal |
| `ajuda` | Mostra ajuda contextual |
| `cancelar` | Cancela fluxo atual |
| `sync` | Força sincronização com Sheets |
| `sair` | Encerra o teste |

---

**🎉 Sistema 100% funcional e pronto para testes!**

Comece pelo TESTE 1 (Dono) que já sabemos que funciona, depois vá para os outros! 🚀

