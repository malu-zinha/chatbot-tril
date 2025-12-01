# 📡 Documentação das APIs - Edge Functions

## Base URL

```
https://[seu-projeto].supabase.co/functions/v1/
```

## Autenticação

Todas as requisições devem incluir o header:

```
apikey: [sua-supabase-anon-key]
```

---

## 1. Registrar Execução Diária

### `POST /registrarExecucao`

Registra a execução diária de um projeto.

#### Request

```json
{
  "projeto_id": "uuid-do-projeto",
  "data": "2024-01-15",  // opcional, default: hoje
  "percentual_previsto": 10,  // opcional
  "percentual_realizado": 8,  // obrigatório
  "observacoes": "Atraso devido à chuva"  // opcional
}
```

#### Response (Sucesso - 200)

```json
{
  "success": true,
  "message": "Execução registrada com sucesso",
  "data": {
    "id": "uuid-da-execucao",
    "projeto": "Nome do Projeto",
    "data": "2024-01-15",
    "percentual_realizado": 8,
    "percentual_acumulado": 45
  }
}
```

#### Response (Erro - 400/404/500)

```json
{
  "success": false,
  "error": "Mensagem de erro descritiva"
}
```

#### Validações

- `projeto_id`: Obrigatório, deve existir no banco
- `percentual_realizado`: Obrigatório, entre 0 e 100
- `percentual_previsto`: Opcional, entre 0 e 100
- `data`: Opcional, formato ISO (YYYY-MM-DD)

---

## 2. Registrar Retrabalho

### `POST /registrarRetrabalho`

Registra um retrabalho em um projeto.

#### Request

```json
{
  "projeto_id": "uuid-do-projeto",
  "data": "2024-01-15",  // opcional, default: hoje
  "motivo": "Erro de Projeto",  // obrigatório
  "categoria": "Técnico",  // opcional, será classificado automaticamente
  "descricao": "Erro no dimensionamento dos cabos elétricos",  // obrigatório
  "impacto_percentual": 5,  // opcional
  "tempo_perdido_horas": 8,  // opcional
  "acao_corretiva": "Refazer o cabeamento com dimensionamento correto"  // opcional
}
```

#### Response (Sucesso - 200)

```json
{
  "success": true,
  "message": "Retrabalho registrado com sucesso",
  "data": {
    "id": "uuid-do-retrabalho",
    "projeto": "Nome do Projeto",
    "data": "2024-01-15",
    "motivo": "Erro de Projeto",
    "categoria": "Técnico",
    "impacto_percentual": 5,
    "total_retrabalhos_projeto": 3
  }
}
```

#### Validações

- `projeto_id`: Obrigatório
- `motivo`: Obrigatório, mínimo 5 caracteres
- `descricao`: Obrigatório, mínimo 10 caracteres
- `impacto_percentual`: Opcional, entre 0 e 100
- `tempo_perdido_horas`: Opcional, >= 0

#### Categorias Automáticas

O sistema classifica automaticamente em:
- **Técnico**: Erros de projeto, planejamento, execução
- **Cliente**: Mudanças de escopo, alterações de projeto
- **Fornecedor**: Problemas de material, atrasos
- **Planejamento**: Falta de recursos, cronograma inadequado
- **Externo**: Clima, problemas regulatórios

---

## 3. Consultar Status do Projeto

### `GET /statusProjeto`

Retorna o status completo de um projeto.

#### Query Parameters

- `projeto_id`: UUID do projeto (opcional)
- `codigo`: Código do projeto (opcional, alternativa ao projeto_id)
- `detalhado`: `true` ou `false` (opcional, default: false)

#### Exemplo

```
GET /statusProjeto?codigo=PRJ-001
GET /statusProjeto?projeto_id=uuid&detalhado=true
```

#### Response (Sucesso - 200)

```json
{
  "success": true,
  "data": {
    "projeto": {
      "id": "uuid",
      "codigo": "PRJ-001",
      "nome": "Instalação Elétrica Prédio A",
      "cliente": "Construtora ABC",
      "area": "Elétrico",
      "tipo_obra": "Predial",
      "status": "Em Execução",
      "data_inicio": "2024-01-01",
      "data_previsao_termino": "2024-03-30",
      "engenheiro": {
        "id": "uuid",
        "nome": "João Silva",
        "whatsapp": "+5511999999999",
        "email": "joao@example.com"
      }
    },
    "progresso": {
      "percentual_total": 45.5,
      "fase": "Em Andamento",
      "tendencia": "acelerando"
    },
    "execucoes_recentes": [
      {
        "data": "2024-01-15",
        "percentual_previsto": 10,
        "percentual_realizado": 8,
        "percentual_acumulado": 45.5,
        "observacoes": "..."
      }
    ],
    "retrabalhos": [
      {
        "data": "2024-01-14",
        "motivo": "Erro de Projeto",
        "categoria": "Técnico",
        "impacto_percentual": 5,
        "descricao": "..."
      }
    ],
    "estatisticas": {
      "percentual_total": 45.5,
      "total_dias_registrados": 15,
      "total_retrabalhos": 2,
      "impacto_total_retrabalho": 8,
      "tempo_total_perdido_horas": 16,
      "media_execucao_diaria": 7.5,
      "ultima_atualizacao": "2024-01-15",
      "dias_restantes": 75,
      "tendencia": "acelerando",
      "fase": "Em Andamento"
    }
  }
}
```

---

## Códigos de Status HTTP

| Código | Significado |
|--------|-------------|
| 200 | Sucesso |
| 400 | Requisição inválida (erro de validação) |
| 404 | Recurso não encontrado |
| 405 | Método não permitido |
| 500 | Erro interno do servidor |

---

## Tratamento de Erros

Todas as respostas de erro seguem o formato:

```json
{
  "success": false,
  "error": "Descrição do erro",
  "details": "Detalhes técnicos (opcional)"
}
```

---

## Rate Limits

- **Supabase Free Tier**: 500,000 requests/mês
- **Google Sheets API**: 100 requests/100 segundos/usuário

---

## Exemplos de Integração

### JavaScript/TypeScript

```typescript
const response = await fetch('https://[seu-projeto].supabase.co/functions/v1/registrarExecucao', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'sua-supabase-anon-key',
  },
  body: JSON.stringify({
    projeto_id: 'uuid',
    percentual_realizado: 8,
    percentual_previsto: 10,
  }),
});

const data = await response.json();
console.log(data);
```

### cURL

```bash
curl -X POST https://[seu-projeto].supabase.co/functions/v1/registrarExecucao \
  -H "Content-Type: application/json" \
  -H "apikey: sua-supabase-anon-key" \
  -d '{
    "projeto_id": "uuid",
    "percentual_realizado": 8
  }'
```

---

**Última atualização**: Novembro 2024

