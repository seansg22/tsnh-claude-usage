import React from 'react'
import { clsx } from 'clsx'
import { useCurrencyConverter } from '../../hooks/useCurrencyConverter'

interface CostBadgeProps {
  cost: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function CostBadge({ cost, size = 'md', className }: CostBadgeProps) {
  const { formatDisplayCost } = useCurrencyConverter()

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md font-mono font-medium',
        'bg-claude-orange/10 text-claude-orange border border-claude-orange/20',
        sizeClasses[size],
        className,
      )}
    >
      {formatDisplayCost(cost)}
    </span>
  )
}
