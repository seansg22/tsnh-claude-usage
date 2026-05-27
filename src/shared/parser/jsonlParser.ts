import type {
  RawEntry,
  RawAssistantEntry,
  RawUserEntry,
  RawAiTitleEntry,
  RawCustomTitleEntry,
  ContentBlock,
  ParseError,
} from '../types/jsonl'

export interface ParseResult {
  entries: RawEntry[]
  errors: ParseError[]
  rawLines: string[]
}

// Type guards

export function isAssistantEntry(entry: RawEntry): entry is RawAssistantEntry {
  return (
    entry.type === 'assistant' &&
    typeof (entry as RawAssistantEntry).uuid === 'string' &&
    typeof (entry as RawAssistantEntry).sessionId === 'string' &&
    typeof (entry as RawAssistantEntry).message === 'object' &&
    (entry as RawAssistantEntry).message !== null &&
    typeof (entry as RawAssistantEntry).message?.model === 'string'
  )
}

export function isUserEntry(entry: RawEntry): entry is RawUserEntry {
  return (
    entry.type === 'user' &&
    typeof (entry as RawUserEntry).uuid === 'string' &&
    typeof (entry as RawUserEntry).sessionId === 'string' &&
    typeof (entry as RawUserEntry).message === 'object' &&
    (entry as RawUserEntry).message !== null &&
    (entry as RawUserEntry).message?.role === 'user'
  )
}

export function isAiTitleEntry(entry: RawEntry): entry is RawAiTitleEntry {
  return entry.type === 'ai-title' && typeof (entry as RawAiTitleEntry).aiTitle === 'string'
}

export function isCustomTitleEntry(
  entry: RawEntry,
): entry is import('../types/jsonl').RawCustomTitleEntry {
  return (
    entry.type === 'custom-title' &&
    typeof (entry as import('../types/jsonl').RawCustomTitleEntry).customTitle === 'string'
  )
}

/**
 * Extract plain text from user message content.
 * Handles both string and ContentBlock[] formats.
 * Skips tool_result, tool_use, image blocks.
 */
export function extractTextContent(content: string | ContentBlock[]): string {
  if (typeof content === 'string') {
    return content.trim()
  }

  return content
    .filter((block): block is ContentBlock & { type: 'text'; text: string } => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('\n')
    .trim()
}

/**
 * Check if a user entry is a real user prompt (not metadata/internal).
 */
export function isRealUserPrompt(entry: RawUserEntry): boolean {
  // Skip meta messages
  if (entry.isMeta === true) return false
  // Skip tool result injections
  if (entry.message?.content) {
    const content = entry.message.content
    if (Array.isArray(content)) {
      const hasOnlyToolResults = content.every(
        (block) => block.type === 'tool_result' || block.type === 'tool_use',
      )
      if (hasOnlyToolResults) return false
    }
  }
  const text = extractTextContent(entry.message.content)
  return text.length > 0
}

/**
 * Parse a raw JSONL file content (array of lines) into typed entries.
 * - Collects parse errors per line, never throws
 * - Deduplicates by UUID
 * - Returns all valid entries in order
 */
export function parseJsonlLines(lines: string[]): ParseResult {
  const entries: RawEntry[] = []
  const errors: ParseError[] = []
  const seenUuids = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch (err) {
      errors.push({
        lineNumber: i + 1,
        rawLine: line.slice(0, 200),
        error: err instanceof Error ? err.message : String(err),
      })
      continue
    }

    if (typeof parsed !== 'object' || parsed === null) {
      errors.push({
        lineNumber: i + 1,
        rawLine: line.slice(0, 200),
        error: 'Expected JSON object',
      })
      continue
    }

    const entry = parsed as RawEntry

    // Dedup by uuid when available
    const uuid = (entry as { uuid?: string }).uuid
    if (uuid) {
      if (seenUuids.has(uuid)) continue
      seenUuids.add(uuid)
    }

    entries.push(entry)
  }

  return { entries, errors, rawLines: lines }
}

/**
 * Decode a Claude project directory name to an approximate path.
 * The encoding is lossy (both '/' and '.' become '-'), so this is best-effort.
 * Prefer cwd from user messages when available.
 */
export function decodeDirName(dirName: string): string {
  // Remove leading dash and replace remaining dashes with slashes
  if (dirName.startsWith('-')) {
    return '/' + dirName.slice(1).replace(/-/g, '/')
  }
  return dirName.replace(/-/g, '/')
}

/**
 * Extract project name (last meaningful path segment) from a path.
 */
export function extractProjectName(projectPath: string): string {
  const parts = projectPath.split('/').filter(Boolean)
  return parts[parts.length - 1] || projectPath
}
