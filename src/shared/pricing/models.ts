// Pricing configuration — USD per million tokens

export interface ModelPricing {
  /** Display name */
  displayName: string
  /** USD per 1M input tokens */
  inputPerMillion: number
  /** USD per 1M output tokens */
  outputPerMillion: number
  /** USD per 1M cache creation tokens */
  cacheCreatePerMillion: number
  /** USD per 1M cache read tokens */
  cacheReadPerMillion: number
}

// Official Anthropic pricing as of 2025
// Update this table when pricing changes
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Claude 4 series
  'claude-opus-4-7': {
    displayName: 'Claude Opus 4.7',
    inputPerMillion: 15,
    outputPerMillion: 75,
    cacheCreatePerMillion: 18.75,
    cacheReadPerMillion: 1.5,
  },
  'claude-opus-4-5': {
    displayName: 'Claude Opus 4.5',
    inputPerMillion: 15,
    outputPerMillion: 75,
    cacheCreatePerMillion: 18.75,
    cacheReadPerMillion: 1.5,
  },
  'claude-sonnet-4-6': {
    displayName: 'Claude Sonnet 4.6',
    inputPerMillion: 3,
    outputPerMillion: 15,
    cacheCreatePerMillion: 3.75,
    cacheReadPerMillion: 0.3,
  },
  'claude-sonnet-4-5': {
    displayName: 'Claude Sonnet 4.5',
    inputPerMillion: 3,
    outputPerMillion: 15,
    cacheCreatePerMillion: 3.75,
    cacheReadPerMillion: 0.3,
  },
  'claude-haiku-4-5-20251001': {
    displayName: 'Claude Haiku 4.5',
    inputPerMillion: 0.25,
    outputPerMillion: 1.25,
    cacheCreatePerMillion: 0.3,
    cacheReadPerMillion: 0.03,
  },
  // Claude 3.x series (legacy support)
  'claude-opus-3-5': {
    displayName: 'Claude Opus 3.5',
    inputPerMillion: 15,
    outputPerMillion: 75,
    cacheCreatePerMillion: 18.75,
    cacheReadPerMillion: 1.5,
  },
  'claude-sonnet-3-7': {
    displayName: 'Claude Sonnet 3.7',
    inputPerMillion: 3,
    outputPerMillion: 15,
    cacheCreatePerMillion: 3.75,
    cacheReadPerMillion: 0.3,
  },
  'claude-3-7-sonnet-20250219': {
    displayName: 'Claude Sonnet 3.7',
    inputPerMillion: 3,
    outputPerMillion: 15,
    cacheCreatePerMillion: 3.75,
    cacheReadPerMillion: 0.3,
  },
  'claude-3-5-sonnet-20241022': {
    displayName: 'Claude Sonnet 3.5',
    inputPerMillion: 3,
    outputPerMillion: 15,
    cacheCreatePerMillion: 3.75,
    cacheReadPerMillion: 0.3,
  },
  'claude-3-5-haiku-20241022': {
    displayName: 'Claude Haiku 3.5',
    inputPerMillion: 0.8,
    outputPerMillion: 4,
    cacheCreatePerMillion: 1,
    cacheReadPerMillion: 0.08,
  },
  'claude-3-opus-20240229': {
    displayName: 'Claude Opus 3',
    inputPerMillion: 15,
    outputPerMillion: 75,
    cacheCreatePerMillion: 18.75,
    cacheReadPerMillion: 1.5,
  },
  'claude-3-haiku-20240307': {
    displayName: 'Claude Haiku 3',
    inputPerMillion: 0.25,
    outputPerMillion: 1.25,
    cacheCreatePerMillion: 0.3,
    cacheReadPerMillion: 0.03,
  },
}

// Fallback pricing for unknown models (use Sonnet rates)
export const FALLBACK_PRICING: ModelPricing = {
  displayName: 'Unknown Model',
  inputPerMillion: 3,
  outputPerMillion: 15,
  cacheCreatePerMillion: 3.75,
  cacheReadPerMillion: 0.3,
}

/** Models that represent internal tool orchestration — no pricing applied */
export const SYNTHETIC_MODELS = new Set(['<synthetic>'])

/**
 * Get pricing for a model, with fallback for unknown models.
 * Returns null for synthetic models.
 */
export function getPricing(model: string): ModelPricing | null {
  if (SYNTHETIC_MODELS.has(model)) return null

  // Direct match
  if (MODEL_PRICING[model]) return MODEL_PRICING[model]

  // Fuzzy alias matching: check if the model string contains known model family keys
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (model.toLowerCase().includes(key.toLowerCase())) return pricing
  }

  // Detect model family from name for better fallback
  const lower = model.toLowerCase()
  if (lower.includes('opus')) {
    return { ...FALLBACK_PRICING, displayName: 'Claude Opus (Unknown)', inputPerMillion: 15, outputPerMillion: 75, cacheCreatePerMillion: 18.75, cacheReadPerMillion: 1.5 }
  }
  if (lower.includes('haiku')) {
    return { ...FALLBACK_PRICING, displayName: 'Claude Haiku (Unknown)', inputPerMillion: 0.25, outputPerMillion: 1.25, cacheCreatePerMillion: 0.3, cacheReadPerMillion: 0.03 }
  }

  return FALLBACK_PRICING
}

/**
 * Get a short display name for a model.
 */
export function getModelDisplayName(model: string): string {
  if (SYNTHETIC_MODELS.has(model)) return 'Internal'
  const pricing = MODEL_PRICING[model]
  if (pricing) return pricing.displayName
  // Best-effort from model id
  return model
    .replace(/^claude-/, '')
    .replace(/-\d{8}$/, '')
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}
