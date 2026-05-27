import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { ModelCost } from '@shared/types/domain'
import { formatCost } from '@shared/pricing/calculator'
import { getModelDisplayName } from '@shared/pricing/models'
import { useCurrencyConverter } from '../../hooks/useCurrencyConverter'

const MODEL_COLORS = [
  '#E8632A', // claude-orange
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
]

interface ModelPieChartProps {
  data: ModelCost[]
  height?: number
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload: ModelCost & { color: string } }>
  currencySymbol?: string
}

function CustomTooltip({ active, payload, currencySymbol = '$' }: TooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload

  return (
    <div className="rounded-lg border border-claude-border bg-claude-surface p-3 shadow-xl text-xs">
      <p className="mb-1 font-semibold text-claude-text">{getModelDisplayName(d.model)}</p>
      <p className="text-claude-orange font-mono">{formatCost(d.cost, currencySymbol)}</p>
      <p className="text-claude-muted">{d.percentage.toFixed(1)}% of total</p>
    </div>
  )
}

function CustomLegend({ data, currencySymbol = '$' }: { data: (ModelCost & { color: string })[]; currencySymbol?: string }) {
  return (
    <div className="space-y-1.5 mt-2">
      {data.map((item) => (
        <div key={item.model} className="flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-claude-text truncate">{getModelDisplayName(item.model)}</span>
          </div>
          <span className="font-mono text-claude-muted flex-shrink-0">
            {formatCost(item.cost, currencySymbol)} ({item.percentage.toFixed(0)}%)
          </span>
        </div>
      ))}
    </div>
  )
}

export function ModelPieChart({ data, height = 160 }: ModelPieChartProps) {
  const { currencySymbol } = useCurrencyConverter()

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-claude-border bg-claude-surface text-claude-muted text-sm"
        style={{ height }}
      >
        No data
      </div>
    )
  }

  const coloredData = data.map((d, i) => ({
    ...d,
    color: MODEL_COLORS[i % MODEL_COLORS.length],
    displayName: getModelDisplayName(d.model),
  }))

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={coloredData}
            dataKey="cost"
            nameKey="displayName"
            cx="50%"
            cy="50%"
            innerRadius={height * 0.28}
            outerRadius={height * 0.44}
            strokeWidth={0}
          >
            {coloredData.map((entry) => (
              <Cell key={entry.model} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
        </PieChart>
      </ResponsiveContainer>
      <CustomLegend data={coloredData} currencySymbol={currencySymbol} />
    </div>
  )
}
