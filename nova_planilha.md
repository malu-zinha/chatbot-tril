# Adaptação da Planilha para o Novo Sistema N:N

## Visão Geral

Com o novo schema de banco de dados, a planilha do Google Sheets precisa ser adaptada para representar o relacionamento N:N entre engenheiros, projetos e áreas.

## Mudança Principal

### Antes (Schema 1:N)
- **Uma linha = um projeto**
- Coluna "Área" com texto livre (ex: "elétrica")
- Um projeto aparecia uma vez na planilha

### Agora (Schema N:N)
- **Uma linha = uma atribuição (projeto + área)**
- Mesmo projeto pode ter múltiplas linhas (uma por área)
- Coluna "Área" preenchida com descrição da tabela `areas` do banco
- Coluna "Status" preenchida com descrição da tabela `status_codes` do banco

## Estrutura da Planilha

### Headers (Linha 2)
A planilha mantém os mesmos headers na linha 2:
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
- K: Data de Início
- L: Data de Previsão de entrega (interna)
- M: Data Final (acordado com o cliente)
- N: Prazo Interno (dias úteis)
- O: Prazo Cliente (dias úteis)
- P: Dias de atraso
- Q: Status do projeto
- R: Previsão para o dia
- S: Feito ao final do dia
- T: Necessitou de retrabalho?
- U: motivo da revisão
- V: Data do registro do retrabalho
- W: Etapa
- X: % executado
- Y: Observações
- Z: Métrica de retrabalho
- AA: Dias estimados (dias úteis)
- AB: Data de entrega real
- AC: Lead Time (dias úteis)
- AD: Dias Parado cliente (dias úteis)
- AE: Dias parado TecPred (dias úteis)

### Dados (Linha 3 em diante)

**Exemplo de múltiplas áreas do mesmo projeto:**

| Código | Cliente | Área | Status | % executado |
|--------|---------|------|--------|-------------|
| PRJ-001 | Cliente ABC | Elétrico | Em Execução | 35 |
| PRJ-001 | Cliente ABC | Hidráulico | Em Planejamento | 5 |
| PRJ-002 | Cliente XYZ | Climatização | Em Aprovação | 80 |

**Observações:**
- Mesmo código de projeto (PRJ-001) aparece duas vezes
- Cada linha representa uma área diferente
- Cada linha tem seu próprio status e percentual

## Como Funciona a Sincronização

### BD → Planilha (Automática a cada 5 minutos)

1. Sistema busca todas as atribuições ativas do engenheiro
2. Para cada atribuição:
   - Busca projeto por `projeto_id`
   - Busca área por `area_id` → obtém descrição
   - Busca status por `status_id` → obtém descrição
   - Busca última previsão do dia
   - Busca último retrabalho
   - Busca prazos
3. Cria uma linha na planilha com todos os dados
4. Limpa planilha antiga e escreve todas as linhas novas

**Resultado:**
- Se um projeto tem 2 áreas, aparecerão 2 linhas na planilha
- Se um projeto tem 1 área, aparecerá 1 linha na planilha

### Planilha → BD (Manual via Chatbot)

Quando o engenheiro edita dados via chatbot:
1. Chatbot identifica qual atribuição editar (projeto + área)
2. Atualiza campo específico na tabela `engenheiros_projetos`
3. Sincronização automática atualiza a planilha em ~5 minutos

## Mapeamento de Colunas

### Colunas que vêm do Projeto (tabela `projetos`)
- **Código do Projeto** → `projetos.codigo_projeto`
- **Cliente** → `projetos.cliente`
- **Contato** → (não está no novo schema, pode ser adicionado depois)
- **Obra** → (não está no novo schema, pode ser adicionado depois)
- **Tipo de Projeto** → (não está no novo schema, pode ser adicionado depois)
- **Descrição do projeto** → `projetos.descricao`

### Colunas que vêm da Atribuição (tabela `engenheiros_projetos`)
- **Área** → `areas.descricao` (via `engenheiros_projetos.area_id`)
- **Eng. Responsável** → `engenheiros.nome` (via `engenheiros_projetos.eng_id`)
- **Data de Início** → `engenheiros_projetos.data_inicio`
- **Data de Previsão de entrega (interna)** → `engenheiros_projetos.data_prevista`
- **Status do projeto** → `status_codes.descricao` (via `engenheiros_projetos.status_id`)
- **% executado** → `engenheiros_projetos.percentual_andamento`
- **Etapa** → `status_codes.descricao` (mesmo que status por enquanto)

### Colunas que vêm de Tabelas Relacionadas
- **Previsão para o dia** → `projetos_previsao.previsao_texto` (última do dia)
- **Feito ao final do dia** → `projetos_previsao.feito_texto` (última do dia)
- **Necessitou de retrabalho?** → `retrabalho_projetos.necessitou_retrabalho` (último)
- **motivo da revisão** → `retrabalho_projetos.motivo_retrabalho` (último)
- **Data do registro do retrabalho** → `retrabalho_projetos.data_retrabalho` (último)
- **Observações** → `engenheiros_projetos.observacoes`
- **Prazo Interno (dias úteis)** → `prazos.prazo_interno_dias`
- **Prazo Cliente (dias úteis)** → `prazos.prazo_cliente_dias`
- **Data Final (acordado com o cliente)** → `prazos.prazo_final_cliente`

## Exemplo Prático

### Cenário: Engenheiro João trabalha em PRJ-001 nas áreas Elétrico e Hidráulico

**No Banco de Dados:**
```
Tabela projetos:
  - projeto_id: uuid-123
  - codigo_projeto: PRJ-001
  - cliente: Cliente ABC

Tabela engenheiros_projetos:
  - Atribuição 1:
    - id: uuid-attr-1
    - eng_id: uuid-joao
    - projeto_id: uuid-123
    - area_id: 1 (Elétrico)
    - status_id: 5 (Em Execução)
    - percentual_andamento: 35
  
  - Atribuição 2:
    - id: uuid-attr-2
    - eng_id: uuid-joao
    - projeto_id: uuid-123
    - area_id: 2 (Hidráulico)
    - status_id: 2 (Em Planejamento)
    - percentual_andamento: 5
```

**Na Planilha (após sincronização):**

| Linha | Código | Cliente | Área | Status | % executado |
|-------|--------|---------|------|--------|-------------|
| 3 | PRJ-001 | Cliente ABC | Elétrico | Em Execução | 35 |
| 4 | PRJ-001 | Cliente ABC | Hidráulico | Em Planejamento | 5 |

## Ações Necessárias

### 1. Ajustar Fórmulas (se houver)
Se a planilha tinha fórmulas que assumiam uma linha por projeto, elas precisam ser ajustadas.

**Exemplo:**
- Fórmula antiga: `=COUNTIF(A:A, "PRJ-001")` → contava 1
- Fórmula nova: `=COUNTIF(A:A, "PRJ-001")` → conta 2 (uma por área)

### 2. Ajustar Filtros e Visualizações
Se houver filtros ou visualizações que agrupam por código de projeto, podem precisar de ajuste.

### 3. Verificar Sincronização
Após aplicar o novo schema:
1. Criar um projeto com múltiplas áreas via chatbot
2. Aguardar sincronização (5 minutos)
3. Verificar se aparecem múltiplas linhas na planilha
4. Verificar se dados estão corretos

### 4. Backup
**IMPORTANTE:** Fazer backup da planilha antes de aplicar o novo schema, pois a sincronização vai limpar e reescrever todas as linhas.

## Perguntas Frequentes

### Q: E se eu quiser ver apenas os projetos (sem áreas separadas)?
**R:** Use filtros na planilha para agrupar por código de projeto, ou crie uma view no banco que agrupe atribuições por projeto.

### Q: Como editar uma área específica de um projeto?
**R:** Via chatbot, escolha "Editar projeto existente" e selecione o projeto. O sistema mostrará todas as áreas do projeto para você escolher qual editar.

### Q: E se eu quiser adicionar uma nova área a um projeto existente?
**R:** Por enquanto, isso precisa ser feito diretamente no banco de dados. Uma funcionalidade futura do chatbot pode permitir isso.

### Q: A planilha vai ficar muito grande com múltiplas linhas?
**R:** Sim, se um projeto tem muitas áreas, terá muitas linhas. Mas isso é necessário para representar corretamente o relacionamento N:N. Considere usar filtros ou criar uma planilha resumida separada.

## Checklist de Adaptação

- [ ] Fazer backup da planilha atual
- [ ] Aplicar novo schema no Supabase (`new_db_schema.sql`)
- [ ] Criar tabela de autenticação (`engenheiros_auth.sql`)
- [ ] Aplicar seeds (`seed_areas_completo.sql`, `seed_status_detalhado.sql`)
- [ ] Testar criação de projeto com múltiplas áreas via chatbot
- [ ] Verificar sincronização automática (aguardar 5 minutos)
- [ ] Verificar se múltiplas linhas aparecem corretamente na planilha
- [ ] Ajustar fórmulas/filtros se necessário
- [ ] Testar edição de projeto via chatbot
- [ ] Testar notificações diárias (manhã/noite)
- [ ] Verificar se dados estão sendo salvos corretamente no banco

## Suporte

Em caso de dúvidas ou problemas:
1. Verificar logs do bot no terminal
2. Verificar se Supabase está conectado
3. Verificar se seeds foram aplicados corretamente
4. Verificar se sincronização está rodando (logs a cada 5 minutos)

