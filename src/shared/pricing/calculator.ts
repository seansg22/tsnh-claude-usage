import type { RawUsageData } from '../types/jsonl'
import type { SessionSummary, DailyCost, ModelCost } from '../types/domain'
import { getPricing, SYNTHETIC_MODELS } from './models'
import { format } from 'date-fns'

export { SYNTHETIC_MODELS }

/**
 * Calculate cost for a single assistant message usage record.
 */
export function calculateCost(usage: RawUsageData, model: string): number {
  const pricing = getPricing(model)
  if (!pricing) return 0

  const input = (usage.input_tokens ?? 0) / 1_000_000
  const output = (usage.output_tokens ?? 0) / 1_000_000
  const cacheCreate = (usage.cache_creation_input_tokens ?? 0) / 1_000_000
  const cacheRead = (usage.cache_read_input_tokens ?? 0) / 1_000_000

  return (
    input * pricing.inputPerMillion +
    output * pricing.outputPerMillion +
    cacheCreate * pricing.cacheCreatePerMillion +
    cacheRead * pricing.cacheReadPerMillion
  )
}

/**
 * Format cost as $X.XXXX
 */
export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00'
  if (cost < 0.0001) return '<$0.0001'
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  if (cost < 1) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(2)}`
}

/**
 * Format token count with K/M suffix.
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return tokens.toString()
}

/**
 * Group sessions by day and sum costs/tokens.
 * Uses each message's own timestamp for accurate billing period attribution
 * (avoids attributing old messages to the period of the last session activity).
 */
export function groupCostByDay(sessions: SessionSummary[]): DailyCost[] {
  const dayMap = new Map<string, DailyCost>()

  for (const session of sessions) {
    // Use per-message daily costs when available; fall back to lastActive attribution for
    // legacy session summaries that pre-date this field.
    const entries: DailyCost[] =
      session.dailyCosts && session.dailyCosts.length > 0
        ? session.dailyCosts
        : [
            {
              date: format(new Date(session.lastActive), 'yyyy-MM-dd'),
              cost: session.estimatedCost,
              inputTokens: session.usage.inputTokens,
              outputTokens: session.usage.outputTokens,
              cacheCreationTokens: session.usage.cacheCreationTokens,
              cacheReadTokens: session.usage.cacheReadTokens,
            },
          ]

    for (const entry of entries) {
      const existing = dayMap.get(entry.date)
      if (existing) {
        existing.cost += entry.cost
        existing.inputTokens += entry.inputTokens
        existing.outputTokens += entry.outputTokens
        existing.cacheCreationTokens += entry.cacheCreationTokens
        existing.cacheReadTokens += entry.cacheReadTokens
      } else {
        dayMap.set(entry.date, { ...entry })
      }
    }
  }

  // Sort by date ascending
  return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Group sessions by primary model and compute costs.
 */
export function groupCostByModel(sessions: SessionSummary[]): ModelCost[] {
  const modelMap = new Map<
    string,
    { cost: number; inputTokens: number; outputTokens: number; cacheCreationTokens: number; cacheReadTokens: number }
  >()

  for (const session of sessions) {
    if (!session.primaryModel || SYNTHETIC_MODELS.has(session.primaryModel)) continue

    const key = session.primaryModel
    const existing = modelMap.get(key)
    if (existing) {
      existing.cost += session.estimatedCost
      existing.inputTokens += session.usage.inputTokens
      existing.outputTokens += session.usage.outputTokens
      existing.cacheCreationTokens += session.usage.cacheCreationTokens
      existing.cacheReadTokens += session.usage.cacheReadTokens
    } else {
      modelMap.set(key, {
        cost: session.estimatedCost,
        inputTokens: session.usage.inputTokens,
        outputTokens: session.usage.outputTokens,
        cacheCreationTokens: session.usage.cacheCreationTokens,
        cacheReadTokens: session.usage.cacheReadTokens,
      })
    }
  }

  const totalCost = Array.from(modelMap.values()).reduce((sum, m) => sum + m.cost, 0)

  return Array.from(modelMap.entries())
    .map(([model, data]) => ({
      model,
      cost: data.cost,
      percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      cacheCreationTokens: data.cacheCreationTokens,
      cacheReadTokens: data.cacheReadTokens,
    }))
    .sort((a, b) => b.cost - a.cost)
}
