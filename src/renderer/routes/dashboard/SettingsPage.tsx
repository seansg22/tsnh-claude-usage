import React, { useState } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useAnalyticsStore } from '../../stores/analyticsStore'
import { useCurrencyStore } from '../../stores/currencyStore'
import { useNavigate } from 'react-router-dom'

const SUPPORTED_CURRENCIES = [
  { code: 'USD', label: 'USD – US Dollar' },
  { code: 'SGD', label: 'SGD – Singapore Dollar' },
  { code: 'EUR', label: 'EUR – Euro' },
  { code: 'GBP', label: 'GBP – British Pound' },
  { code: 'AUD', label: 'AUD – Australian Dollar' },
  { code: 'JPY', label: 'JPY – Japanese Yen' },
  { code: 'MYR', label: 'MYR – Malaysian Ringgit' },
  { code: 'THB', label: 'THB – Thai Baht' },
  { code: 'IDR', label: 'IDR – Indonesian Rupiah' },
  { code: 'PHP', label: 'PHP – Philippine Peso' },
]

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
    currency,
    setCurrency,
  } = useSettingsStore()
  const { invalidate } = useAnalyticsStore()
  const { rates, rateLoading, rateError } = useCurrencyStore()
  const navigate = useNavigate()

  const [cycleInput, setCycleInput] = useState(String(billingCycleDay))
  const [budgetInput, setBudgetInput] = useState(monthlyBudget != null ? String(monthlyBudget) : '')

  const commitCycleDay = () => {
    const val = parseInt(cycleInput, 10)
    if (!isNaN(val)) setBillingCycleDay(val)
  }

  const commitBudget = () => {
    const val = parseFloat(budgetInput)
    setMonthlyBudget(!isNaN(val) && val > 0 ? val : null)
  }

  const handleChangeDir = async () => {
    const dir = await window.claudeAnalytics.selectDirectory()
    if (dir) {
      setBaseDir(dir)
      invalidate()
      navigate('/dashboard')
    }
  }

  const currentRate = currency === 'USD' ? 1 : (rates[currency] ?? null)
  const rateLabel = rateLoading
    ? 'Fetching rate…'
    : rateError
      ? 'Rate unavailable'
      : currentRate != null && currency !== 'USD'
        ? `1 USD = ${currentRate.toFixed(4)} ${currency}`
        : null

  return (
    <div className="flex-1 overflow-y-auto p-5">
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
        </FieldRow>

        <FieldRow
          label="Monthly Budget"
          description="Show a progress bar on the dashboard when spending approaches this amount."
        >
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
        </FieldRow>

        <FieldRow
          label="Billing Currency"
          description="Your Anthropic billing currency. Costs are converted to USD equivalent for display."
        >
          <div className="flex flex-col items-end gap-1">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-lg border border-claude-border bg-claude-bg px-3 py-1.5 text-sm text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-orange/50"
            >
              {SUPPORTED_CURRENCIES.map(({ code, label }) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
            {rateLabel && (
              <span className="text-xs text-claude-muted">{rateLabel}</span>
            )}
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
    </div>
  )
}
