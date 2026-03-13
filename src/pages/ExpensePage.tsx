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

type ActionModule = {
  title: string
  summary: string
  cta: string
}

export function ExpensePage() {
  const [period, setPeriod] = useState<PeriodKey>('mtd')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [categoryQuery, setCategoryQuery] = useState('')
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
  const allCategoriesSelected = selectedCategories.length === 0

  function selectAllCategories() {
    setSelectedCategories([])
  }

  function toggleCategory(category: string) {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) return prev.filter((item) => item !== category)
      return [...prev, category]
    })
  }

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

  const categoryTotal = useMemo(() => panel.topCategories.reduce((sum, row) => sum + row.amountInr, 0), [])

  const selectedCategoryTotal = useMemo(() => {
    if (!selectedCategories.length) return categoryTotal
    return panel.topCategories
      .filter((row) => selectedCategories.includes(row.category))
      .reduce((sum, row) => sum + row.amountInr, 0)
  }, [categoryTotal, selectedCategories])

  const categoryScopeRatio = categoryTotal > 0 ? selectedCategoryTotal / categoryTotal : 1
  const periodTotal = useMemo(() => filteredTrend.reduce((sum, point) => sum + point.value, 0), [filteredTrend])
  const filteredTotal = periodTotal * categoryScopeRatio

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

  const adjustedRunRate = panel.avgDailyLast7Inr * categoryScopeRatio
  const selectedShare = Math.max(0, Math.min(100, Math.round(categoryScopeRatio * 100)))
  const topCategory = filteredCategories[0] ?? panel.topCategories[0]
  const topCategoryShare = topCategory?.sharePct ?? selectedShare

  const stalenessText = formatLastUpdated(panel.lastUpdated)
  const periodLabel = period === 'mtd' ? 'Month to date' : period === 'custom' ? 'Custom' : period === '7d' ? 'Last 7 days' : 'Last 30 days'
  const categoryScopeLabel = selectedCategories.length ? `${selectedCategories.length} selected` : 'All categories'

  const effectiveFocusedCategory = filteredCategories.some((row) => row.category === focusedCategory)
    ? focusedCategory
    : filteredCategories[0]?.category ?? null
  const focusedCategoryRow = filteredCategories.find((row) => row.category === effectiveFocusedCategory) ?? filteredCategories[0]

  const focusChangeCue = focusedCategoryRow
    ? `Now focused: ${focusedCategoryRow.category} (${focusedCategoryRow.sharePct}% share, ₹${focusedCategoryRow.amountInr.toFixed(0)}). Action cards updated.`
    : 'No category data in current filter'

  const peakPoint = filteredTrend.reduce((peak, row) => (row.value > peak.value ? row : peak), filteredTrend[0] ?? { date: '-', value: 0 })

  const actionModules: ActionModule[] = [
    {
      title: 'Cause',
      summary: focusedCategoryRow
        ? `${focusedCategoryRow.category} is the top pressure category at ${focusedCategoryRow.sharePct}% share (₹${focusedCategoryRow.amountInr.toFixed(0)}).`
        : 'A single category is still dominating discretionary spend this period.',
      cta: 'Set temporary category cap',
    },
    {
      title: 'Risk',
      summary:
        periodDelta > 0
          ? `${periodLabel} momentum is +${periodDelta.toFixed(1)}%. If unchanged, end-of-period overshoot risk stays elevated.`
          : `${periodLabel} is stable, but recurring category spikes can still create month-end drift.`,
      cta: 'Review top 3 recent transactions',
    },
    {
      title: 'Next action',
      summary: `Run a 48h cooldown on non-essentials and keep daily spend under ₹${panel.dailySoftCapInr.toFixed(0)} until next check-in.`,
      cta: 'Start 48h cooldown',
    },
  ]

  return (
    <section className="mc-content-grid expense-view">
      <section className="headline">
        <div>
          <h1>Expense Command Center</h1>
          <p className="muted">{panel.month} • Decision-first premium view</p>
        </div>
        <span className={`mc-chip mc-chip--${panel.runRateStatus === 'overshoot' ? 'red' : panel.runRateStatus === 'watch' ? 'amber' : 'green'}`}>
          {panel.runRateStatus === 'overshoot' ? '[!] CAP BREACHED' : panel.runRateStatus === 'watch' ? '[~] WATCH' : '[OK] ON TRACK'}
        </span>
      </section>

      <section className="mc-filterbar expense-scopebar" aria-label="Scope bar">
        <div className="scope-group" role="group" aria-label="Period selector">
          <span className="toolbar-label">Period</span>
          <div className="mc-filter-chips" role="tablist" aria-label="Period presets">
            {(['7d', '30d', 'mtd'] as PeriodKey[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`action-button ${period === key ? 'is-active' : ''}`}
                onClick={() => setPeriod(key)}
                aria-label={key === '7d' ? 'Last 7 days' : key === '30d' ? 'Last 30 days' : 'Month to date'}
              >
                {key.toUpperCase()}
              </button>
            ))}
            <button
              type="button"
              className={`action-button ${period === 'custom' ? 'is-active' : ''}`}
              onClick={() => setPeriod('custom')}
              aria-label="Custom period"
            >
              Custom
            </button>
          </div>
        </div>

        {period === 'custom' ? (
          <div className="scope-group custom-dates">
            <label>
              Start
              <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} aria-label="Custom start date" />
            </label>
            <label>
              End
              <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} aria-label="Custom end date" />
            </label>
          </div>
        ) : null}

        <div className="scope-group scope-group--category" ref={categoryDropdownRef}>
          <span className="toolbar-label">Category</span>
          <button
            type="button"
            className={`action-button category-trigger ${isCategoryOpen ? 'is-active' : ''}`}
            onClick={() => setIsCategoryOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={isCategoryOpen}
            aria-label="Category filter"
          >
            {selectedCategories.length ? `${selectedCategories.length} selected` : 'All categories'}
            <span className="mc-chip">Scope</span>
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
                <label className="category-option category-option--all">
                  <input type="checkbox" checked={allCategoriesSelected} onChange={selectAllCategories} />
                  <span>All categories</span>
                </label>
                {visibleCategoryOptions.length ? (
                  visibleCategoryOptions.map((category) => {
                    const selected = selectedCategories.includes(category)
                    return (
                      <label key={category} className={`category-option ${selected ? 'is-selected' : ''}`}>
                        <input type="checkbox" checked={selected} onChange={() => toggleCategory(category)} />
                        <span>{category}</span>
                      </label>
                    )
                  })
                ) : (
                  <p className="muted">No categories match</p>
                )}
              </div>
              <div className="category-menu-actions">
                {selectedCategories.length ? (
                  <button type="button" className="action-button is-ghost" onClick={selectAllCategories}>
                    All categories
                  </button>
                ) : <span />}
                <button type="button" className="action-button" onClick={() => setIsCategoryOpen(false)}>
                  Done
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="scope-chip-row" aria-label="Active filters">
          <span className="mc-chip">{periodLabel}</span>
          <span className="mc-chip">{categoryScopeLabel}</span>
          {selectedCategories.length ? (
            <button type="button" className="action-button is-ghost" onClick={() => setSelectedCategories([])}>
              Clear filters
            </button>
          ) : null}
        </div>
      </section>

      <section className="mc-kpi-strip mc-kpi-strip--expense" aria-label="Expense KPIs">
        <article className="mc-kpi-card expense-kpi">
          <p>Total spend vs cap</p>
          <strong className={panel.runRateStatus === 'overshoot' ? 'red' : ''}>₹{filteredTotal.toFixed(0)}</strong>
          <span className="kpi-delta">{periodDelta > 0 ? '+' : ''}{periodDelta.toFixed(1)}% vs previous slice</span>
          <span className="muted">Cap ₹{panel.monthlySpendCapInr.toFixed(0)} • {stalenessText}</span>
        </article>

        <article className="mc-kpi-card expense-kpi">
          <p>Daily run rate vs soft cap</p>
          <strong>₹{adjustedRunRate.toFixed(0)}/day</strong>
          <span className="kpi-delta">Soft cap ₹{panel.dailySoftCapInr.toFixed(0)}/day</span>
          <span className="muted">Scope follows period + category filters</span>
        </article>

        <article className="mc-kpi-card expense-kpi">
          <p>Top category share</p>
          <strong>{topCategoryShare}%</strong>
          <span className="kpi-delta">{topCategory?.category ?? 'Category'} pressure</span>
          <span className="muted">{selectedCategories.length ? 'Filtered top category' : 'Global top category'}</span>
        </article>
      </section>

      <section className="mc-main-panels">
        <article className="mc-panel">
          <div className="mc-panel-header">
            <h3>Daily spend trend</h3>
            <p>{periodLabel} • peak {peakPoint.date} (₹{peakPoint.value.toFixed(0)})</p>
          </div>
          <SparkBars data={filteredTrend} size="expanded" showReferenceLines formatValue={(value) => `₹${value.toFixed(0)}`} />
          <div className="mc-summary-row">
            {panel.alerts.slice(0, 2).map((alert) => (
              <span key={alert} className="mc-chip mc-chip--amber">
                [!] {alert}
              </span>
            ))}
          </div>
        </article>

        <article className="mc-panel">
          <div className="mc-panel-header">
            <h3>Top pressure category</h3>
            <p>Tap a row to focus actions</p>
          </div>
          <p className="focus-change-cue" aria-live="polite">{focusChangeCue}</p>
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
        </article>
      </section>

      <section className="mc-action-modules" aria-label="Action modules">
        <p className="focus-change-cue focus-change-cue--inline">{focusChangeCue}</p>
        {actionModules.map((module) => (
          <article key={module.title} className="mc-action-module">
            <h4>{module.title}</h4>
            <p>{module.summary}</p>
            <button type="button" className="action-button">
              {module.cta}
            </button>
          </article>
        ))}
      </section>

      <details className="mc-secondary-details">
        <summary>Secondary details</summary>

        <div className="mc-secondary-grid">
          <article className="mc-anomaly-wrap">
            <h4>Weekly anomalies</h4>
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
          </article>

          <div className="tags">
            {panel.deepLinks.map((link) => (
              <a key={link.label} className="inline-link" href={link.url} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </details>
    </section>
  )
}
