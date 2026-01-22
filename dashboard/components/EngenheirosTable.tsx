import React from 'react'
import { X, Search, User } from 'lucide-react'

interface Engenheiro {
  eng_id: string
  nome: string
  exclusivo: boolean
  total_projetos: number
  areas_ativas: number
  media_percentual: number
  total_retrabalhos: number
  dias_trabalho_pendentes: number
  areas_atrasadas: number
}

interface EngenheirosTableProps {
  isOpen: boolean
  onClose: () => void
  data: Engenheiro[]
}

export default function EngenheirosTable({ isOpen, onClose, data }: EngenheirosTableProps) {
  const [searchTerm, setSearchTerm] = React.useState('')

  if (!isOpen) return null

  const filteredData = data.filter(item =>
    item.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-tecpred-primary to-tecpred-secondary p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Listagem de Engenheiros</h2>
              <p className="text-tecpred-light text-sm mt-1">
                {filteredData.length} engenheiro(s) encontrado(s)
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
              placeholder="Buscar engenheiro..."
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
                  Engenheiro
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Projetos
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Áreas Ativas
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Progresso Médio
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Retrabalhos
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Dias Pendentes
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Áreas Atrasadas
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Nenhum engenheiro encontrado
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.eng_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-tecpred-primary rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            {item.nome}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {item.exclusivo ? (
                        <span className="px-2 py-1 text-xs font-medium bg-tecpred-accent text-white rounded-full">
                          Exclusivo
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">
                          Freelancer
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-bold text-gray-900">
                        {item.total_projetos}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {item.areas_ativas}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              item.media_percentual >= 75 ? 'bg-success' :
                              item.media_percentual >= 50 ? 'bg-info' :
                              'bg-warning'
                            }`}
                            style={{ width: `${Math.min(item.media_percentual, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-12 text-right">
                          {item.media_percentual.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {item.total_retrabalhos > 0 ? (
                        <span className="px-2 py-1 text-xs font-bold bg-warning text-white rounded-full">
                          {item.total_retrabalhos}
                        </span>
                      ) : (
                        <span className="text-sm text-success">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`text-sm font-medium ${
                        item.dias_trabalho_pendentes > 30 ? 'text-danger' :
                        item.dias_trabalho_pendentes > 15 ? 'text-warning' :
                        'text-gray-900'
                      }`}>
                        {item.dias_trabalho_pendentes} dias
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {item.areas_atrasadas > 0 ? (
                        <span className="px-2 py-1 text-xs font-bold bg-danger text-white rounded-full">
                          {item.areas_atrasadas}
                        </span>
                      ) : (
                        <span className="text-sm text-success">0</span>
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
              Mostrando {filteredData.length} de {data.length} engenheiros
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

