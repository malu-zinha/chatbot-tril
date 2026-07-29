import React, { useCallback, useMemo, useEffect } from 'react'
import { AlertTriangle, Search, User, X } from 'lucide-react'
import {
  buildEngenheirosExecucao,
  type EngenheiroExecucaoGroup,
  type EngenheiroExecucaoProjeto,
} from '@/lib/engenheirosExecucao'
import { searchScore } from '@/lib/search'

interface EngenheirosExecucaoTableProps {
  isOpen: boolean
  onClose: () => void
  projetos: EngenheiroExecucaoProjeto[]
}

function formatPrazo(dataPrevista?: string) {
  if (!dataPrevista) return '-'
  return new Date(dataPrevista).toLocaleDateString('pt-BR')
}

function groupSearchScore(searchTerm: string, grupo: EngenheiroExecucaoGroup) {
  return searchScore(searchTerm, [
    grupo.engenheiro_nome,
    ...grupo.tarefas.flatMap((tarefa) => [
      tarefa.codigo_projeto,
      tarefa.cliente,
      tarefa.area_display_name,
      tarefa.area_descricao,
    ]),
  ])
}

export default function EngenheirosExecucaoTable({
  isOpen,
  onClose,
  projetos,
}: EngenheirosExecucaoTableProps) {
  const [searchTerm, setSearchTerm] = React.useState('')

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = ''
      }
    }
  }, [isOpen, handleKeyDown])

  useEffect(() => {
    if (isOpen) setSearchTerm('')
  }, [isOpen])

  const grupos = useMemo(() => buildEngenheirosExecucao(projetos), [projetos])
  const filteredGroups = useMemo(
    () => grupos
      .map((grupo) => ({ grupo, score: groupSearchScore(searchTerm, grupo) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.grupo),
    [grupos, searchTerm]
  )

  const totalTarefas = filteredGroups.reduce((acc, grupo) => acc + grupo.total_tarefas, 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-tecpred-primary to-tecpred-secondary p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Engenheiros em Execução</h2>
              <p className="text-white text-opacity-90 text-sm mt-1">
                {filteredGroups.length} engenheiro(s), {totalTarefas} tarefa(s) em execução
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
              aria-label="Fechar"
              type="button"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por engenheiro, código, cliente ou disciplina..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-tecpred-primary focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto bg-gray-50 p-4">
          {filteredGroups.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-500">
              Nenhum engenheiro com projetos em execução
            </div>
          ) : (
            <div className="flex min-w-max gap-4">
              {filteredGroups.map((grupo) => (
                <section
                  key={grupo.eng_id}
                  className="flex w-80 flex-shrink-0 flex-col rounded-lg border border-gray-200 bg-white"
                >
                  <div className="border-b border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-tecpred-primary text-white">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-gray-900">{grupo.engenheiro_nome}</h3>
                        <p className="text-xs text-gray-500">
                          {grupo.total_tarefas} tarefa(s)
                          {grupo.total_atrasadas > 0 ? `, ${grupo.total_atrasadas} atrasada(s)` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-3">
                    {grupo.tarefas.map((tarefa) => (
                      <article
                        key={tarefa.atribuicao_id || `${tarefa.projeto_id}-${tarefa.area_display_name}`}
                        className={`rounded-lg border p-3 text-sm shadow-sm ${
                          tarefa.dias_atraso > 0
                            ? 'border-red-200 bg-red-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-tecpred-primary">{tarefa.codigo_projeto}</div>
                            <div className="line-clamp-2 text-gray-900">{tarefa.cliente}</div>
                          </div>
                          {tarefa.dias_atraso > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-danger px-2 py-1 text-xs font-bold text-white">
                              <AlertTriangle className="h-3 w-3" />
                              {tarefa.dias_atraso}d
                            </span>
                          )}
                        </div>

                        <div className="mb-3 inline-flex rounded-full bg-tecpred-light px-2 py-1 text-xs font-medium text-tecpred-primary">
                          {tarefa.area_display_name}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-gray-200">
                            <div
                              className={`h-2 rounded-full ${
                                tarefa.percentual_andamento >= 75 ? 'bg-info' :
                                tarefa.percentual_andamento >= 50 ? 'bg-warning' :
                                'bg-gray-400'
                              }`}
                              style={{ width: `${Math.min(tarefa.percentual_andamento, 100)}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-xs font-semibold text-gray-700">
                            {tarefa.percentual_andamento.toFixed(0)}%
                          </span>
                        </div>

                        <div className="mt-2 text-xs text-gray-500">
                          Prazo: {formatPrazo(tarefa.data_prevista)}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="text-sm text-gray-600 text-center">
            Mostrando {filteredGroups.length} de {grupos.length} engenheiros
          </div>
        </div>
      </div>
    </div>
  )
}
