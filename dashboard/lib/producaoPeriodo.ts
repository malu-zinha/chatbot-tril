export interface ProducaoApontamentoPeriodo {
  eng_id: string
  engenheiro: string
  projeto_id: string
  codigo_projeto: string
  cliente: string
  area_id: string
  area_codigo: string
  area_descricao: string
  instancia_label: string | null
  data_retrabalho: string
  horas_trabalhadas_total: number | null
  horas_retrabalho: number | null
}

export interface ProducaoEngenheiroResumo {
  eng_id: string
  engenheiro: string
  horas_trabalhadas_total: number
  horas_retrabalho_total: number
}

export interface ProducaoDisciplinaDetalhe {
  area_id: string
  area_codigo: string
  area_descricao: string
  instancia_label: string | null
  disciplina: string
  horas_trabalhadas_total: number
  horas_retrabalho_total: number
}

export interface ProducaoProjetoDetalhe {
  projeto_id: string
  codigo_projeto: string
  cliente: string
  horas_trabalhadas_total: number
  horas_retrabalho_total: number
  disciplinas: ProducaoDisciplinaDetalhe[]
}

export interface ProducaoEngenheiroDetalhe extends ProducaoEngenheiroResumo {
  projetos: ProducaoProjetoDetalhe[]
}

export interface ProducaoPeriodo {
  resumo: ProducaoEngenheiroResumo[]
  detalhes: ProducaoEngenheiroDetalhe[]
}

export interface ProducaoPeriodoFiltro {
  dataInicio?: string
  dataFim?: string
}

function toNumber(value: number | null | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function sortByHoursThenName<T extends { horas_trabalhadas_total: number }>(
  a: T,
  b: T,
  getName: (item: T) => string
): number {
  return b.horas_trabalhadas_total - a.horas_trabalhadas_total || getName(a).localeCompare(getName(b), 'pt-BR')
}

function isApontamentoNoPeriodo(row: ProducaoApontamentoPeriodo, filtro: ProducaoPeriodoFiltro): boolean {
  if (filtro.dataInicio && row.data_retrabalho < filtro.dataInicio) return false
  if (filtro.dataFim && row.data_retrabalho > filtro.dataFim) return false
  return true
}

export function buildProducaoPeriodo(
  rows: ProducaoApontamentoPeriodo[],
  filtro: ProducaoPeriodoFiltro = {}
): ProducaoPeriodo {
  const engenheiros = new Map<string, ProducaoEngenheiroDetalhe>()
  const projetosPorEngenheiro = new Map<string, Map<string, ProducaoProjetoDetalhe>>()
  const disciplinasPorProjeto = new Map<string, Map<string, ProducaoDisciplinaDetalhe>>()

  for (const row of rows) {
    if (!isApontamentoNoPeriodo(row, filtro)) continue

    const horas = toNumber(row.horas_trabalhadas_total)
    const retrabalho = toNumber(row.horas_retrabalho)
    if (!row.eng_id || horas <= 0) continue

    let engenheiro = engenheiros.get(row.eng_id)
    if (!engenheiro) {
      engenheiro = {
        eng_id: row.eng_id,
        engenheiro: row.engenheiro || 'Sem nome',
        horas_trabalhadas_total: 0,
        horas_retrabalho_total: 0,
        projetos: [],
      }
      engenheiros.set(row.eng_id, engenheiro)
      projetosPorEngenheiro.set(row.eng_id, new Map())
    }

    engenheiro.horas_trabalhadas_total += horas
    engenheiro.horas_retrabalho_total += retrabalho

    const projetosMap = projetosPorEngenheiro.get(row.eng_id)!
    let projeto = projetosMap.get(row.projeto_id)
    if (!projeto) {
      projeto = {
        projeto_id: row.projeto_id,
        codigo_projeto: row.codigo_projeto,
        cliente: row.cliente,
        horas_trabalhadas_total: 0,
        horas_retrabalho_total: 0,
        disciplinas: [],
      }
      projetosMap.set(row.projeto_id, projeto)
      engenheiro.projetos.push(projeto)
      disciplinasPorProjeto.set(`${row.eng_id}|${row.projeto_id}`, new Map())
    }

    projeto.horas_trabalhadas_total += horas
    projeto.horas_retrabalho_total += retrabalho

    const disciplinaKey = [
      row.area_id,
      row.instancia_label || '',
    ].join('|')
    const disciplinasMap = disciplinasPorProjeto.get(`${row.eng_id}|${row.projeto_id}`)!
    let disciplina = disciplinasMap.get(disciplinaKey)
    if (!disciplina) {
      disciplina = {
        area_id: row.area_id,
        area_codigo: row.area_codigo,
        area_descricao: row.area_descricao,
        instancia_label: row.instancia_label,
        disciplina: row.instancia_label || row.area_descricao,
        horas_trabalhadas_total: 0,
        horas_retrabalho_total: 0,
      }
      disciplinasMap.set(disciplinaKey, disciplina)
      projeto.disciplinas.push(disciplina)
    }

    disciplina.horas_trabalhadas_total += horas
    disciplina.horas_retrabalho_total += retrabalho
  }

  const detalhes = Array.from(engenheiros.values())
    .map((engenheiro) => ({
      ...engenheiro,
      projetos: engenheiro.projetos
        .map((projeto) => ({
          ...projeto,
          disciplinas: projeto.disciplinas.sort((a, b) =>
            sortByHoursThenName(a, b, (disciplina) => disciplina.disciplina)
          ),
        }))
        .sort((a, b) => sortByHoursThenName(a, b, (projeto) => projeto.codigo_projeto)),
    }))
    .sort((a, b) => sortByHoursThenName(a, b, (engenheiro) => engenheiro.engenheiro))

  return {
    resumo: detalhes.map(({ projetos, ...resumo }) => resumo),
    detalhes,
  }
}

export function getProducaoDetalheEngenheiro(
  producao: ProducaoPeriodo,
  engId: string | null
): ProducaoEngenheiroDetalhe | null {
  if (!engId) return null
  return producao.detalhes.find((engenheiro) => engenheiro.eng_id === engId) || null
}
