# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A local-first Electron desktop app (macOS) that reads Claude Code session data from `~/.claude/projects/` (JSONL files) and displays usage metrics, cost analytics, and session transcripts in a dashboard + menu bar widget.

## Commands

```bash
pnpm dev          # Start dev server with Electron + Vite HMR
pnpm build        # Build all processes (main, preload, renderer)
pnpm typecheck    # Type-check main and renderer processes
pnpm dist:mac     # Package into a macOS .dmg distributable
```

No lint or test commands are configured.

## Architecture

Three-process Electron structure:

### Main Process (`electron/main/`)
- `app.ts` — Electron lifecycle, window creation, auto-launch on startup
- `tray.ts` — macOS menu bar tray icon and popover window
- `ipc.ts` — All filesystem IPC handlers (only the main process touches the filesystem)
- `scanner.ts` — Streams JSONL files via Node.js `readline`

### Preload (`electron/preload/index.ts`)
Exposes a typed `window.api` via `contextBridge`. Any new IPC channel must be registered here. `contextIsolation: true`, `nodeIntegration: false`.

### Shared Logic (`src/shared/`)
- `types/` — TypeScript domain types: `JsonlEntry`, `Session`, `Project`, IPC types
- `parser/` — JSONL line parser + session builder
- `pricing/models.ts` — Per-model token pricing (edit here to add new models)
- `analytics/aggregator.ts` — Aggregates raw sessions into project/global stats

### Renderer (`src/renderer/`)
- **Routing:** React Router v6 with two root layouts: `/` (full dashboard) and `/menubar` (compact tray widget)
- **State:** Zustand stores under `stores/` — `settingsStore`, `analyticsStore`, `projectStore`, `sessionStore`
- **Routes:** `routes/dashboard/` (Overview, Projects, Sessions, SessionDetail, Settings) and `routes/menubar/MenuBarPage`
- **Path aliases:** `@shared/*` → `src/shared/*`, `@renderer/*` → `src/renderer/*`

## Data Flow

```
~/.claude/projects/**/*.jsonl
        ↓  (main process: scanner.ts + ipc.ts)
     IPC bridge (window.api)
        ↓  (renderer: Zustand stores)
  shared parser + aggregator
        ↓
   React UI (Recharts, React Router)
```

## Key Conventions

- **All filesystem access goes through IPC.** Never import Node.js modules in the renderer.
- **Adding a new IPC channel:** define the handler in `electron/main/ipc.ts`, expose it in `electron/preload/index.ts`, and type it in `src/shared/types/ipc.ts`.
- **Model pricing changes:** update `src/shared/pricing/models.ts` — both input/output and cache read/write rates per model.
- The app runs as a background macOS agent (`LSUIElement: true`); the dashboard window is opened on demand from the tray.
