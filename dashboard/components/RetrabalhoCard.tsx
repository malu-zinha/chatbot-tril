import React from 'react'
import { AlertCircle } from 'lucide-react'
import { RetrabalhoEngenheiro } from '../lib/supabase'

interface RetrabalhoCardProps {
  data: RetrabalhoEngenheiro[]
}

export default function RetrabalhoCard({ data }: RetrabalhoCardProps) {
  const totalRetrabalhos = data.reduce((sum, item) => sum + item.total_retrabalhos, 0)
  const mediaGeral = data.length > 0 
    ? data.reduce((sum, item) => sum + (item.retrabalho_medio_percentual || 0), 0) / data.length
    : 0

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
      <div className="flex items-center space-x-2 mb-4">
        <AlertCircle className="w-5 h-5 text-warning" />
        <h3 className="text-lg font-bold text-gray-900">
          Retrabalho por Engenheiro
        </h3>
      </div>
      
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-warning to-orange-600 rounded-lg p-4 text-white">
          <div className="text-sm font-medium opacity-90">Total de Retrabalhos</div>
          <div className="text-3xl font-bold mt-1">{totalRetrabalhos}</div>
        </div>
        <div className="bg-gradient-to-r from-danger to-red-600 rounded-lg p-4 text-white">
          <div className="text-sm font-medium opacity-90">Média Geral</div>
          <div className="text-3xl font-bold mt-1">{mediaGeral.toFixed(1)}%</div>
        </div>
      </div>
      
      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>🎉 Nenhum retrabalho registrado!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.slice(0, 5).map((item) => (
            <div 
              key={item.eng_id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900">{item.engenheiro}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {item.qtde_areas_retrabalho} áreas • {item.projetos_com_retrabalho} projetos
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center space-x-3">
                  <div>
                    <div className="text-lg font-bold text-danger">
                      {item.total_retrabalhos}
                    </div>
                    <div className="text-xs text-gray-500">ocorrências</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${
                      (item.retrabalho_medio_percentual || 0) > 20 ? 'text-danger' :
                      (item.retrabalho_medio_percentual || 0) > 10 ? 'text-warning' :
                      'text-success'
                    }`}>
                      {item.retrabalho_medio_percentual?.toFixed(1) || 0}%
                    </div>
                    <div className="text-xs text-gray-500">média</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

