import { useEffect, useMemo, useRef, useState } from 'react'
import expenseSample from '../data/expensePanel.sample.json'
import { SparkBars } from '../components/SparkBars'
import { toExpensePanelData } from '../services/expensePanelAdapter'

type PeriodKey = '7d' | '30d' | 'mtd' | 'custom'

const panel = toExpensePanelData(expenseSample)

function formatLastUpdated(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Updated recently'

  const mins = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000))
  if (mins < 60) return `Updated ${mins}m ago`

  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `Updated ${hrs}h ago`

  return `Updated ${Math.round(hrs / 24)}d ago`
}

function toDateInputValue(value: Date): string {
  return value.toISOString().slice(0, 10)
}

type DecisionFooterModel = {
  cause: string
  risk: string
  nextAction24h: string
}

function DecisionFooter({ model }: { model: DecisionFooterModel }) {
  return (
    <footer className="decision-footer" aria-label="Decision footer">
      <p>
        <span>Cause</span>
        {model.cause}
      </p>
      <p>
        <span>Risk if ignored</span>
        {model.risk}
      </p>
      <p>
        <span>Next action (24h)</span>
        {model.nextAction24h}
      </p>
    </footer>
  )
}

export function ExpensePage() {
  const [period, setPeriod] = useState<PeriodKey>('mtd')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [categoryQuery, setCategoryQuery] = useState('')
  const [applyCategoryToKpis, setApplyCategoryToKpis] = useState(true)
  const [focusedCategory, setFocusedCategory] = useState<string | null>(null)
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null)

  const latestDate = useMemo(() => {
    const last = panel.miniTrend.at(-1)?.date ?? panel.month
    const date = new Date(last)
    return Number.isNaN(date.getTime()) ? new Date() : date
  }, [])

  const [customStart, setCustomStart] = useState<string>(toDateInputValue(new Date(latestDate.getFullYear(), latestDate.getMonth(), 1)))
  const [customEnd, setCustomEnd] = useState<string>(toDateInputValue(latestDate))

  const categoryOptions = useMemo(() => panel.topCategories.map((category) => category.category), [])

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!categoryDropdownRef.current?.contains(event.target as Node)) {
        setIsCategoryOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const filteredTrend = useMemo(() => {
    const rows = [...panel.miniTrend]
    const end = new Date(latestDate)
    let start = new Date(rows[0]?.date ?? end)

    if (period === '7d') {
      start = new Date(end)
      start.setDate(end.getDate() - 6)
    } else if (period === '30d') {
      start = new Date(end)
      start.setDate(end.getDate() - 29)
    } else if (period === 'mtd') {
      start = new Date(end.getFullYear(), end.getMonth(), 1)
    } else {
      const parsedStart = new Date(customStart)
      const parsedEnd = new Date(customEnd)
      if (!Number.isNaN(parsedStart.getTime()) && !Number.isNaN(parsedEnd.getTime())) {
        start = parsedStart
        if (parsedEnd.getTime() < end.getTime()) {
          end.setTime(parsedEnd.getTime())
        }
      }
    }

    return rows.filter((row) => {
      const date = new Date(row.date)
      return !Number.isNaN(date.getTime()) && date >= start && date <= end
    })
  }, [customEnd, customStart, latestDate, period])

  const filteredCategories = useMemo(() => {
    if (!selectedCategories.length) return panel.topCategories.slice(0, 8)
    return panel.topCategories.filter((row) => selectedCategories.includes(row.category)).slice(0, 8)
  }, [selectedCategories])

  const visibleCategoryOptions = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase()
    if (!query) return categoryOptions
    return categoryOptions.filter((category) => category.toLowerCase().includes(query))
  }, [categoryOptions, categoryQuery])

  const categoryTotal = useMemo(
    () => panel.topCategories.reduce((sum, row) => sum + row.amountInr, 0),
    [],
  )

  const selectedCategoryTotal = useMemo(() => {
    if (!selectedCategories.length) return categoryTotal
    return panel.topCategories
      .filter((row) => selectedCategories.includes(row.category))
      .reduce((sum, row) => sum + row.amountInr, 0)
  }, [categoryTotal, selectedCategories])

  const categoryScopeRatio = categoryTotal > 0 ? selectedCategoryTotal / categoryTotal : 1
  const useCategoryScopeOnKpi = applyCategoryToKpis && selectedCategories.length > 0
  const kpiRatio = useCategoryScopeOnKpi ? categoryScopeRatio : 1

  const periodTotal = useMemo(
    () => filteredTrend.reduce((sum, point) => sum + point.value, 0),
    [filteredTrend],
  )

  const filteredTotal = periodTotal * kpiRatio

  const periodDelta = useMemo(() => {
    if (filteredTrend.length < 2) return 0
    const half = Math.floor(filteredTrend.length / 2)
    const first = filteredTrend.slice(0, half)
    const second = filteredTrend.slice(half)
    const firstAvg = first.length ? first.reduce((sum, row) => sum + row.value, 0) / first.length : 0
    const secondAvg = second.length ? second.reduce((sum, row) => sum + row.value, 0) / second.length : 0
    if (!firstAvg) return 0
    return ((secondAvg - firstAvg) / firstAvg) * 100
  }, [filteredTrend])

  const adjustedRunRate = panel.avgDailyLast7Inr * kpiRatio
  const selectedShare = Math.max(0, Math.min(100, Math.round(categoryScopeRatio * 100)))

  const stalenessText = formatLastUpdated(panel.lastUpdated)
  const duesReceivableDisplay = 0

  const periodLabel = period === 'mtd' ? 'Month to date' : period === 'custom' ? 'Custom range' : period === '7d' ? 'Last 7 days' : 'Last 30 days'
  const periodOptions: Array<{ key: PeriodKey; label: string; helper: string }> = [
    { key: '7d', label: 'Last 7 days', helper: 'Quick pulse for recent movement.' },
    { key: '30d', label: 'Last 30 days', helper: 'Best for monthly drift checks.' },
    { key: 'mtd', label: 'Month to date', helper: 'Tracks progress against this month cap.' },
    { key: 'custom', label: 'Custom range', helper: 'Set exact start/end window.' },
  ]
  const categoryScopeLabel = selectedCategories.length
    ? `Filtered by: ${selectedCategories.length} categor${selectedCategories.length === 1 ? 'y' : 'ies'}`
    : 'Global (all categories)'
  const kpiScopeLabel = useCategoryScopeOnKpi
    ? `KPIs filtered by selected categories (${selectedShare}% of tracked spend)`
    : 'KPIs are global across all categories'

  const effectiveFocusedCategory = filteredCategories.some((row) => row.category === focusedCategory)
    ? focusedCategory
    : filteredCategories[0]?.category ?? null
  const focusedCategoryRow = filteredCategories.find((row) => row.category === effectiveFocusedCategory) ?? filteredCategories[0]
  const focusedCategoryShare = focusedCategoryRow?.sharePct ?? selectedShare

  const cause = focusedCategoryRow
    ? `${focusedCategoryRow.category} is currently the primary pressure point and accounts for ${focusedCategoryShare}% of tracked category spend.`
    : selectedCategories.length
      ? `${selectedCategories.join(', ')} are driving the current discretionary load.`
      : `${panel.topCategories[0]?.category ?? 'Top category'} remains the primary spend driver.`

  const impact = focusedCategoryRow
    ? `${periodLabel} spend sits at ₹${filteredTotal.toFixed(0)} with ${periodDelta > 0 ? '+' : ''}${periodDelta.toFixed(1)}% momentum. ${focusedCategoryRow.category} alone is ₹${focusedCategoryRow.amountInr.toFixed(0)}.`
    : `Window spend is ₹${filteredTotal.toFixed(0)} in ${periodLabel} with ${periodDelta > 0 ? '+' : ''}${periodDelta.toFixed(1)}% momentum.`

  const actionSteps = focusedCategoryRow
    ? [
        `Set a hard cap for ${focusedCategoryRow.category} for the next 48 hours.`,
        `Require a 24-hour cooldown before any new ${focusedCategoryRow.category} purchase.`,
        `Do one nightly audit for ${focusedCategoryRow.category} and remove non-urgent items.`,
      ]
    : useCategoryScopeOnKpi
      ? [
          'Pause new purchases in selected categories for 48 hours.',
          'Set a hard per-transaction cap before checkout.',
          'Review each selected category once daily and clear non-urgent carts.',
        ]
      : [
          'Apply the 48-hour cooling rule to non-essential purchases.',
          'Prioritize dues collection before discretionary spending resumes.',
          'Do one nightly spend review against daily soft cap.',
        ]

  const peakPoint = filteredTrend.reduce(
    (peak, row) => (row.value > peak.value ? row : peak),
    filteredTrend[0] ?? { date: '-', value: 0 },
  )

  const pressureDecisionFooter: DecisionFooterModel = focusedCategoryRow
    ? {
        cause: `${focusedCategoryRow.category} contributes ${focusedCategoryShare}% share in the current category scope.`,
        risk: `${focusedCategoryRow.category} can keep overall spend momentum elevated in ${periodLabel.toLowerCase()}.`,
        nextAction24h: `Lock one hard spending limit for ${focusedCategoryRow.category} and apply it today.`,
      }
    : {
        cause: selectedCategories.length ? 'Selected categories are concentrating discretionary spend.' : 'Top discretionary categories are still carrying most spend load.',
        risk: 'Without a focused cap, run-rate pressure can keep compounding this cycle.',
        nextAction24h: 'Set one temporary cap for discretionary categories before next checkout.',
      }

  const impactDecisionFooter: DecisionFooterModel = {
    cause: `${periodLabel} total is ₹${filteredTotal.toFixed(0)} with ${periodDelta > 0 ? '+' : ''}${periodDelta.toFixed(1)}% momentum.`,
    risk:
      periodDelta > 0
        ? 'Positive momentum can push this period beyond comfort range if unchecked.'
        : 'Even flat momentum can hide overspend pockets without daily checks.',
    nextAction24h:
      periodDelta > 0
        ? 'Review top 3 transactions from the latest window and cancel one non-essential spend.'
        : 'Run a quick 24h ledger check and flag any repeat discretionary purchase.',
  }

  const actionDecisionFooter: DecisionFooterModel = focusedCategoryRow
    ? {
        cause: `Current action list is anchored to ${focusedCategoryRow.category} because it is the active pressure category.`,
        risk: `If no action is executed today, ${focusedCategoryRow.category} leakage can repeat in the next spend cycle.`,
        nextAction24h: `Complete the first action item for ${focusedCategoryRow.category} before end of day.`,
      }
    : {
        cause: 'Action list is running in global mode because no single category is focused.',
        risk: 'Global plans fail when they are not translated into one concrete action today.',
        nextAction24h: 'Pick one action from the list and mark it done within 24h.',
      }

  return (
    <section className="mc-content-grid expense-view">
      <section className="headline">
        <div>
          <h1>Expense Command Center</h1>
          <p className="muted">{panel.month} • Quick-scan budget health</p>
        </div>
        <span className={`mc-chip mc-chip--${panel.runRateStatus === 'overshoot' ? 'red' : panel.runRateStatus === 'watch' ? 'amber' : 'green'}`}>
          {panel.runRateStatus === 'overshoot' ? '[!] CAP BREACHED' : panel.runRateStatus === 'watch' ? '[~] WATCH' : '[OK] ON TRACK'}
        </span>
      </section>

      <section className="mc-filterbar expense-toolbar" aria-label="Expense controls">
        <div className="toolbar-group toolbar-group--period">
          <span className="toolbar-label">Period range</span>
          <p className="toolbar-help">Changes trend window, KPI totals, and anomalies.</p>
          <p className="toolbar-help tiny-copy">Tip: hover/tap a preset to see what each period is best for.</p>
          <div className="mc-filter-chips" role="tablist" aria-label="Period presets">
            {periodOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`action-button ${period === option.key ? 'is-active' : ''}`}
                onClick={() => setPeriod(option.key)}
                title={option.helper}
                aria-label={`${option.label}. ${option.helper}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {period === 'custom' ? (
          <div className="toolbar-group custom-dates">
            <label>
              Start
              <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
            </label>
            <label>
              End
              <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
            </label>
          </div>
        ) : null}

        <div className="toolbar-group toolbar-group--category">
          <span className="toolbar-label">Category filter</span>
          <p className="toolbar-help">Filters category pressure and optionally KPI cards.</p>
          <div className="category-dropdown" ref={categoryDropdownRef}>
            <button
              type="button"
              className={`action-button category-trigger ${isCategoryOpen ? 'is-active' : ''}`}
              onClick={() => setIsCategoryOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={isCategoryOpen}
            >
              Categories
              <span className="mc-chip">{selectedCategories.length || 'All'}</span>
            </button>

            {isCategoryOpen ? (
              <div className="category-menu" role="menu" aria-label="Category multi-select">
                <input
                  type="search"
                  value={categoryQuery}
                  onChange={(event) => setCategoryQuery(event.target.value)}
                  placeholder="Search category"
                  aria-label="Search category"
                />
                <div className="category-menu-list">
                  {visibleCategoryOptions.length ? (
                    visibleCategoryOptions.map((category) => {
                      const selected = selectedCategories.includes(category)
                      return (
                        <label key={category} className="category-option">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              setSelectedCategories((prev) =>
                                prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category],
                              )
                            }
                          />
                          <span>{category}</span>
                        </label>
                      )
                    })
                  ) : (
                    <p className="muted">No categories match</p>
                  )}
                </div>
                <div className="category-menu-actions">
                  <button type="button" className="action-button is-ghost" onClick={() => setSelectedCategories([])}>
                    Clear
                  </button>
                  <button type="button" className="action-button" onClick={() => setIsCategoryOpen(false)}>
                    Done
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <label className="kpi-toggle" htmlFor="apply-kpi-filter">
            <input
              id="apply-kpi-filter"
              type="checkbox"
              checked={applyCategoryToKpis}
              onChange={(event) => setApplyCategoryToKpis(event.target.checked)}
            />
            Apply category filter to KPIs
          </label>
        </div>
      </section>

      <section className="mc-summary-row expense-scope-row" aria-label="Scope indicators">
        <span className="mc-chip">Period: {periodLabel}</span>
        <span className="mc-chip">Category scope: {categoryScopeLabel}</span>
        <span className="mc-chip">{kpiScopeLabel}</span>
      </section>

      <section className="mc-kpi-strip" aria-label="Expense KPIs">
        <article className="mc-kpi-card expense-kpi">
          <p>Total spend</p>
          <strong className={panel.runRateStatus === 'overshoot' ? 'red' : ''}>₹{filteredTotal.toFixed(0)}</strong>
          <span className="kpi-delta">{periodDelta > 0 ? '+' : ''}{periodDelta.toFixed(1)}% vs previous slice</span>
          <span className="muted">Cap: ₹{panel.monthlySpendCapInr.toFixed(0)} ({panel.spendVsCapPct}% used)</span>
          <span className="micro-signal">{useCategoryScopeOnKpi ? 'Filtered KPI' : 'Global KPI'} • {stalenessText}</span>
        </article>

        <article className="mc-kpi-card expense-kpi">
          <p>Run rate</p>
          <strong>₹{adjustedRunRate.toFixed(0)}/day</strong>
          <span className="kpi-delta">{panel.trendPct > 0 ? '+' : ''}{panel.trendPct}% vs previous week</span>
          <span className="muted">Soft cap: ₹{panel.dailySoftCapInr.toFixed(0)} / day</span>
          <span className="micro-signal">{useCategoryScopeOnKpi ? 'Filtered KPI' : 'Global KPI'} • {stalenessText}</span>
        </article>

        <article className="mc-kpi-card expense-kpi">
          <p>Category focus</p>
          <strong>{selectedShare}% of tracked spend</strong>
          <span className="muted tiny-copy">{selectedCategories.length ? 'Based on selected categories' : 'All categories selected'}</span>
          <span className="micro-signal">Single-purpose scope indicator</span>
        </article>

        <article className="mc-kpi-card expense-kpi">
          <p>Dues receivable</p>
          <strong>₹{duesReceivableDisplay.toFixed(2)}</strong>
          <span className="kpi-delta">Set to zero for current expense context</span>
          <span className="muted">Offset not counted in this view right now</span>
          <span className="micro-signal">Global context • {stalenessText}</span>
        </article>
      </section>

      <section className="mc-main-panels">
        <article className="mc-panel">
          <div className="mc-panel-header">
            <h3>Daily spend trend</h3>
            <p>{periodLabel} anomaly scan</p>
          </div>
          <SparkBars data={filteredTrend} formatValue={(value) => `₹${value.toFixed(0)}`} />
          <p className="muted tiny-copy">Peak day: {peakPoint.date} at ₹{peakPoint.value.toFixed(0)}. Bars remain subtle to prioritize pattern over noise.</p>
          <div className="mc-summary-row">
            {panel.alerts.map((alert) => (
              <span key={alert} className="mc-chip mc-chip--amber">
                [!] {alert}
              </span>
            ))}
          </div>

          <div className="mc-anomaly-wrap">
            <h4>Weekly anomalies (high-to-low)</h4>
            <table className="mc-compact-table">
              <thead>
                <tr>
                  <th>Week</th>
                  <th className="num">Spend</th>
                </tr>
              </thead>
              <tbody>
                {panel.weeklyAnomalies.map((week) => (
                  <tr key={week.key}>
                    <td>{week.label}</td>
                    <td className="num">₹{week.totalInr.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="mc-panel">
          <div className="mc-panel-header">
            <h3>Category pressure</h3>
            <p>{categoryScopeLabel}</p>
          </div>
          <div className="spaced-list">
            {filteredCategories.map((category) => {
              const isFocused = focusedCategoryRow?.category === category.category
              return (
                <button
                  key={category.category}
                  type="button"
                  className={`category-row ${isFocused ? 'is-focused' : ''}`}
                  onClick={() => setFocusedCategory(category.category)}
                  aria-pressed={isFocused}
                >
                  <div>
                    <p className="risk-title">{category.category}</p>
                    <p className="risk-meta">₹{category.amountInr.toFixed(0)}</p>
                  </div>
                  <span className="mc-chip">{category.sharePct}%</span>
                </button>
              )
            })}
          </div>

          <section className="mc-insight-stack">
            <article className="mc-insight-block">
              <h4>Focus category</h4>
              <p>{focusedCategoryRow?.category ?? 'No category selected yet'}</p>
            </article>
            <article className="mc-insight-block">
              <h4>Why pressure is rising</h4>
              <p>{cause}</p>
              <DecisionFooter model={pressureDecisionFooter} />
            </article>
            <article className="mc-insight-block">
              <h4>Current impact</h4>
              <p>{impact}</p>
              <DecisionFooter model={impactDecisionFooter} />
            </article>
            <article className="mc-insight-block">
              <h4>Do this in the next 48h</h4>
              <ul className="insight-actions">
                {actionSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
              <DecisionFooter model={actionDecisionFooter} />
            </article>
          </section>

          <div className="tags">
            {panel.deepLinks.map((link) => (
              <a key={link.label} className="inline-link" href={link.url} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        </article>
      </section>
    </section>
  )
}
