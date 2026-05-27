import React, { useState } from 'react'

interface JsonViewerProps {
  lines: string[]
  maxHeight?: number
}

export function JsonViewer({ lines, maxHeight = 400 }: JsonViewerProps) {
  const [pretty, setPretty] = useState(true)

  const renderLine = (line: string, index: number) => {
    if (!line.trim()) return null

    let display = line
    if (pretty) {
      try {
        display = JSON.stringify(JSON.parse(line), null, 2)
      } catch {
        display = line
      }
    }

    return (
      <div key={index} className="border-b border-claude-border/30 py-2">
        <div className="mb-1 text-xs text-claude-muted">Line {index + 1}</div>
        <pre className="whitespace-pre-wrap break-all text-xs text-green-400 font-mono leading-relaxed">
          {display}
        </pre>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-claude-border bg-claude-bg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-claude-border px-3 py-2">
        <span className="text-xs font-medium text-claude-muted">{lines.length} lines</span>
        <div className="flex items-center gap-1 rounded-lg bg-claude-surface p-0.5">
          <button
            onClick={() => setPretty(true)}
            className={`rounded px-2 py-0.5 text-xs transition-colors ${
              pretty ? 'bg-claude-orange text-white' : 'text-claude-muted hover:text-claude-text'
            }`}
          >
            Pretty
          </button>
          <button
            onClick={() => setPretty(false)}
            className={`rounded px-2 py-0.5 text-xs transition-colors ${
              !pretty ? 'bg-claude-orange text-white' : 'text-claude-muted hover:text-claude-text'
            }`}
          >
            Raw
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="overflow-y-auto px-3"
        style={{ maxHeight }}
      >
        {lines.map((line, i) => renderLine(line, i))}
      </div>
    </div>
  )
}
