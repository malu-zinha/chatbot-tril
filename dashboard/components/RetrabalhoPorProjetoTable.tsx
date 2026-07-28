import React from 'react'
import { RetrabalhoPorProjeto } from '@/lib/supabase'

interface RetrabalhoPorProjetoTableProps {
  data: RetrabalhoPorProjeto[]
  onSelectProjeto: (projetoId: string) => void
}

export default function RetrabalhoPorProjetoTable({
  data,
  onSelectProjeto,
}: RetrabalhoPorProjetoTableProps) {
  if (!data || data.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          Retrabalho por Projeto
        </h3>
        <p className="text-xs text-gray-500">
          % = horas de retrabalho / horas trabalhadas totais
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2 pr-4">Projeto</th>
              <th className="py-2 pr-4">Cliente</th>
              <th className="py-2 pr-4 text-right">Horas retrab.</th>
              <th className="py-2 pr-4 text-right">Horas totais</th>
              <th className="py-2 pl-4 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={item.projeto_id}
                className="border-b last:border-0 hover:bg-gray-50 transition-colors"
              >
                <td className="py-2 pr-4">
                  <div className="font-medium text-gray-900">
                    {item.codigo_projeto}
                  </div>
                </td>
                <td className="py-2 pr-4 text-gray-700">
                  {item.cliente}
                </td>
                <td className="py-2 pr-4 text-right text-gray-900">
                  {(item.horas_retrabalho_total || 0).toFixed(1)}h
                </td>
                <td className="py-2 pr-4 text-right text-gray-900">
                  {(item.horas_trabalhadas_total || 0).toFixed(1)}h
                </td>
                <td className="py-2 pl-4 text-right">
                  <button
                    type="button"
                    onClick={() => onSelectProjeto(item.projeto_id)}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
                  >
                    {item.percentual_retrabalho_projeto.toFixed(1)}%
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

