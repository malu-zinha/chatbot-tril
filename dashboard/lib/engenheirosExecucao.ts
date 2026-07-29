import { getProjetoAreaDisplayName } from './compatibilizacao.ts'
import { projetoMatchesStatusFilter } from './projetoFilters.ts'

export interface EngenheiroExecucaoProjeto {
  atribuicao_id?: string
  eng_id?: string | null
  area_id?: string | null
  projeto_id: string
  codigo_projeto: string
  cliente: string
  engenheiro_nome: string
  area_codigo?: string
  area_descricao: string
  instancia_label?: string | null
  percentual_andamento: number
  data_prevista?: string
  data_conclusao?: string | null
  dias_atraso: number
}

export interface EngenheiroExecucaoTarefa extends EngenheiroExecucaoProjeto {
  area_display_name: string
}

export interface EngenheiroExecucaoGroup {
  eng_id: string
  engenheiro_nome: string
  total_tarefas: number
  total_atrasadas: number
  tarefas: EngenheiroExecucaoTarefa[]
}

function getPrazoTime(dataPrevista?: string) {
  if (!dataPrevista) return Number.POSITIVE_INFINITY
  const time = new Date(dataPrevista).getTime()
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

function compareTarefas(a: EngenheiroExecucaoTarefa, b: EngenheiroExecucaoTarefa) {
  if (a.dias_atraso > 0 && b.dias_atraso <= 0) return -1
  if (a.dias_atraso <= 0 && b.dias_atraso > 0) return 1

  const prazoDiff = getPrazoTime(a.data_prevista) - getPrazoTime(b.data_prevista)
  if (prazoDiff !== 0) return prazoDiff

  return a.codigo_projeto.localeCompare(b.codigo_projeto, 'pt-BR')
}

export function buildEngenheirosExecucao(
  projetos: EngenheiroExecucaoProjeto[]
): EngenheiroExecucaoGroup[] {
  const grupos = new Map<string, EngenheiroExecucaoGroup>()

  for (const projeto of projetos) {
    if (!projetoMatchesStatusFilter(projeto, 'em_execucao')) continue

    const engId = projeto.eng_id || projeto.engenheiro_nome || 'sem-engenheiro'
    const engenheiroNome = projeto.engenheiro_nome || 'Sem engenheiro'

    if (!grupos.has(engId)) {
      grupos.set(engId, {
        eng_id: engId,
        engenheiro_nome: engenheiroNome,
        total_tarefas: 0,
        total_atrasadas: 0,
        tarefas: [],
      })
    }

    const grupo = grupos.get(engId)!
    const tarefa = {
      ...projeto,
      area_display_name: getProjetoAreaDisplayName(projeto),
    }

    grupo.tarefas.push(tarefa)
    grupo.total_tarefas += 1
    if (projeto.dias_atraso > 0) grupo.total_atrasadas += 1
  }

  return Array.from(grupos.values())
    .map((grupo) => ({
      ...grupo,
      tarefas: [...grupo.tarefas].sort(compareTarefas),
    }))
    .sort((a, b) => {
      const cargaDiff = b.total_tarefas - a.total_tarefas
      if (cargaDiff !== 0) return cargaDiff
      const atrasoDiff = b.total_atrasadas - a.total_atrasadas
      if (atrasoDiff !== 0) return atrasoDiff
      return a.engenheiro_nome.localeCompare(b.engenheiro_nome, 'pt-BR')
    })
}
