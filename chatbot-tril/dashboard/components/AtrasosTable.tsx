import React from 'react'
import { AlertTriangle, Clock } from 'lucide-react'
import { AtrasosEngenheiro } from '../lib/supabase'

interface AtrasosTableProps {
  data: AtrasosEngenheiro[]
}

export default function AtrasosTable({ data }: AtrasosTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
      <div className="flex items-center space-x-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-warning" />
        <h3 className="text-lg font-bold text-gray-900">
          Atrasos por Engenheiro
        </h3>
      </div>
      
      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-2 text-success" />
          <p>🎉 Nenhum atraso registrado!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Engenheiro
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                  Projetos Atrasados
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                  Áreas Atrasadas
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                  Média de Atraso
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                  Atraso Máximo
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr 
                  key={item.eng_id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    index === 0 ? 'bg-red-50' : ''
                  }`}
                >
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    {item.engenheiro}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-danger text-white rounded-full text-xs font-bold">
                      {item.qtde_projetos_atrasados}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-warning text-white rounded-full text-xs font-bold">
                      {item.qtde_areas_atrasadas}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-sm font-semibold text-gray-900">
                    {item.dias_medios_atraso.toFixed(1)} dias
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      item.atraso_maximo_dias > 30 ? 'bg-danger text-white' :
                      item.atraso_maximo_dias > 15 ? 'bg-warning text-white' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.atraso_maximo_dias} dias
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

