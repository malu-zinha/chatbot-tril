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

// Gradiente de cor: verde (baixo) → amarelo → vermelho (alto)
function taxaColor(taxa: number, max: number): string {
  const ratio = max > 0 ? taxa / max : 0
  if (ratio < 0.33) return '#22c55e'   // verde
  if (ratio < 0.66) return '#f59e0b'   // âmbar
  return '#ef4444'                      // vermelho
}

// Tooltip customizado
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
          <span className="text-gray-500">Retrabalhos</span>
          <span className="font-semibold text-gray-800">{d.total_retrabalhos_area}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-500">Dias c/ registro</span>
          <span className="font-semibold text-gray-800">{d.dias_com_registro}</span>
        </div>
        <div className="flex justify-between gap-4 border-t pt-1">
          <span className="text-gray-500 font-semibold">Taxa (retrab/dia)</span>
          <span className="font-bold text-gray-900">{d.taxa_retrabalho_por_dia.toFixed(2)}</span>
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
        Nenhum dado de taxa de retrabalho disponível.
      </p>
    )
  }

  // Limita a 15 barras para não poluir; ordena do maior para o menor
  const sorted = [...data]
    .sort((a, b) => b.taxa_retrabalho_por_dia - a.taxa_retrabalho_por_dia)
    .slice(0, 15)

  const maxTaxa = sorted[0]?.taxa_retrabalho_por_dia ?? 1

  // Rótulo no eixo Y: "PROJ / ÁREA"
  const chartData = sorted.map((d) => ({
    ...d,
    label: `${d.codigo_projeto} / ${d.area_codigo}`,
  }))

  // Altura dinâmica: mínimo 250px, 40px por barra
  const chartHeight = Math.max(250, chartData.length * 44)

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Taxa = retrabalhos registrados ÷ dias com registro de retrabalho no projeto.
        Mostrando até 15 combinações projeto/área com maior taxa.
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
            tickFormatter={(v) => v.toFixed(2)}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            label={{
              value: 'retrabalhos / dia',
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
          <Bar dataKey="taxa_retrabalho_por_dia" radius={[0, 4, 4, 0]} maxBarSize={28}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={taxaColor(entry.taxa_retrabalho_por_dia, maxTaxa)}
              />
            ))}
            <LabelList
              dataKey="taxa_retrabalho_por_dia"
              position="right"
              formatter={(v: number) => v.toFixed(2)}
              style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
