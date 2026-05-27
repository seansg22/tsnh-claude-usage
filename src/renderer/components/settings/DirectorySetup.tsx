import React, { useEffect, useState } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'

interface DirectorySetupProps {
  onComplete: () => void
}

export function DirectorySetup({ onComplete }: DirectorySetupProps) {
  const { setBaseDir } = useSettingsStore()
  const [defaultDir, setDefaultDir] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    window.claudeAnalytics.getDefaultDir().then(setDefaultDir)
  }, [])

  const handleUseDefault = async () => {
    if (!defaultDir) return
    setIsLoading(true)
    try {
      setBaseDir(defaultDir)
      onComplete()
    } finally {
      setIsLoading(false)
    }
  }

  const handleBrowse = async () => {
    const dir = await window.claudeAnalytics.selectDirectory()
    if (dir) {
      setBaseDir(dir)
      onComplete()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-claude-border bg-claude-surface p-8 shadow-2xl">
        {/* Title */}
        <h1 className="mb-2 text-center text-xl font-bold text-claude-text">
          Welcome to TSNH Claude Usage
        </h1>
        <p className="mb-6 text-center text-sm text-claude-muted">
          Choose your Claude Code data directory to get started.
          Your data stays completely local — nothing is uploaded.
        </p>

        {/* Default path */}
        {defaultDir && (
          <div className="mb-4 rounded-lg border border-claude-border bg-claude-bg px-3 py-2.5">
            <p className="mb-0.5 text-xs font-medium text-claude-muted">Default location</p>
            <p className="truncate font-mono text-xs text-claude-text">{defaultDir}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleUseDefault}
            disabled={!defaultDir || isLoading}
            className="w-full rounded-xl bg-claude-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-claude-orange-hover transition-colors disabled:opacity-50"
          >
            Use Default Location
          </button>
          <button
            onClick={handleBrowse}
            className="w-full rounded-xl border border-claude-border px-4 py-2.5 text-sm font-medium text-claude-muted hover:border-claude-orange/30 hover:text-claude-text transition-colors"
          >
            Browse…
          </button>
        </div>

        {/* Privacy note */}
        <p className="mt-4 text-center text-xs text-claude-muted">
          All data is read locally. No network requests are made.
        </p>
      </div>
    </div>
  )
}
