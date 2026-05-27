// Canonical domain objects consumed by the UI

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
}

export interface ProcessedMessage {
  uuid: string
  parentUuid: string | null
  type: 'user' | 'assistant'
  timestamp: string
  content: string
  /** Names of tool_use blocks when there is no text content */
  toolCalls?: string[]
  /** True for harness-injected meta messages (isMeta=true in JSONL) */
  isMeta?: boolean
  /** True for user messages that are tool results (tool_result content blocks) */
  isToolResult?: boolean
  model?: string
  usage?: TokenUsage
  cost?: number
}

export interface SessionSummary {
  sessionId: string
  filePath: string
  projectDirName: string
  projectPath: string
  projectName: string
  title: string | null
  createdAt: string
  lastActive: string
  durationMs: number
  messageCount: number
  userMessageCount: number
  firstPrompt: string | null
  firstPromptFull: string | null
  allPrompts: string[]
  modelsUsed: string[]
  primaryModel: string
  usage: TokenUsage
  estimatedCost: number
  /** Per-message daily cost breakdown, keyed by YYYY-MM-DD. Used for accurate period attribution. */
  dailyCosts: DailyCost[]
  parseErrors: string[]
}

export interface DailyCost {
  date: string // YYYY-MM-DD
  cost: number
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
}

export interface ModelCost {
  model: string
  cost: number
  percentage: number
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
}

export interface ProjectSummary {
  projectDirName: string
  projectPath: string
  projectName: string
  sessionCount: number
  totalMessages: number
  usage: TokenUsage
  estimatedCost: number
  firstSession: string
  lastActive: string
  modelsUsed: string[]
}

export interface ProjectDetail extends ProjectSummary {
  sessions: SessionSummary[]
  dailyCosts: DailyCost[]
  costByModel: ModelCost[]
}

export interface SessionDetail extends SessionSummary {
  messages: ProcessedMessage[]
  rawLines: string[]
}

export interface AnalyticsSummary {
  totalCost: number
  totalTokens: number
  projectCount: number
  sessionCount: number
  dailyCosts: DailyCost[]
  costByModel: ModelCost[]
  recentSessions: SessionSummary[]
  topProjects: ProjectSummary[]
  allProjects: ProjectSummary[]
  dateRange: { from: string; to: string }
}

export interface MenuBarData {
  todayCost: number
  todayTokens: number
  weekCost: number
  totalCost: number
  currentPeriodCost: number
  periodResetDate: string // ISO date string
  periodDaysLeft: number
  latestSession: {
    cost: number
    projectName: string
    model: string
    lastActive: string
    firstPrompt: string | null
  } | null
}

export interface ScanProgress {
  phase: 'scanning' | 'parsing' | 'done' | 'error'
  current: number
  total: number
  currentFile?: string
  message?: string
}

export interface AppSettings {
  baseDir: string
  theme: 'dark' | 'light' | 'system'
  menuBarEnabled: boolean
}
