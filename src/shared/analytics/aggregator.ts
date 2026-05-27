import type { SessionSummary, ProjectSummary, ProjectDetail, AnalyticsSummary, MenuBarData, TokenUsage, DailyCost, ModelCost } from '../types/domain'
import { groupCostByDay, groupCostByModel } from '../pricing/calculator'
import { startOfDay, isAfter, subDays, format } from 'date-fns'

function emptyUsage(): TokenUsage {
  return { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, totalTokens: 0 }
}

function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheCreationTokens: a.cacheCreationTokens + b.cacheCreationTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  }
}

/**
 * Group sessions by project and compute per-project summaries.
 */
export function buildProjectSummaries(sessions: SessionSummary[]): ProjectSummary[] {
  const projectMap = new Map<string, { sessions: SessionSummary[] }>()

  for (const session of sessions) {
    const key = session.projectDirName
    const existing = projectMap.get(key)
    if (existing) {
      existing.sessions.push(session)
    } else {
      projectMap.set(key, { sessions: [session] })
    }
  }

  const summaries: ProjectSummary[] = []

  for (const [projectDirName, { sessions: projectSessions }] of projectMap.entries()) {
    const first = projectSessions[0]

    let usage = emptyUsage()
    let estimatedCost = 0
    let totalMessages = 0
    let firstSession = projectSessions[0].createdAt
    let lastActive = projectSessions[0].lastActive
    const allModels = new Set<string>()

    for (const session of projectSessions) {
      usage = addUsage(usage, session.usage)
      estimatedCost += session.estimatedCost
      totalMessages += session.messageCount
      if (session.createdAt < firstSession) firstSession = session.createdAt
      if (session.lastActive > lastActive) lastActive = session.lastActive
      for (const model of session.modelsUsed) allModels.add(model)
    }

    summaries.push({
      projectDirName,
      projectPath: first.projectPath,
      projectName: first.projectName,
      sessionCount: projectSessions.length,
      totalMessages,
      usage,
      estimatedCost,
      firstSession,
      lastActive,
      modelsUsed: Array.from(allModels),
    })
  }

  // Sort by lastActive descending
  return summaries.sort((a, b) => b.lastActive.localeCompare(a.lastActive))
}

/**
 * Build a full ProjectDetail including daily costs and model breakdown.
 */
export function buildProjectDetail(
  projectDirName: string,
  sessions: SessionSummary[],
): ProjectDetail {
  const summaries = buildProjectSummaries(sessions)
  const projectSummary = summaries.find((p) => p.projectDirName === projectDirName)

  if (!projectSummary) {
    throw new Error(`Project not found: ${projectDirName}`)
  }

  const projectSessions = sessions.filter((s) => s.projectDirName === projectDirName)
  const dailyCosts = groupCostByDay(projectSessions)
  const costByModel = groupCostByModel(projectSessions)

  return {
    ...projectSummary,
    sessions: projectSessions.sort((a, b) => b.lastActive.localeCompare(a.lastActive)),
    dailyCosts,
    costByModel,
  }
}

/**
 * Build the full analytics summary across all projects.
 */
export function buildAnalyticsSummary(sessions: SessionSummary[]): AnalyticsSummary {
  const projects = buildProjectSummaries(sessions)

  let totalCost = 0
  let totalTokens = 0
  for (const session of sessions) {
    totalCost += session.estimatedCost
    totalTokens += session.usage.totalTokens
  }

  const dailyCosts = groupCostByDay(sessions)
  const costByModel = groupCostByModel(sessions)

  const recentSessions = [...sessions]
    .sort((a, b) => b.lastActive.localeCompare(a.lastActive))
    .slice(0, 10)

  const topProjects = [...projects].sort((a, b) => b.estimatedCost - a.estimatedCost).slice(0, 5)

  const dates = sessions.map((s) => s.lastActive).sort()
  const dateRange = {
    from: dates[0] ?? new Date().toISOString(),
    to: dates[dates.length - 1] ?? new Date().toISOString(),
  }

  return {
    totalCost,
    totalTokens,
    projectCount: projects.length,
    sessionCount: sessions.length,
    dailyCosts,
    costByModel,
    recentSessions,
    topProjects,
    allProjects: projects,
    dateRange,
  }
}

/**
 * Compute billing period boundaries for a given cycle day.
 */
function getBillingPeriod(cycleDay: number, now: Date) {
  const day = now.getDate()
  const periodStart =
    day >= cycleDay
      ? new Date(now.getFullYear(), now.getMonth(), cycleDay)
      : new Date(now.getFullYear(), now.getMonth() - 1, cycleDay)
  const resetDate = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, cycleDay)
  const msLeft = resetDate.getTime() - now.getTime()
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
  return { periodStart, resetDate, daysLeft }
}

/**
 * Build menu bar quick view data.
 */
export function buildMenuBarData(sessions: SessionSummary[], billingCycleDay = 1): MenuBarData {
  const now = new Date()
  const todayStart = startOfDay(now)
  const weekStart = subDays(todayStart, 7)
  const { periodStart, resetDate, daysLeft } = getBillingPeriod(billingCycleDay, now)
  const periodStartStr = format(periodStart, 'yyyy-MM-dd')

  let todayCost = 0
  let todayTokens = 0
  let weekCost = 0
  let totalCost = 0
  let currentPeriodCost = 0

  for (const session of sessions) {
    const lastActiveDate = new Date(session.lastActive)
    const sessionDateStr = format(lastActiveDate, 'yyyy-MM-dd')
    totalCost += session.estimatedCost

    if (isAfter(lastActiveDate, weekStart)) {
      weekCost += session.estimatedCost
    }
    if (isAfter(lastActiveDate, todayStart)) {
      todayCost += session.estimatedCost
      todayTokens += session.usage.totalTokens
    }
    if (sessionDateStr >= periodStartStr) {
      currentPeriodCost += session.estimatedCost
    }
  }

  // Latest session
  const sorted = [...sessions].sort((a, b) => b.lastActive.localeCompare(a.lastActive))
  const latest = sorted[0]

  const latestSession = latest
    ? {
        cost: latest.estimatedCost,
        projectName: latest.projectName,
        model: latest.primaryModel,
        lastActive: latest.lastActive,
        firstPrompt: latest.firstPrompt,
      }
    : null

  return {
    todayCost,
    todayTokens,
    weekCost,
    totalCost,
    currentPeriodCost,
    periodResetDate: resetDate.toISOString(),
    periodDaysLeft: daysLeft,
    latestSession,
  }
}

/**
 * Filter sessions by date range (inclusive).
 */
export function filterSessionsByDateRange(
  sessions: SessionSummary[],
  from: Date,
  to: Date,
): SessionSummary[] {
  return sessions.filter((s) => {
    const d = new Date(s.lastActive)
    return d >= from && d <= to
  })
}

/**
 * Fill gaps in daily cost data so charts render continuous lines.
 * Fills in zero-cost days between first and last date.
 */
export function fillDailyCostGaps(dailyCosts: DailyCost[]): DailyCost[] {
  if (dailyCosts.length === 0) return []

  const sorted = [...dailyCosts].sort((a, b) => a.date.localeCompare(b.date))
  const firstDate = new Date(sorted[0].date)
  const lastDate = new Date(sorted[sorted.length - 1].date)

  const dateMap = new Map(sorted.map((d) => [d.date, d]))
  const result: DailyCost[] = []

  const current = new Date(firstDate)
  while (current <= lastDate) {
    const dateStr = current.toISOString().slice(0, 10)
    result.push(
      dateMap.get(dateStr) ?? {
        date: dateStr,
        cost: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
      },
    )
    current.setDate(current.getDate() + 1)
  }

  return result
}
