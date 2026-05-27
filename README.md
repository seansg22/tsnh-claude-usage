# Claude Usage — Desktop Dashboard

A local-first Electron desktop app for analyzing your Claude Code usage: costs, tokens, projects, sessions, and prompts — all displayed in a native macOS dashboard with menu bar quick view.

---

## Features

- **Overview Dashboard** — total cost, tokens, projects, sessions; daily cost chart; cost by model; recent sessions
- **Projects View** — all projects sorted by activity with cost/token breakdown
- **Project Detail** — per-project daily chart, model breakdown, searchable/sortable session list
- **Session Detail** — full conversation view, token/cost breakdown, raw JSONL viewer
- **Menu Bar Quick View** — today's cost, latest session info, all-time stats in a compact tray popover

## Privacy

**All data stays on your machine.** The app reads `~/.claude/projects/` (or a directory you choose) using local filesystem APIs. No data is sent to any server. No analytics, no telemetry, no network requests.

---

## Setup

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)

### Install & Run

```bash
pnpm install
pnpm dev
```

### Build (macOS)

```bash
pnpm build
pnpm dist:mac
```

Distributable `.dmg` is output to `release/`.

### Type Check

```bash
pnpm typecheck
```

---

## Architecture

```
electron/
  main/
    app.ts        ← App lifecycle
    tray.ts       ← Menu bar tray icon
    windows.ts    ← BrowserWindow management
    ipc.ts        ← IPC handlers (filesystem access)
    scanner.ts    ← JSONL file scanner (Node.js readline streaming)
  preload/
    index.ts      ← contextBridge API

src/
  shared/
    types/        ← Shared TypeScript types (jsonl, domain, ipc)
    parser/       ← JSONL parser + session builder
    pricing/      ← Model pricing config + cost calculator
    analytics/    ← Project/session aggregation
  renderer/
    routes/
      dashboard/  ← Overview, Projects, ProjectDetail, SessionDetail
      menubar/    ← Compact tray popover
    components/   ← Shared UI: StatCard, charts, tables, etc.
    stores/       ← Zustand state (settings, analytics, project, session)
```

**Security**: `contextIsolation: true`, `nodeIntegration: false`. All filesystem access is in the main process only; the renderer communicates through typed IPC.

---

## Pricing

Costs are **estimated** based on official Anthropic pricing at time of writing (USD per million tokens):

| Model | Input | Output | Cache Create | Cache Read |
|-------|-------|--------|-------------|------------|
| Claude Opus 4.7 | $15 | $75 | $18.75 | $1.50 |
| Claude Sonnet 4.6 | $3 | $15 | $3.75 | $0.30 |
| Claude Haiku 4.5 | $0.25 | $1.25 | $0.30 | $0.03 |

Update `src/shared/pricing/models.ts` to adjust for pricing changes.

---

## Data Source

Claude Code stores session data in `~/.claude/projects/` as JSONL files — one file per session, organized in subdirectories named after the project path. The app reads these files locally; invalid lines are collected as parse errors rather than crashing.
