import React, { useEffect, useCallback } from 'react'
import { X, Search, AlertTriangle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { searchScore } from '@/lib/search'

interface Projeto {
  projeto_id: string
  codigo_projeto: string
  cliente: string
  descricao?: string
  engenheiro_nome: string
  area_descricao: string
  status_descricao: string
  percentual_andamento: number
  data_inicio?: string
  data_prevista?: string
  data_conclusao?: string | null
  dias_atraso: number
  created_at?: string
  motivo_aguardo?: string
}

interface ProjetosTableProps {
  isOpen: boolean
  onClose: () => void
  data: Projeto[]
  initialFilter?: 'all' | 'concluido' | 'em_execucao' | 'atrasado'
  title?: string
  color?: 'primary' | 'success' | 'info' | 'danger' | 'warning'
  onVerRetrabalho?: (projeto: Projeto) => void
}

export default function ProjetosTable({ 
  isOpen, 
  onClose, 
  data, 
  initialFilter = 'all',
  title = 'Listagem de Projetos',
  color = 'primary',
  onVerRetrabalho,
}: ProjetosTableProps) {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [filterStatus, setFilterStatus] = React.useState<string>(initialFilter)
  const [tooltipOpen, setTooltipOpen] = React.useState<string | null>(null)
  const [expandedConcluidas, setExpandedConcluidas] = React.useState<Set<string>>(new Set())
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  // Trava scroll do body quando modal abre, destrava quando fecha
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Atualiza o filtro e limpa busca quando o modal abre com um filtro inicial
  React.useEffect(() => {
    if (isOpen) {
      if (initialFilter) {
        setFilterStatus(initialFilter)
      }
      // Limpa busca quando abre o modal
      setSearchTerm('')
      setExpandedConcluidas(new Set())
    }
  }, [isOpen, initialFilter])

  // Mapa de cores para o header
  const colorClasses = {
    primary: 'from-tecpred-primary to-tecpred-secondary',
    success: 'from-success to-green-600',
    info: 'from-info to-blue-600',
    danger: 'from-danger to-red-600',
    warning: 'from-tecpred-orange to-tecpred-coral',
  }

  const isStatusAguardando = (status?: string) =>
    (status || '').toLowerCase().includes('aguard')

  const getMotivoAguardo = (item: Projeto) =>
    item.motivo_aguardo?.trim() ||
    item.descricao?.trim() ||
    'Sem motivo de aguardo registrado.'

  const getMotivoAtraso = (item: Projeto) =>
    item.motivo_aguardo?.trim() ||
    `Projeto atrasado há ${item.dias_atraso} dia(s). Nenhuma observação registrada.`

  const isDisciplinaConcluida = (item: Projeto) =>
    Boolean(item.data_conclusao) || item.percentual_andamento >= 100

  const disciplinasConcluidasPorProjeto = React.useMemo(() => {
    const grupos = new Map<string, Projeto[]>()
    const chavesPorProjeto = new Map<string, Set<string>>()

    for (const item of data) {
      if (!isDisciplinaConcluida(item)) continue

      const chave = `${item.area_descricao}|${item.engenheiro_nome}`
      if (!chavesPorProjeto.has(item.projeto_id)) chavesPorProjeto.set(item.projeto_id, new Set())
      const chaves = chavesPorProjeto.get(item.projeto_id)!
      if (chaves.has(chave)) continue

      chaves.add(chave)
      if (!grupos.has(item.projeto_id)) grupos.set(item.projeto_id, [])
      grupos.get(item.projeto_id)!.push(item)
    }

    return grupos
  }, [data])

  const showConcluidas = filterStatus === 'em_execucao'
  const totalColunas = 8 + (showConcluidas ? 1 : 0) + (onVerRetrabalho ? 1 : 0)

  const toggleConcluidas = (projetoId: string) => {
    setExpandedConcluidas((prev) => {
      const next = new Set(prev)
      if (next.has(projetoId)) {
        next.delete(projetoId)
      } else {
        next.add(projetoId)
      }
      return next
    })
  }

  const filteredData = data
    .map(item => {
      // Filtro mais preciso baseado no estado real do projeto
      let matchesFilter = false

      if (filterStatus === 'all') {
        matchesFilter = true
      } else if (filterStatus === 'concluido') {
        // Projeto concluído: tem data_conclusao OU percentual = 100%
        matchesFilter = (item.data_conclusao !== null && item.data_conclusao !== undefined) ||
                        item.percentual_andamento >= 100
      } else if (filterStatus === 'em_execucao') {
        // Em execução: não concluído (sem data_conclusao E percentual < 100) E não atrasado
        matchesFilter = (item.data_conclusao === null || item.data_conclusao === undefined) &&
                        item.percentual_andamento < 100 &&
                        item.dias_atraso === 0
      } else if (filterStatus === 'atrasado') {
        // Atrasado: tem dias de atraso
        matchesFilter = item.dias_atraso > 0
      }

      // Pontuação de relevância da busca (0 = não casa). Só pontua se passou no filtro.
      const score = matchesFilter
        ? searchScore(searchTerm, [
            item.codigo_projeto,
            item.cliente,
            item.engenheiro_nome,
            item.area_descricao,
          ])
        : 0

      return { item, score }
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score) // mais relevantes primeiro (empate mantém ordem)
    .map(entry => entry.item)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col animate-fade-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={`bg-gradient-to-r ${colorClasses[color]} p-6 rounded-t-xl`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">{title}</h2>
              <p className="text-white text-opacity-90 text-sm mt-1">
                {filteredData.length} projeto(s) encontrado(s)
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Busca */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por código, cliente, engenheiro ou área..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tecpred-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabela */}
        <div className="flex-1 overflow-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Engenheiro
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Área
                </th>
                {showConcluidas && (
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Concluidas
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Progresso
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Prazo
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Atraso
                </th>
                {onVerRetrabalho && (
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Retrabalho
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={totalColunas} className="px-6 py-12 text-center text-gray-500">
                    Nenhum projeto encontrado
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => {
                  const rowKey = `${item.projeto_id}-${item.area_descricao}-${item.engenheiro_nome}-${index}`
                  const concluidas = disciplinasConcluidasPorProjeto.get(item.projeto_id) || []
                  const isExpanded = expandedConcluidas.has(item.projeto_id)

                  return (
                  <React.Fragment key={rowKey}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-tecpred-primary">
                        {item.codigo_projeto}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {item.cliente}
                      </div>
                      {item.descricao && (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.descricao.length > 50 ? item.descricao.substring(0, 50) + '...' : item.descricao}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.engenheiro_nome}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-tecpred-light text-tecpred-primary rounded-full">
                        {item.area_descricao}
                      </span>
                    </td>
                    {showConcluidas && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => toggleConcluidas(item.projeto_id)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                            concluidas.length > 0
                              ? 'text-green-700 bg-green-50 hover:bg-green-100 border-green-200'
                              : 'text-gray-500 bg-gray-50 border-gray-200'
                          }`}
                          title={`Ver disciplinas concluidas de ${item.codigo_projeto}`}
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          {concluidas.length > 0 ? `${concluidas.length} concluida(s)` : 'Nenhuma'}
                        </button>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isStatusAguardando(item.status_descricao) ? (
                        <div
                          className="relative inline-block"
                          onMouseEnter={() => setTooltipOpen(rowKey)}
                          onMouseLeave={() => setTooltipOpen(null)}
                        >
                          <span className="px-2 py-1 text-xs font-medium rounded-full cursor-help bg-yellow-400 text-white">
                            {item.status_descricao}
                          </span>
                          {tooltipOpen === rowKey && (
                            <div className="absolute left-0 top-full mt-2 z-50 w-72 rounded-lg border border-yellow-200 bg-white p-3 text-xs text-gray-700 shadow-xl">
                              <div className="mb-1 font-semibold text-yellow-700">Motivo do aguardo</div>
                              <div className="whitespace-normal leading-relaxed">
                                {getMotivoAguardo(item)}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : item.dias_atraso > 0 ? (
                        <div
                          className="relative inline-block"
                          onMouseEnter={() => setTooltipOpen(rowKey)}
                          onMouseLeave={() => setTooltipOpen(null)}
                        >
                          <span className="px-2 py-1 text-xs font-medium rounded-full cursor-help bg-danger text-white">
                            {item.status_descricao}
                          </span>
                          {tooltipOpen === rowKey && (
                            <div className="absolute left-0 top-full mt-2 z-50 w-72 rounded-lg border border-red-200 bg-white p-3 text-xs text-gray-700 shadow-xl">
                              <div className="mb-1 font-semibold text-red-700">Motivo do atraso</div>
                              <div className="whitespace-normal leading-relaxed">
                                {getMotivoAtraso(item)}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.data_conclusao
                            ? 'bg-success text-white'
                            : 'bg-info text-white'
                        }`}>
                          {item.status_descricao}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              item.percentual_andamento >= 100 ? 'bg-success' :
                              item.percentual_andamento >= 75 ? 'bg-info' :
                              item.percentual_andamento >= 50 ? 'bg-warning' :
                              'bg-gray-400'
                            }`}
                            style={{ width: `${Math.min(item.percentual_andamento, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-12 text-right">
                          {item.percentual_andamento.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900">
                        {item.data_prevista 
                          ? new Date(item.data_prevista).toLocaleDateString('pt-BR')
                          : '-'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {item.dias_atraso > 0 ? (
                        <span className="px-2 py-1 text-xs font-bold bg-danger text-white rounded-full">
                          {item.dias_atraso} dias
                        </span>
                      ) : (
                        <span className="text-sm text-success">No prazo</span>
                      )}
                    </td>
                    {onVerRetrabalho && (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => onVerRetrabalho(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors"
                          title={`Ver retrabalhos de ${item.codigo_projeto}`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Ver
                        </button>
                      </td>
                    )}
                  </tr>
                  {showConcluidas && isExpanded && (
                    <tr className="bg-green-50/40">
                      <td colSpan={totalColunas} className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                          <span className="font-semibold text-gray-900">Disciplinas concluidas:</span>
                          {concluidas.length > 0 ? (
                            concluidas.map((disciplina) => (
                              <span
                                key={`${disciplina.area_descricao}-${disciplina.engenheiro_nome}`}
                                className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-white px-3 py-1 text-xs font-medium text-green-700"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                {disciplina.area_descricao} - {disciplina.engenheiro_nome}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500">Nenhuma concluida.</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="text-sm text-gray-600 text-center">
            Mostrando {filteredData.length} de {data.length} projetos
          </div>
        </div>
      </div>
    </div>
  )
}

