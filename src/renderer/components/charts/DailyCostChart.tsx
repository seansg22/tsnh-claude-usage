import React from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from 'recharts'
import type { DailyCost } from '@shared/types/domain'
import { formatCost, formatTokens } from '@shared/pricing/calculator'
import { format, parseISO } from 'date-fns'
import { fillDailyCostGaps } from '@shared/analytics/aggregator'

interface DailyCostChartProps {
  data: DailyCost[]
  height?: number
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: DailyCost }>
  label?: string
}

interface CostLabelProps {
  x?: string | number
  y?: string | number
  value?: string | number
  index?: number
  dataLength?: number
}

function makeCostLabel(dataLength: number) {
  return function CostLabel({ x = 0, y = 0, value = 0, index = 0 }: CostLabelProps) {
    const xNum = typeof x === 'string' ? parseFloat(x) : x
    const yNum = typeof y === 'string' ? parseFloat(y) : y
    const valueNum = typeof value === 'string' ? parseFloat(value) : value
    if (!valueNum || valueNum <= 0) return null
    const text = `$${valueNum.toFixed(2)}`
    const padX = 5
    const padY = 3
    const fontSize = 11
    const textWidth = text.length * 6.5
    const rectW = textWidth + padX * 2
    const rectH = fontSize + padY * 2
    const rx = rectH / 2 - 1

    // Shift pill horizontally so it stays within chart bounds
    const isFirst = index === 0
    const isLast = index === dataLength - 1
    const offsetX = isFirst ? 0 : isLast ? -rectW : -rectW / 2

    return (
      <g transform={`translate(${xNum + offsetX}, ${yNum - rectH - 6})`}>
        <rect
          x={0}
          y={0}
          width={rectW}
          height={rectH}
          rx={rx}
          ry={rx}
          fill="#1A1A1A"
          fillOpacity={1}
          stroke="#E8632A"
          strokeOpacity={0.9}
          strokeWidth={1}
        />
        <text
          x={rectW / 2}
          y={fontSize + padY - 2}
          textAnchor="middle"
          fontSize={fontSize}
          fontFamily="monospace"
          fill="#E8632A"
        >
          {text}
        </text>
      </g>
    )
  }
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload

  return (
    <div className="rounded-lg border border-claude-border bg-claude-surface p-3 shadow-xl text-xs">
      <p className="mb-2 font-semibold text-claude-text">{label}</p>
      <p className="text-claude-orange font-mono">{formatCost(d.cost)}</p>
      <div className="mt-1.5 space-y-0.5 text-claude-muted">
        <p>Input: {formatTokens(d.inputTokens)}</p>
        <p>Output: {formatTokens(d.outputTokens)}</p>
        {d.cacheCreationTokens > 0 && <p>Cache+: {formatTokens(d.cacheCreationTokens)}</p>}
        {d.cacheReadTokens > 0 && <p>Cache↑: {formatTokens(d.cacheReadTokens)}</p>}
      </div>
    </div>
  )
}

export function DailyCostChart({ data, height = 200 }: DailyCostChartProps) {
  const filled = fillDailyCostGaps(data)

  const chartData = filled.map((d) => ({
    ...d,
    dateLabel: format(parseISO(d.date), 'MMM d'),
  }))

  if (chartData.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-claude-border bg-claude-surface text-claude-muted text-sm"
        style={{ height }}
      >
        No data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 32, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#E8632A" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#E8632A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
        <XAxis
          dataKey="dateLabel"
          tick={{ fontSize: 11, fill: '#8A8A8A' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#8A8A8A' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCost(v)}
          width={55}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="cost"
          stroke="#E8632A"
          strokeWidth={2}
          fill="url(#costGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#E8632A' }}
        >
          <LabelList dataKey="cost" content={makeCostLabel(chartData.length)} />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  )
}
