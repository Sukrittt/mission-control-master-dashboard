import { useMemo, useState } from 'react'
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

export function ExpensePage() {
  const [period, setPeriod] = useState<PeriodKey>('mtd')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const latestDate = useMemo(() => {
    const last = panel.miniTrend.at(-1)?.date ?? panel.month
    const date = new Date(last)
    return Number.isNaN(date.getTime()) ? new Date() : date
  }, [])

  const [customStart, setCustomStart] = useState<string>(toDateInputValue(new Date(latestDate.getFullYear(), latestDate.getMonth(), 1)))
  const [customEnd, setCustomEnd] = useState<string>(toDateInputValue(latestDate))

  const categoryOptions = useMemo(() => panel.topCategories.map((category) => category.category), [])

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
    if (!selectedCategories.length) return panel.topCategories.slice(0, 5)
    return panel.topCategories.filter((row) => selectedCategories.includes(row.category)).slice(0, 5)
  }, [selectedCategories])

  const filteredTotal = useMemo(
    () => filteredTrend.reduce((sum, point) => sum + point.value, 0),
    [filteredTrend],
  )

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

  const spendMixLine = `${panel.discretionarySharePct}% discretionary / ${panel.essentialSharePct}% essential`
  const stalenessText = formatLastUpdated(panel.lastUpdated)

  const cause = selectedCategories.length
    ? `${selectedCategories.join(', ')} is absorbing a high share of discretionary spend.`
    : `${panel.topCategories[0]?.category ?? 'Top category'} remains the primary spend driver.`

  const impact = `Current window spend is ₹${filteredTotal.toFixed(0)} with ${periodDelta > 0 ? '+' : ''}${periodDelta.toFixed(1)}% momentum.`

  const action = selectedCategories.length
    ? 'Set temporary guardrails on selected categories and review spend before checkout.'
    : 'Apply a 48h cooling rule on non-essential purchases and clear dues to offset overflow.'

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
        <div className="toolbar-group">
          <span className="toolbar-label">Period</span>
          <div className="mc-filter-chips">
            <button type="button" className={`action-button ${period === '7d' ? 'is-active' : ''}`} onClick={() => setPeriod('7d')}>
              7D
            </button>
            <button type="button" className={`action-button ${period === '30d' ? 'is-active' : ''}`} onClick={() => setPeriod('30d')}>
              30D
            </button>
            <button type="button" className={`action-button ${period === 'mtd' ? 'is-active' : ''}`} onClick={() => setPeriod('mtd')}>
              MTD
            </button>
            <button type="button" className={`action-button ${period === 'custom' ? 'is-active' : ''}`} onClick={() => setPeriod('custom')}>
              Custom
            </button>
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

        <div className="toolbar-group">
          <span className="toolbar-label">Categories</span>
          <div className="mc-filter-chips">
            {categoryOptions.slice(0, 6).map((category) => {
              const selected = selectedCategories.includes(category)
              return (
                <button
                  key={category}
                  type="button"
                  className={`action-button ${selected ? 'is-active' : 'is-ghost'}`}
                  onClick={() =>
                    setSelectedCategories((prev) =>
                      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category],
                    )
                  }
                >
                  {selected ? '[x]' : '[ ]'} {category}
                </button>
              )
            })}
            <button type="button" className="action-button" onClick={() => setSelectedCategories([])}>
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="mc-kpi-strip" aria-label="Expense KPIs">
        <article className="mc-kpi-card expense-kpi">
          <p>Primary</p>
          <strong className={panel.runRateStatus === 'overshoot' ? 'red' : ''}>₹{filteredTotal.toFixed(0)}</strong>
          <span className="kpi-delta">{periodDelta > 0 ? '+' : ''}{periodDelta.toFixed(1)}% vs previous slice</span>
          <span className="muted">Cap context: ₹{panel.monthlySpendCapInr.toFixed(0)} ({panel.spendVsCapPct}% used)</span>
          <span className="micro-signal">{stalenessText}</span>
        </article>

        <article className="mc-kpi-card expense-kpi">
          <p>Run Rate</p>
          <strong>₹{panel.avgDailyLast7Inr.toFixed(0)}/day</strong>
          <span className="kpi-delta">{panel.trendPct > 0 ? '+' : ''}{panel.trendPct}% vs previous week</span>
          <span className="muted">Soft-cap context: ₹{panel.dailySoftCapInr.toFixed(0)} per day</span>
          <span className="micro-signal">{stalenessText}</span>
        </article>

        <article className="mc-kpi-card expense-kpi">
          <p>Spend Mix</p>
          <strong>{spendMixLine}</strong>
          <span className="kpi-delta">Discretionary pressure remains elevated</span>
          <span className="muted">Context: lower non-essentials this week for recovery</span>
          <span className="micro-signal">{stalenessText}</span>
        </article>

        <article className="mc-kpi-card expense-kpi">
          <p>Dues Receivable</p>
          <strong className="amber">₹{panel.duesReceivableInr.toFixed(2)}</strong>
          <span className="kpi-delta">Recoverable offset available</span>
          <span className="muted">Context: use dues settlement before discretionary spend</span>
          <span className="micro-signal">{stalenessText}</span>
        </article>
      </section>

      <section className="mc-main-panels">
        <article className="mc-panel">
          <div className="mc-panel-header">
            <h3>Daily spend trend</h3>
            <p>{period.toUpperCase()} anomaly scan</p>
          </div>
          <SparkBars data={filteredTrend} formatValue={(value) => `₹${value.toFixed(0)}`} />
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
            <p>Interactive spend drivers</p>
          </div>
          <div className="spaced-list">
            {filteredCategories.map((category) => (
              <div key={category.category} className="category-row">
                <div>
                  <p className="risk-title">{category.category}</p>
                  <p className="risk-meta">₹{category.amountInr.toFixed(0)}</p>
                </div>
                <span className="mc-chip">{category.sharePct}%</span>
              </div>
            ))}
          </div>

          <section className="mc-insight-stack">
            <article className="mc-insight-block">
              <h4>Cause</h4>
              <p>{cause}</p>
            </article>
            <article className="mc-insight-block">
              <h4>Impact</h4>
              <p>{impact}</p>
            </article>
            <article className="mc-insight-block">
              <h4>Action</h4>
              <p>{action}</p>
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
