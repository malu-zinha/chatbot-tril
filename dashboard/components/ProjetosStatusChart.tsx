import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { ProjetosStatus } from '../lib/supabase'

interface ProjetosStatusChartProps {
  data: ProjetosStatus[]
}

const COLORS = {
  'Concluído': '#10B981',
  'Em Andamento': '#3B82F6',
  'Atrasado': '#EF4444',
  'Aguardando': '#F59E0B',
}

export default function ProjetosStatusChart({ data }: ProjetosStatusChartProps) {
  const chartData = data.map(item => ({
    name: item.status,
    value: item.quantidade,
    percentual: item.percentual,
  }))

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        Projetos por Status
      </h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percentual }) => `${name}: ${percentual}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[entry.name as keyof typeof COLORS] || '#6B70D9'} 
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      
      <div className="mt-4 grid grid-cols-2 gap-3">
        {data.map((item) => (
          <div 
            key={item.status}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ 
                  backgroundColor: COLORS[item.status as keyof typeof COLORS] || '#6B70D9' 
                }}
              ></div>
              <span className="text-sm font-medium text-gray-700">
                {item.status}
              </span>
            </div>
            <span className="text-sm font-bold text-gray-900">
              {item.quantidade}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

