# 📊 TecPred Dashboard - Visão Executiva em Tempo Real

Dashboard executivo desenvolvido para o Evandro (dono) visualizar o banco de dados ao vivo, com atualizações em tempo real.

## 🎨 Design

- **Cores:** Baseadas no logo TecPred (#2E3192 - azul escuro/roxo)
- **Responsivo:** Funciona perfeitamente em desktop, tablet e mobile
- **Tempo Real:** Atualização automática via Supabase Realtime
- **Animações:** Transições suaves e feedback visual

## 🚀 Features

### ✅ Blocos Implementados

1. **Visão Geral da Produção**
   - Total de Projetos
   - Projetos Concluídos
   - Projetos em Execução
   - Projetos Atrasados
   - Percentual Concluído Médio

2. **Gráfico: Projetos por Status** (Pizza)
   - Concluído
   - Em Andamento
   - Atrasado
   - Aguardando

3. **Gráfico: Carga de Trabalho** (Barras Empilhadas)
   - Dias Executados vs Dias Restantes
   - Por engenheiro

4. **Tabela: Atrasos por Engenheiro**
   - Qtde projetos atrasados
   - Qtde áreas atrasadas
   - Média de atraso
   - Atraso máximo

5. **Card: Retrabalho por Engenheiro**
   - Total de retrabalhos
   - Média geral
   - Detalhes por engenheiro

### ⚡ Tempo Real

- **Atualização automática** quando dados mudam no banco
- **Indicador visual** de conexão ao vivo
- **Timestamp** da última atualização
- **Animações** suaves nas transições

## 📦 Instalação

### 1. Instalar dependências

```bash
cd dashboard
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local` e adicione suas credenciais Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
```

### 3. Executar em desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

### 4. Build para produção

```bash
npm run build
npm start
```

## 🗄️ Pré-requisitos no Supabase

Execute os seguintes scripts SQL no Supabase (nesta ordem):

1. ✅ `MASTER_SCHEMA_COMPLETO.sql`
2. ✅ `tabela_evandro_dono.sql`
3. ✅ `functions_dono.sql`
4. ✅ `views_dashboard_blocos.sql`
5. ✅ `security_policies.sql`

**Views necessárias:**
- `vw_bloco1_visao_geral`
- `vw_bloco2_atrasos_engenheiro`
- `vw_bloco3_carga_trabalho`
- `vw_bloco5_retrabalho_engenheiro`
- `vw_grafico_projetos_status`

## 🔐 Segurança

O dashboard usa as políticas RLS configuradas no Supabase.

**Para o dono ter acesso:**

Configure o JWT claims com:
```json
{
  "role": "dono",
  "email": "evandro@empresa.com"
}
```

## 📱 Responsividade

- ✅ **Desktop:** Layout em grid com 4 colunas
- ✅ **Tablet:** Layout adaptativo com 2 colunas
- ✅ **Mobile:** Layout em coluna única

## 🎨 Customização de Cores

Edite `tailwind.config.js` para personalizar as cores:

```js
colors: {
  tecpred: {
    primary: '#2E3192',    // Azul principal
    secondary: '#4A4FB7',  // Azul médio
    accent: '#6B70D9',     // Azul claro
    dark: '#1A1D5E',       // Azul escuro
    light: '#E8E9F8',      // Azul muito claro
  },
}
```

## 🧩 Componentes

### `Header`
- Logo TecPred
- Status de conexão
- Timestamp da última atualização

### `KPICard`
- Card de métrica com ícone
- Suporte a trends (↑ ↓ →)
- 5 variantes de cor

### `ProjetosStatusChart`
- Gráfico de pizza (Recharts)
- Tooltips interativos
- Legendas personalizadas

### `CargaTrabalhoChart`
- Gráfico de barras empilhadas
- Dias executados vs restantes
- Detalhes por engenheiro

### `AtrasosTable`
- Tabela responsiva
- Destaque para maiores atrasos
- Badges coloridos

### `RetrabalhoCard`
- Resumo de retrabalhos
- Ranking de engenheiros
- Indicadores visuais

## 📊 Estrutura de Dados

```typescript
interface VisaoGeral {
  total_projetos: number
  projetos_concluidos: number
  projetos_em_execucao: number
  projetos_atrasados: number
  percentual_concluido_medio: number
  total_areas: number
  areas_concluidas: number
  areas_ativas: number
}

// ... outros tipos em lib/supabase.ts
```

## 🔄 Fluxo de Atualização em Tempo Real

```
1. Usuário abre dashboard
2. Carrega dados iniciais
3. Conecta ao Supabase Realtime
4. Escuta mudanças nas tabelas:
   - engenheiros_projetos
   - projetos_previsao
   - retrabalho_projetos
5. Quando há mudança → recarrega dados
6. UI atualiza automaticamente
```

## 🐛 Troubleshooting

### Dashboard não atualiza em tempo real

**Solução:** Verifique se Realtime está habilitado no Supabase:
- Dashboard Supabase → Database → Replication
- Habilite replicação nas tabelas necessárias

### Erro "Failed to fetch"

**Solução:** Verifique:
1. URL e chave do Supabase em `.env.local`
2. RLS policies permitem acesso
3. Views foram criadas corretamente

### Gráficos vazios

**Solução:**
1. Insira dados de teste no banco
2. Verifique queries nas views
3. Confira console do browser (F12)

## 🚀 Deploy

### Vercel (Recomendado)

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Adicionar variáveis de ambiente na dashboard Vercel
```

### Netlify

```bash
# 1. Build
npm run build

# 2. Deploy pasta .next
netlify deploy --prod --dir=.next
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📈 Performance

- **Lazy loading** de componentes
- **Memoização** de dados pesados
- **Debounce** em atualizações
- **Otimização** de queries

## 📝 Licença

Desenvolvido para **TecPred**.

---

## 🎯 Roadmap

- [ ] Adicionar filtros por período
- [ ] Exportar dados para Excel
- [ ] Notificações push
- [ ] Modo escuro
- [ ] Gráficos adicionais
- [ ] Dashboard mobile app

---

**Desenvolvido com ❤️ usando Next.js + Supabase + TailwindCSS**

**Última atualização:** Janeiro 2026

