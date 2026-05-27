# Claude Usage

> A local-first macOS desktop app that tracks your Claude Code spending — cost, tokens, sessions, and full conversation transcripts — directly from your `~/.claude/projects/` data.

![Overview](docs/overview.png)

---

## Install

**Download the latest release:**

👉 [**Releases →**](https://github.com/seansg22/tsnh-claude-usage/releases/latest)

1. Download the `.dmg` for your Mac (Apple Silicon → `arm64`, Intel → `x64`)
2. Open the `.dmg` and drag **Claude Usage** to your Applications folder
3. First launch: **right-click → Open** to bypass the Gatekeeper warning (app is unsigned)

> The app lives in the **menu bar**. Click the tray icon to open the popover, or use **Open Dashboard** for the full window.

Once installed, the app updates itself automatically — you'll get a prompt to restart when a new version is ready.

---

## Features

- **Real-time cost dashboard** — total spend, token usage, daily cost chart, and per-model breakdown at a glance
- **Project & session explorer** — drill into any project or individual session with full conversation transcripts
- **Token breakdown** — see cache read, cache write, input, and output tokens per session with context window utilization
- **Budget notifications** — set a monthly budget and daily limit; get macOS alerts at configurable thresholds (10 % → 100 %)
- **Multi-currency support** — display costs in your local currency (SGD, USD, EUR, and more)
- **Menu bar widget** — a compact tray popover shows your current period spend without opening the full dashboard
- **Persistent filters** — date range, project filter, and search state survive app restarts
- **Local-first & read-only** — reads only from `~/.claude/projects/`; never modifies your data, no telemetry, no network requests

---

## Screenshots

### Overview

The main dashboard shows total cost, token volume, daily spend over time, model distribution, and your most expensive projects.

![Overview](docs/overview.png)

### Projects

Browse all Claude Code projects sorted by cost, token count, or last-active date.

![Projects](docs/projects.png)

### Sessions

Search and filter across all sessions by project, date range, or prompt text.

![Sessions](docs/sessions.png)

### Project Detail

Per-project view with aggregated stats, a cost-by-model breakdown, and a full session list.

![Project Detail](docs/project-detail.png)

### Session Detail

Full conversation transcript with per-turn metadata, a token breakdown table, and peak context window utilization.

![Session Detail](docs/session-detail.png)

### Notifications

Set period-budget milestones and a daily spending cap. Fires a macOS notification the first time each threshold is crossed per billing cycle.

![Notifications](docs/notifications.png)

### Settings

Configure your billing cycle day, monthly budget, display currency, and Claude projects directory.

![Settings](docs/settings.png)

### Menu Bar Widget

A compact tray popover showing your current-period spend, today's cost and token count, and a per-project breakdown — without opening the full dashboard.

![Menu Bar Widget](docs/menubar-widget.png)

---

## Configuration

All settings are available in the **Settings** page inside the app:

| Setting | Description |
|---|---|
| **Billing Cycle Day** | Day of the month your Anthropic billing period resets (1–28) |
| **Monthly Budget** | Shows a progress bar in the sidebar when spending approaches this amount |
| **Billing Currency** | Your Anthropic billing currency; costs are converted for display |
| **Data Directory** | Path to your Claude projects folder (default: `~/.claude/projects`) |

---

## License

MIT
