// Raw JSONL entry shapes — exactly as parsed from disk

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_result'; tool_use_id: string; content: unknown }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'image'; source: unknown }
  | { type: 'thinking'; thinking: string }
  | { type: string; [key: string]: unknown }

export interface RawUsageData {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
  service_tier?: string
  [key: string]: unknown
}

export interface RawAssistantMessage {
  model: string
  id: string
  type: 'message'
  role: 'assistant'
  content: ContentBlock[]
  stop_reason: string
  usage: RawUsageData
}

export interface RawUserMessage {
  role: 'user'
  content: string | ContentBlock[]
}

export interface RawAssistantEntry {
  type: 'assistant'
  uuid: string
  parentUuid: string | null
  sessionId: string
  timestamp: string
  message: RawAssistantMessage
  cwd?: string
  gitBranch?: string
  version?: string
  entrypoint?: string
  userType?: string
  isSidechain?: boolean
  requestId?: string
}

export interface RawUserEntry {
  type: 'user'
  uuid: string
  parentUuid: string | null
  sessionId: string
  timestamp: string
  message: RawUserMessage
  cwd?: string
  userType?: string
  entrypoint?: string
  version?: string
  gitBranch?: string
  isSidechain?: boolean
  promptId?: string
  isMeta?: boolean
}

export interface RawAiTitleEntry {
  type: 'ai-title'
  uuid?: string
  sessionId: string
  timestamp?: string
  aiTitle: string
}

export interface RawCustomTitleEntry {
  type: 'custom-title'
  uuid?: string
  sessionId: string
  timestamp?: string
  customTitle: string
}

export interface RawLastPromptEntry {
  type: 'last-prompt'
  uuid?: string
  sessionId: string
  timestamp?: string
  lastPrompt: string
}

export interface RawSummaryEntry {
  type: 'summary'
  uuid?: string
  sessionId: string
  timestamp?: string
  summary: string
}

export type RawEntry =
  | RawAssistantEntry
  | RawUserEntry
  | RawAiTitleEntry
  | RawCustomTitleEntry
  | RawLastPromptEntry
  | RawSummaryEntry
  | { type: string; [key: string]: unknown }

export interface ParseError {
  lineNumber: number
  rawLine: string
  error: string
}
