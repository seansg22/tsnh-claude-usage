import type { RawEntry } from '../types/jsonl'
import type { SessionSummary, ProcessedMessage, TokenUsage, DailyCost, ImageAttachment } from '../types/domain'
import {
  isAssistantEntry,
  isUserEntry,
  isAiTitleEntry,
  isCustomTitleEntry,
  extractTextContent,
  isRealUserPrompt,
  decodeDirName,
  extractProjectName,
} from './jsonlParser'
import type { ParseResult } from './jsonlParser'
import { calculateCost, SYNTHETIC_MODELS } from '../pricing/calculator'
import { format } from 'date-fns'

const FIRST_PROMPT_MAX_LEN = 120

/**
 * Build a SessionSummary from parsed JSONL entries.
 */
export function buildSession(
  filePath: string,
  projectDirName: string,
  parseResult: ParseResult,
): SessionSummary {
  const { entries, errors } = parseResult

  // Determine sessionId from first entry that has one
  let sessionId = ''
  for (const entry of entries) {
    const id = (entry as { sessionId?: string }).sessionId
    if (id) {
      sessionId = id
      break
    }
  }

  // Collect timestamps for date range
  const timestamps: number[] = []
  for (const entry of entries) {
    const ts = (entry as { timestamp?: string }).timestamp
    if (ts) {
      const t = Date.parse(ts)
      if (!isNaN(t)) timestamps.push(t)
    }
  }

  const createdAtMs = timestamps.length > 0 ? Math.min(...timestamps) : Date.now()
  const lastActiveMs = timestamps.length > 0 ? Math.max(...timestamps) : Date.now()
  const createdAt = new Date(createdAtMs).toISOString()
  const lastActive = new Date(lastActiveMs).toISOString()
  const durationMs = lastActiveMs - createdAtMs

  // Get title
  let aiTitle: string | null = null
  let customTitle: string | null = null
  let canonicalCwd: string | null = null

  for (const entry of entries) {
    if (isAiTitleEntry(entry)) aiTitle = entry.aiTitle
    if (isCustomTitleEntry(entry)) customTitle = entry.customTitle
    if (isUserEntry(entry) && entry.cwd && !canonicalCwd) {
      canonicalCwd = entry.cwd
    }
  }

  const title = customTitle ?? aiTitle

  // Decode project path
  const projectPath = canonicalCwd ?? decodeDirName(projectDirName)
  const projectName = extractProjectName(projectPath)

  // Process user prompts (chronological order)
  const userEntries = entries.filter(isUserEntry).sort((a, b) => {
    return Date.parse(a.timestamp) - Date.parse(b.timestamp)
  })

  const allPrompts: string[] = []
  let firstPromptFull: string | null = null

  for (const entry of userEntries) {
    if (!isRealUserPrompt(entry)) continue
    const text = extractTextContent(entry.message.content)
    if (!text) continue
    allPrompts.push(text)
    if (firstPromptFull === null) {
      firstPromptFull = text
    }
  }

  const firstPrompt = firstPromptFull
    ? firstPromptFull.length > FIRST_PROMPT_MAX_LEN
      ? firstPromptFull.slice(0, FIRST_PROMPT_MAX_LEN) + '…'
      : firstPromptFull
    : null

  // Process assistant messages for tokens, models, cost
  const assistantEntries = entries.filter(isAssistantEntry).sort((a, b) => {
    return Date.parse(a.timestamp) - Date.parse(b.timestamp)
  })

  // Claude Code splits a single API response into multiple JSONL entries — one per content
  // block type (thinking / text / tool_use). All sibling blocks share IDENTICAL usage stats
  // and form a parent→child chain. Counting each separately inflates cost 2-3×.
  //
  // Deduplication rule: an assistant entry is a "continuation block" (skip it) when ALL of:
  //   1. Its parentUuid points to another assistant entry in this session
  //   2. That parent assistant entry has the exact same usage fingerprint
  //
  // Only the ROOT of each same-usage chain is counted.
  const assistantUuidSet = new Set(assistantEntries.map((e) => e.uuid))
  const usageFingerprint = (e: (typeof assistantEntries)[0]) => {
    const u = e.message?.usage
    if (!u) return ''
    return `${u.input_tokens}|${u.output_tokens}|${u.cache_creation_input_tokens ?? 0}|${u.cache_read_input_tokens ?? 0}`
  }
  // Build map of uuid → fingerprint for quick parent lookup
  const fingerprintByUuid = new Map<string, string>(
    assistantEntries.map((e) => [e.uuid, usageFingerprint(e)]),
  )

  let inputTokens = 0
  let outputTokens = 0
  let cacheCreationTokens = 0
  let cacheReadTokens = 0
  let estimatedCost = 0

  const modelCounts = new Map<string, number>()
  // Per-message daily cost breakdown for accurate billing period attribution
  const dailyCostMap = new Map<string, DailyCost>()

  for (const entry of assistantEntries) {
    const usage = entry.message?.usage
    if (!usage) continue

    // Skip sibling content blocks — they duplicate the root block's usage
    if (entry.parentUuid && assistantUuidSet.has(entry.parentUuid)) {
      const parentFingerprint = fingerprintByUuid.get(entry.parentUuid)
      if (parentFingerprint && parentFingerprint === usageFingerprint(entry)) {
        continue
      }
    }

    const input = usage.input_tokens ?? 0
    const output = usage.output_tokens ?? 0
    const cacheCreate = usage.cache_creation_input_tokens ?? 0
    const cacheRead = usage.cache_read_input_tokens ?? 0

    inputTokens += input
    outputTokens += output
    cacheCreationTokens += cacheCreate
    cacheReadTokens += cacheRead

    const model = entry.message?.model ?? ''
    let msgCost = 0
    if (model && !SYNTHETIC_MODELS.has(model)) {
      modelCounts.set(model, (modelCounts.get(model) ?? 0) + 1)
      msgCost = calculateCost(
        {
          input_tokens: input,
          output_tokens: output,
          cache_creation_input_tokens: cacheCreate,
          cache_read_input_tokens: cacheRead,
        },
        model,
      )
      estimatedCost += msgCost
    }

    // Attribute this message's cost to its own timestamp date (local timezone,
    // consistent with getBillingPeriod which also uses local date arithmetic).
    if (msgCost > 0 || input > 0 || output > 0 || cacheCreate > 0 || cacheRead > 0) {
      const ts = (entry as { timestamp?: string }).timestamp
      const msgDate = ts
        ? format(new Date(ts), 'yyyy-MM-dd')
        : format(new Date(lastActiveMs), 'yyyy-MM-dd')
      const existing = dailyCostMap.get(msgDate)
      if (existing) {
        existing.cost += msgCost
        existing.inputTokens += input
        existing.outputTokens += output
        existing.cacheCreationTokens += cacheCreate
        existing.cacheReadTokens += cacheRead
      } else {
        dailyCostMap.set(msgDate, {
          date: msgDate,
          cost: msgCost,
          inputTokens: input,
          outputTokens: output,
          cacheCreationTokens: cacheCreate,
          cacheReadTokens: cacheRead,
        })
      }
    }
  }

  const dailyCosts: DailyCost[] = Array.from(dailyCostMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  )

  const totalTokens = inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens

  // Determine models used and primary model
  const modelsUsed = Array.from(modelCounts.keys())
  let primaryModel = ''
  let maxCount = 0
  for (const [model, count] of modelCounts.entries()) {
    if (count > maxCount) {
      maxCount = count
      primaryModel = model
    }
  }

  const messageCount = entries.filter((e) => e.type === 'user' || e.type === 'assistant').length
  const userMessageCount = userEntries.filter(isRealUserPrompt).length

  const usage: TokenUsage = {
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    totalTokens,
  }

  return {
    sessionId,
    filePath,
    projectDirName,
    projectPath,
    projectName,
    title,
    createdAt,
    lastActive,
    durationMs,
    messageCount,
    userMessageCount,
    firstPrompt,
    firstPromptFull,
    allPrompts,
    modelsUsed,
    primaryModel,
    usage,
    estimatedCost,
    dailyCosts,
    parseErrors: errors.map((e) => `Line ${e.lineNumber}: ${e.error}`),
  }
}

/**
 * Build processed messages for the session detail view.
 */
export function buildProcessedMessages(entries: RawEntry[]): ProcessedMessage[] {
  const messages: ProcessedMessage[] = []

  const sorted = [...entries]
    .filter((e) => e.type === 'user' || e.type === 'assistant')
    .sort((a, b) => {
      const ta = (a as { timestamp?: string }).timestamp ?? ''
      const tb = (b as { timestamp?: string }).timestamp ?? ''
      return ta.localeCompare(tb)
    })

  // Cost attribution for displayed messages.
  //
  // Claude Code splits one API response into multiple JSONL entries (thinking /
  // tool_use / text blocks), all chained via parentUuid with identical usage stats.
  // The session summary (buildSession) counts only the chain root once. Here we
  // must do the same, BUT thinking-only entries are never displayed — so we must
  // attribute the root's cost to the *first displayed* entry in each chain instead.
  //
  // Algorithm:
  //   1. Build a map: uuid → chain-root uuid (walk parentUuid while fp matches).
  //   2. For each displayed assistant entry, claim its root. The first claimer gets
  //      the root's full cost; subsequent entries for the same root get cost=undefined.
  const assistantEntries = sorted.filter(isAssistantEntry)
  const assistantUuidSet = new Set(assistantEntries.map((e) => e.uuid))
  const entryByUuid = new Map(assistantEntries.map((e) => [e.uuid, e]))

  const getFingerprint = (e: (typeof assistantEntries)[0]): string => {
    const u = e.message?.usage
    if (!u) return ''
    return `${u.input_tokens}|${u.output_tokens}|${u.cache_creation_input_tokens ?? 0}|${u.cache_read_input_tokens ?? 0}`
  }
  const fingerprintByUuid = new Map<string, string>(
    assistantEntries.map((e) => [e.uuid, getFingerprint(e)])
  )

  // Walk up the chain to find the root of a fingerprint group.
  function findChainRoot(uuid: string): string {
    const entry = entryByUuid.get(uuid)
    if (!entry) return uuid
    const parent = entry.parentUuid
    if (
      parent &&
      assistantUuidSet.has(parent) &&
      fingerprintByUuid.get(parent) === fingerprintByUuid.get(uuid)
    ) {
      return findChainRoot(parent)
    }
    return uuid
  }

  // Track which chain roots have already had their cost claimed by a displayed entry.
  const claimedRoots = new Set<string>()

  for (const entry of sorted) {
    if (isUserEntry(entry)) {
      const rawContent = entry.message.content
      let text = extractTextContent(rawContent)
      let isToolResult = false

      // If no text was extracted, check for tool_result blocks
      if (!text && Array.isArray(rawContent)) {
        const toolResultBlocks = rawContent.filter((b) => b.type === 'tool_result')
        if (toolResultBlocks.length > 0) {
          isToolResult = true
          text = toolResultBlocks
            .map((b) => {
              const c = (b as { type: 'tool_result'; content: unknown }).content
              if (typeof c === 'string') return c
              if (Array.isArray(c)) {
                return (c as Array<{ type: string; text?: string }>)
                  .filter((x) => x.type === 'text')
                  .map((x) => x.text ?? '')
                  .join('\n')
              }
              return ''
            })
            .join('\n')
            .trim()
        }
      }

      // Extract inline image attachments
      let images: ImageAttachment[] | undefined
      if (Array.isArray(rawContent)) {
        const imgBlocks = rawContent.filter((b) => b.type === 'image')
        if (imgBlocks.length > 0) {
          images = imgBlocks.flatMap((b) => {
            const src = (b as { type: 'image'; source: unknown }).source as Record<string, unknown>
            if (src?.type === 'base64' && typeof src.data === 'string' && typeof src.media_type === 'string') {
              return [{ mediaType: src.media_type, data: src.data }]
            }
            return []
          })
          if (images.length === 0) images = undefined
        }
      }

      messages.push({
        uuid: entry.uuid,
        parentUuid: entry.parentUuid,
        type: 'user',
        timestamp: entry.timestamp,
        content: text,
        images,
        isMeta: entry.isMeta ?? false,
        isToolResult,
      })
    } else if (isAssistantEntry(entry)) {
      const model = entry.message?.model ?? ''
      const usage = entry.message?.usage
      let tokenUsage: TokenUsage | undefined
      let cost: number | undefined

      // Attribute cost to the first *displayed* entry in each chain.
      // Find this entry's chain root; if unclaimed, take the root's usage/cost.
      const chainRoot = findChainRoot(entry.uuid)
      if (!claimedRoots.has(chainRoot)) {
        claimedRoots.add(chainRoot)
        // Use the root entry's usage (all entries in the chain share the same stats,
        // but the root is the canonical source).
        const rootUsage = entryByUuid.get(chainRoot)?.message?.usage ?? usage
        if (rootUsage) {
          const input = rootUsage.input_tokens ?? 0
          const output = rootUsage.output_tokens ?? 0
          const cacheCreate = rootUsage.cache_creation_input_tokens ?? 0
          const cacheRead = rootUsage.cache_read_input_tokens ?? 0

          tokenUsage = {
            inputTokens: input,
            outputTokens: output,
            cacheCreationTokens: cacheCreate,
            cacheReadTokens: cacheRead,
            totalTokens: input + output + cacheCreate + cacheRead,
          }

          if (!SYNTHETIC_MODELS.has(model)) {
            cost = calculateCost(
              {
                input_tokens: input,
                output_tokens: output,
                cache_creation_input_tokens: cacheCreate,
                cache_read_input_tokens: cacheRead,
              },
              model,
            )
          }
        }
      }
      // else: another displayed entry already claimed this API call's cost → leave cost/usage undefined

      const contentBlocks = entry.message?.content ?? []
      const textContent = contentBlocks
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('\n')
        .trim() ?? ''

      const toolCalls = contentBlocks
        .filter((b) => b.type === 'tool_use')
        .map((b) => (b as { type: 'tool_use'; name: string }).name)

      const hasContent = textContent.length > 0 || toolCalls.length > 0

      // Skip thinking-only messages (no text, no tool_use) — they carry no displayable content
      if (!hasContent) continue

      messages.push({
        uuid: entry.uuid,
        parentUuid: entry.parentUuid,
        type: 'assistant',
        timestamp: entry.timestamp,
        content: textContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        model,
        usage: tokenUsage,
        cost,
      })
    }
  }

  return messages
}
