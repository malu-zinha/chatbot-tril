# GUIA DE TESTES - NOVO FLUXO DO DONO

## Pré-requisitos

### 1. Executar SQL no Supabase

Execute os seguintes arquivos SQL no Supabase SQL Editor **nesta ordem**:

```sql
-- 1. Sincronização de datas
\i supabase/sync_datas_prazos.sql

-- 2. Auto-conclusão de projetos
\i supabase/auto_conclusao_projeto.sql

-- 3. Função de distribuição com prazos (já incluída em functions_dono.sql)
-- Certifique-se de que functions_dono.sql foi executado
```

### 2. Verificar Dados de Teste

Execute o script de verificação:

```bash
cd chatbot-tril
npm run test:supabase
```

## Estrutura dos Testes

### Opção 1: Visualizar Informações

#### Teste 1a: Visualizar por Projeto

```
Fluxo:
1. Iniciar bot com número do dono: +5583988990772
2. Digitar: 1 (Visualizar)
3. Digitar: a (Por Projeto)
4. Escolher um projeto da lista (ex: 1)
5. Escolher uma área (ex: 1)
6. Verificar informações exibidas

Validar:
✓ Lista de projetos é exibida
✓ Áreas do projeto são listadas
✓ Informações completas são mostradas (código, cliente, status, datas, prazos, retrabalhos)
```

#### Teste 1b: Visualizar por Engenheiro

```
Fluxo:
1. Iniciar bot com número do dono
2. Digitar: 1 (Visualizar)
3. Digitar: b (Por Engenheiro)
4. Escolher um engenheiro (ex: 1)
5. Escolher um projeto do engenheiro (ex: 1)
6. Verificar informações exibidas

Validar:
✓ Lista de engenheiros é exibida
✓ Projetos do engenheiro são listados
✓ Informações completas são mostradas
```

#### Teste 1c: Histórico de Retrabalhos

```
Fluxo:
1. Iniciar bot com número do dono
2. Digitar: 1 (Visualizar)
3. Digitar: c (Histórico Retrabalhos)
4. Escolher filtro:
   - 1 (Todos)
   - OU 2 (Por Projeto) → escolher projeto
   - OU 3 (Por Engenheiro) → escolher engenheiro
5. Verificar lista de retrabalhos

Validar:
✓ Retrabalhos são exibidos com data, engenheiro, projeto, motivo
✓ Filtros funcionam corretamente
```

### Opção 2: Distribuir Projeto

#### Teste 2: Distribuir com Prazos Completos

```
Fluxo:
1. Iniciar bot com número do dono
2. Digitar: 2 (Distribuir)
3. Escolher engenheiro (ex: 1 - Engenheiro 4)
4. Escolher projeto existente (ex: 1)
5. Escolher área (ex: 1)
6. Data início: 20/01/2026
7. Data início cliente (opcional): pular
8. Prazo interno: 15/02/2026
9. Prazo cliente: 28/02/2026
10. Observações: pular
11. Confirmar: 1

Validar:
✓ Engenheiro recebe o projeto
✓ Registro em engenheiros_projetos
✓ Registro em prazos (com prazo_interno_dias e prazo_cliente_dias calculados)
✓ Notificação WhatsApp criada
✓ Datas sincronizadas entre tabelas
```

#### Teste 2.1: Validação de Datas

```
Teste de erro - Prazo interno < Data início:
- Data início: 20/01/2026
- Prazo interno: 15/01/2026 (ERRO esperado)

Teste de erro - Prazo cliente < Prazo interno:
- Prazo interno: 15/02/2026
- Prazo cliente: 10/02/2026 (ERRO esperado)

Validar:
✓ Mensagens de erro são exibidas
✓ Usuário pode corrigir sem perder contexto
```

### Opção 3: Criar Novo Projeto

#### Teste 3: Criar Projeto

```
Fluxo:
1. Iniciar bot com número do dono
2. Digitar: 3 (Criar)
3. Código: PRJ-TEST-001
4. Cliente: Empresa Teste LTDA
5. Descrição: Projeto de teste para validação do fluxo
6. Confirmar: 1

Validar:
✓ Projeto é criado na tabela projetos
✓ Código, cliente e descrição são salvos corretamente
✓ Mensagem de sucesso indica próximo passo (distribuir)
```

#### Teste 3.1: Validação de Duplicidade

```
Fluxo:
1. Tentar criar projeto com código já existente
2. Verificar mensagem de erro

Validar:
✓ Erro "Código de projeto já existe"
✓ Projeto não é criado
```

## Comandos de Teste

### Testar no Terminal

```bash
cd chatbot-tril
npm run test:bot-completo
```

Quando solicitado, digite o número do dono: `+5583988990772`

### Verificar Dados no Supabase

```sql
-- Ver atribuições recentes
SELECT 
  ep.id,
  e.nome as engenheiro,
  p.codigo_projeto,
  a.descricao as area,
  ep.data_inicio,
  ep.data_prevista,
  s.descricao as status
FROM engenheiros_projetos ep
JOIN engenheiros e ON e.eng_id = ep.eng_id
JOIN projetos p ON p.projeto_id = ep.projeto_id
JOIN areas a ON a.area_id = ep.area_id
LEFT JOIN status_codes s ON s.status_id = ep.status_id
WHERE ep.created_at > NOW() - INTERVAL '1 hour'
ORDER BY ep.created_at DESC;

-- Ver prazos recentes
SELECT 
  pr.id,
  p.codigo_projeto,
  e.nome as engenheiro,
  pr.data_inicio_projeto,
  pr.prazo_final_eng,
  pr.prazo_final_cliente,
  pr.prazo_interno_dias,
  pr.prazo_cliente_dias
FROM prazos pr
JOIN projetos p ON p.projeto_id = pr.projeto_id
JOIN engenheiros e ON e.eng_id = pr.eng_id
WHERE pr.created_at > NOW() - INTERVAL '1 hour'
ORDER BY pr.created_at DESC;

-- Ver notificações pendentes
SELECT 
  n.notificacao_id,
  e.nome as engenheiro,
  n.telefone,
  n.tipo,
  n.titulo,
  n.enviada,
  n.created_at
FROM notificacoes_whatsapp n
JOIN engenheiros e ON e.eng_id = n.eng_id
WHERE n.created_at > NOW() - INTERVAL '1 hour'
ORDER BY n.created_at DESC;
```

## Checklist Completo

### SQL
- [x] sync_datas_prazos.sql executado
- [x] auto_conclusao_projeto.sql executado
- [x] functions_dono.sql atualizado com dono_distribuir_projeto_com_prazos

### Código TypeScript
- [x] supabaseService.ts com novos métodos
- [x] ownerFlow.ts refatorado completamente

### Testes Funcionais
- [ ] Teste 1a: Visualizar por Projeto
- [ ] Teste 1b: Visualizar por Engenheiro
- [ ] Teste 1c: Histórico de Retrabalhos (todos)
- [ ] Teste 1c.1: Histórico filtrado por Projeto
- [ ] Teste 1c.2: Histórico filtrado por Engenheiro
- [ ] Teste 2: Distribuir com prazos completos
- [ ] Teste 2.1: Validação de datas (erros)
- [ ] Teste 3: Criar novo projeto
- [ ] Teste 3.1: Duplicidade de código

### Validações no Banco
- [ ] Datas sincronizadas entre engenheiros_projetos e prazos
- [ ] Prazos calculados automaticamente (prazo_interno_dias, prazo_cliente_dias)
- [ ] Notificações WhatsApp criadas
- [ ] data_conclusao preenchida automaticamente ao concluir

## Possíveis Erros e Soluções

### Erro: "Supabase não conectado"
**Solução:** Verificar se o `.env` está configurado corretamente

### Erro: "Nenhum projeto encontrado"
**Solução:** Criar projetos de teste usando a opção 3 do menu

### Erro: "Área não encontrada"
**Solução:** Verificar se as áreas foram seedadas no Supabase (seed_areas_completo.sql)

### Erro: "function dono_distribuir_projeto_com_prazos does not exist"
**Solução:** Executar novamente o functions_dono.sql no Supabase

### Erro: "Data inválida" ao distribuir
**Solução:** Usar formato DD/MM/AAAA (ex: 20/01/2026)

## Observações Importantes

1. **Sincronização de Datas:** Os triggers garantem que mudanças em `engenheiros_projetos.data_inicio` sejam refletidas em `prazos.data_inicio_projeto` e vice-versa.

2. **Cálculo de Prazos:** Os campos `prazo_interno_dias` e `prazo_cliente_dias` são calculados automaticamente pelo trigger ao inserir/atualizar na tabela `prazos`.

3. **Auto-Conclusão:** Quando o status de um projeto é alterado para "CONCLUIDO", a `data_conclusao` é preenchida automaticamente.

4. **Comando "menu":** Digite "menu" a qualquer momento para voltar ao menu principal (contexto será resetado).

5. **Contexto Persistente:** O contexto do dono é mantido entre mensagens até que o fluxo seja finalizado ou "menu" seja digitado.

