import React, { useState, useRef } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useAnalyticsStore } from '../../stores/analyticsStore'
import { useNavigate } from 'react-router-dom'

interface FieldRowProps {
  label: string
  description: string
  children: React.ReactNode
}

function FieldRow({ label, description, children }: FieldRowProps) {
  return (
    <div className="flex items-start justify-between gap-8 py-4 border-b border-claude-border last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-claude-text">{label}</p>
        <p className="mt-0.5 text-xs text-claude-muted">{description}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

export function SettingsPage() {
  const {
    baseDir,
    setBaseDir,
    billingCycleDay,
    setBillingCycleDay,
    monthlyBudget,
    setMonthlyBudget,
    pricingDiscount,
    setPricingDiscount,
  } = useSettingsStore()
  const { invalidate } = useAnalyticsStore()
  const navigate = useNavigate()

  // Billing cycle day
  const [cycleInput, setCycleInput] = useState(String(billingCycleDay))
  const [cycleSaved, setCycleSaved] = useState(false)

  const commitCycleDay = () => {
    const val = parseInt(cycleInput, 10)
    if (!isNaN(val)) {
      setBillingCycleDay(val)
      setCycleSaved(true)
      setTimeout(() => setCycleSaved(false), 1500)
    }
  }

  // Monthly budget
  const [budgetInput, setBudgetInput] = useState(monthlyBudget != null ? String(monthlyBudget) : '')
  const [budgetSaved, setBudgetSaved] = useState(false)

  const commitBudget = () => {
    const val = parseFloat(budgetInput)
    setMonthlyBudget(!isNaN(val) && val > 0 ? val : null)
    setBudgetSaved(true)
    setTimeout(() => setBudgetSaved(false), 1500)
  }

  // Pricing discount
  const [discountInput, setDiscountInput] = useState(pricingDiscount > 0 ? String(pricingDiscount) : '')
  const [discountSaved, setDiscountSaved] = useState(false)

  const commitDiscount = () => {
    const val = parseFloat(discountInput)
    setPricingDiscount(!isNaN(val) && val > 0 ? val : 0)
    setDiscountSaved(true)
    setTimeout(() => setDiscountSaved(false), 1500)
  }

  // Data directory
  const handleChangeDir = async () => {
    const dir = await window.claudeAnalytics.selectDirectory()
    if (dir) {
      setBaseDir(dir)
      invalidate()
      navigate('/dashboard')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-claude-text">Settings</h1>
        <p className="mt-1 text-sm text-claude-muted">Configure billing, budget, and data preferences.</p>
      </div>

      {/* Billing */}
      <section className="rounded-xl border border-claude-border bg-claude-surface px-5">
        <h2 className="pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-claude-muted">Billing</h2>

        <FieldRow
          label="Billing Cycle Day"
          description="The day of the month your Anthropic billing period resets (1–28)."
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={28}
              value={cycleInput}
              onChange={(e) => setCycleInput(e.target.value)}
              onBlur={commitCycleDay}
              onKeyDown={(e) => e.key === 'Enter' && commitCycleDay()}
              className="w-16 rounded-lg border border-claude-border bg-claude-bg px-3 py-1.5 text-sm text-claude-text text-center focus:outline-none focus:ring-1 focus:ring-claude-orange/50"
            />
            {cycleSaved && <span className="text-xs text-green-400">Saved</span>}
          </div>
        </FieldRow>

        <FieldRow
          label="Monthly Budget"
          description="Show a progress bar on the dashboard when spending approaches this amount."
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-claude-border bg-claude-bg px-3 py-1.5 focus-within:ring-1 focus-within:ring-claude-orange/50">
              <span className="text-sm text-claude-muted">$</span>
              <input
                type="number"
                min={0}
                step={1}
                value={budgetInput}
                placeholder="None"
                onChange={(e) => setBudgetInput(e.target.value)}
                onBlur={commitBudget}
                onKeyDown={(e) => e.key === 'Enter' && commitBudget()}
                className="w-20 bg-transparent text-sm text-claude-text focus:outline-none"
              />
            </div>
            {budgetSaved && <span className="text-xs text-green-400">Saved</span>}
          </div>
        </FieldRow>

        <FieldRow
          label="Enterprise Discount"
          description="Your negotiated pricing discount percentage (0–100). Applied to all displayed costs."
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-claude-border bg-claude-bg px-3 py-1.5 focus-within:ring-1 focus-within:ring-claude-orange/50">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={discountInput}
                placeholder="0"
                onChange={(e) => setDiscountInput(e.target.value)}
                onBlur={commitDiscount}
                onKeyDown={(e) => e.key === 'Enter' && commitDiscount()}
                className="w-16 bg-transparent text-sm text-claude-text text-right focus:outline-none"
              />
              <span className="text-sm text-claude-muted">%</span>
            </div>
            {discountSaved && <span className="text-xs text-green-400">Saved</span>}
          </div>
        </FieldRow>
      </section>

      {/* Data */}
      <section className="rounded-xl border border-claude-border bg-claude-surface px-5">
        <h2 className="pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-claude-muted">Data</h2>

        <FieldRow
          label="Data Directory"
          description="Path to the Claude Code projects directory where JSONL session files are stored."
        >
          <div className="flex items-center gap-2">
            <span className="max-w-[200px] truncate rounded-lg border border-claude-border bg-claude-bg px-3 py-1.5 text-xs text-claude-muted" title={baseDir}>
              {baseDir || '—'}
            </span>
            <button
              onClick={handleChangeDir}
              className="rounded-lg border border-claude-border px-3 py-1.5 text-xs text-claude-muted hover:border-claude-orange/30 hover:text-claude-text transition-colors"
            >
              Change…
            </button>
          </div>
        </FieldRow>
      </section>
    </div>
  )
}
