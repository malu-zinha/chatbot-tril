import React from 'react'
import { X, Search, Filter } from 'lucide-react'

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
  data_conclusao?: string
  dias_atraso: number
}

interface ProjetosTableProps {
  isOpen: boolean
  onClose: () => void
  data: Projeto[]
  initialFilter?: 'all' | 'concluido' | 'em_execucao' | 'atrasado'
  title?: string
  color?: 'primary' | 'success' | 'info' | 'danger'
}

export default function ProjetosTable({ 
  isOpen, 
  onClose, 
  data, 
  initialFilter = 'all',
  title = 'Listagem de Projetos',
  color = 'primary'
}: ProjetosTableProps) {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [filterStatus, setFilterStatus] = React.useState<string>(initialFilter)
  
  // Atualiza o filtro e limpa busca quando o modal abre com um filtro inicial
  React.useEffect(() => {
    if (isOpen) {
      if (initialFilter) {
        setFilterStatus(initialFilter)
      }
      // Limpa busca quando abre o modal
      setSearchTerm('')
    }
  }, [isOpen, initialFilter])

  if (!isOpen) return null

  // Mapa de cores para o header
  const colorClasses = {
    primary: 'from-tecpred-primary to-tecpred-secondary',
    success: 'from-success to-green-600',
    info: 'from-info to-blue-600',
    danger: 'from-danger to-red-600',
  }

  const filteredData = data.filter(item => {
    const matchesSearch = 
      item.codigo_projeto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.engenheiro_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.area_descricao.toLowerCase().includes(searchTerm.toLowerCase())
    
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
    
    return matchesSearch && matchesFilter
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col animate-fade-in">
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Nenhum projeto encontrado
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.projeto_id} className="hover:bg-gray-50 transition-colors">
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
                          {item.descricao.substring(0, 50)}...
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.data_conclusao 
                          ? 'bg-success text-white' 
                          : item.dias_atraso > 0
                          ? 'bg-danger text-white'
                          : 'bg-info text-white'
                      }`}>
                        {item.status_descricao}
                      </span>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {filteredData.length} de {data.length} projetos
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-tecpred-primary text-white rounded-lg hover:bg-tecpred-secondary transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

