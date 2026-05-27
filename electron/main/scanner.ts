import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as readline from 'readline'
import type { SessionSummary, SessionDetail, ScanProgress } from '../../src/shared/types/domain'
import { parseJsonlLines } from '../../src/shared/parser/jsonlParser'
import { buildSession, buildProcessedMessages } from '../../src/shared/parser/sessionBuilder'

export interface ProjectFilePaths {
  projectDirName: string
  projectDirPath: string
  jsonlFiles: string[]
}

/**
 * Get the default Claude Code data directory.
 */
export function getDefaultClaudeDir(): string {
  return path.join(os.homedir(), '.claude', 'projects')
}

/**
 * Check if a directory exists and is accessible.
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.promises.stat(dirPath)
    return stat.isDirectory()
  } catch {
    return false
  }
}

/**
 * Scan the base directory for project subdirectories and their JSONL files.
 */
/**
 * Recursively collect all *.jsonl files under a directory.
 * Claude Code stores subagent sessions in nested subdirs such as:
 *   <project>/<session-uuid>/subagents/agent-*.jsonl
 *   <project>/<session-uuid>/tool-results/*.jsonl
 */
async function collectJsonlFiles(dirPath: string): Promise<string[]> {
  let entries: fs.Dirent[]
  try {
    entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
  } catch {
    return []
  }

  const results: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      results.push(fullPath)
    } else if (entry.isDirectory()) {
      const nested = await collectJsonlFiles(fullPath)
      results.push(...nested)
    }
  }
  return results
}

export async function scanProjectDirectory(baseDir: string): Promise<ProjectFilePaths[]> {
  const exists = await directoryExists(baseDir)
  if (!exists) return []

  let entries: fs.Dirent[]
  try {
    entries = await fs.promises.readdir(baseDir, { withFileTypes: true })
  } catch {
    return []
  }

  const projectDirs = entries.filter((e) => e.isDirectory())
  const result: ProjectFilePaths[] = []

  for (const dir of projectDirs) {
    const projectDirPath = path.join(baseDir, dir.name)
    // Recursively collect all JSONL files (includes subagents/, tool-results/, etc.)
    const jsonlFiles = await collectJsonlFiles(projectDirPath)

    if (jsonlFiles.length > 0) {
      result.push({
        projectDirName: dir.name,
        projectDirPath,
        jsonlFiles,
      })
    }
  }

  return result
}

/**
 * Read a JSONL file line-by-line using readline for memory efficiency.
 */
async function readJsonlFile(filePath: string): Promise<string[]> {
  const lines: string[] = []

  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, { encoding: 'utf-8' })
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

    rl.on('line', (line) => lines.push(line))
    rl.on('close', () => resolve(lines))
    rl.on('error', reject)
    stream.on('error', reject)
  })
}

/**
 * Parse all sessions from a list of project file paths.
 */
export async function parseAllSessions(
  projects: ProjectFilePaths[],
  onProgress: (progress: ScanProgress) => void,
): Promise<SessionSummary[]> {
  const allFiles = projects.flatMap((p) => p.jsonlFiles.map((f) => ({ file: f, project: p })))
  const total = allFiles.length
  const sessions: SessionSummary[] = []

  onProgress({ phase: 'parsing', current: 0, total })

  for (let i = 0; i < allFiles.length; i++) {
    const { file, project } = allFiles[i]
    onProgress({ phase: 'parsing', current: i, total, currentFile: path.basename(file) })

    try {
      const lines = await readJsonlFile(file)
      const parseResult = parseJsonlLines(lines)
      const session = buildSession(file, project.projectDirName, parseResult)
      sessions.push(session)
    } catch (err) {
      // Skip unreadable files
      console.error(`Failed to parse ${file}:`, err)
    }
  }

  onProgress({ phase: 'done', current: total, total })
  return sessions
}

/**
 * Parse a single session file for the detail view.
 */
export async function parseSessionDetail(filePath: string, projectDirName: string): Promise<SessionDetail> {
  const lines = await readJsonlFile(filePath)
  const parseResult = parseJsonlLines(lines)
  const session = buildSession(filePath, projectDirName, parseResult)
  const messages = buildProcessedMessages(parseResult.entries)

  return {
    ...session,
    messages,
    rawLines: lines,
  }
}

/**
 * Find the JSONL file for a specific session ID within a project directory.
 */
export async function findSessionFile(
  sessionId: string,
  projectDirName: string,
  baseDir: string,
): Promise<string | null> {
  const projectDirPath = path.join(baseDir, projectDirName)
  const exists = await directoryExists(projectDirPath)
  if (!exists) return null

  let files: fs.Dirent[]
  try {
    files = await fs.promises.readdir(projectDirPath, { withFileTypes: true })
  } catch {
    return null
  }

  const jsonlFiles = files
    .filter((f) => f.isFile() && f.name.endsWith('.jsonl'))
    .map((f) => path.join(projectDirPath, f.name))

  // Try to find by sessionId in filename first (Claude Code uses sessionId as filename)
  const byName = jsonlFiles.find((f) => path.basename(f, '.jsonl') === sessionId)
  if (byName) return byName

  // Scan files for matching sessionId
  for (const file of jsonlFiles) {
    try {
      const lines = await readJsonlFile(file)
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const obj = JSON.parse(line) as { sessionId?: string }
          if (obj.sessionId === sessionId) return file
        } catch {
          // skip
        }
      }
    } catch {
      // skip unreadable
    }
  }

  return null
}
