'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import { RetrabalhoTaxaArea } from '@/lib/supabase'

interface RetrabalhoTaxaAreaChartProps {
  data: RetrabalhoTaxaArea[]
}

function percentualColor(percentual: number, max: number): string {
  const ratio = max > 0 ? percentual / max : 0
  if (ratio < 0.33) return '#22c55e'
  if (ratio < 0.66) return '#f59e0b'
  return '#ef4444'
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: RetrabalhoTaxaArea; value: number }>
}) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs max-w-[220px]">
      <p className="font-bold text-gray-900 mb-1">
        {d.codigo_projeto} / {d.area}
      </p>
      <p className="text-gray-600">{d.cliente}</p>
      <div className="mt-2 space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Horas retrab.</span>
          <span className="font-semibold text-gray-800">
            {(d.horas_retrabalho_total || 0).toFixed(1)}h
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Horas totais</span>
          <span className="font-semibold text-gray-800">
            {(d.horas_trabalhadas_total || 0).toFixed(1)}h
          </span>
        </div>
        <div className="flex justify-between gap-4 border-t pt-1">
          <span className="text-gray-500 font-semibold">Retrabalho (%)</span>
          <span className="font-bold text-gray-900">
            {d.percentual_retrabalho_disciplina.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  )
}

export default function RetrabalhoTaxaAreaChart({
  data,
}: RetrabalhoTaxaAreaChartProps) {
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-3">
        Nenhum dado de retrabalho por horas disponivel.
      </p>
    )
  }

  const sorted = [...data]
    .sort((a, b) => b.percentual_retrabalho_disciplina - a.percentual_retrabalho_disciplina)
    .slice(0, 15)

  const maxPercentual = sorted[0]?.percentual_retrabalho_disciplina ?? 1
  const chartData = sorted.map((d) => ({
    ...d,
    label: `${d.codigo_projeto} / ${d.area_codigo}`,
  }))
  const chartHeight = Math.max(250, chartData.length * 44)

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Percentual = horas de retrabalho / horas trabalhadas totais. Mostrando ate 15 combinacoes projeto/area com maior percentual.
      </p>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 60, left: 10, bottom: 4 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 'auto']}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            label={{
              value: '% por horas',
              position: 'insideBottomRight',
              offset: -4,
              fontSize: 10,
              fill: '#9ca3af',
            }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={120}
            tick={{ fontSize: 11, fill: '#374151' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="percentual_retrabalho_disciplina" radius={[0, 4, 4, 0]} maxBarSize={28}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={percentualColor(entry.percentual_retrabalho_disciplina, maxPercentual)}
              />
            ))}
            <LabelList
              dataKey="percentual_retrabalho_disciplina"
              position="right"
              formatter={(v: number) => `${v.toFixed(1)}%`}
              style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
