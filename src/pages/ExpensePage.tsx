import expenseSample from '../data/expensePanel.sample.json'
import { SparkBars } from '../components/SparkBars'
import { toExpensePanelData } from '../services/expensePanelAdapter'

const panel = toExpensePanelData(expenseSample)

export function ExpensePage() {
  return (
    <section className="mc-content-grid">
      <section className="headline">
        <div>
          <h1>Expense Command Center</h1>
          <p className="muted">{panel.month} • Updated {panel.lastUpdated}</p>
        </div>
        <span className={`mc-chip mc-chip--${panel.runRateStatus === 'overshoot' ? 'red' : panel.runRateStatus === 'watch' ? 'amber' : 'green'}`}>
          {panel.runRateStatus === 'overshoot' ? 'CAP BREACHED' : panel.runRateStatus === 'watch' ? 'WATCH' : 'ON TRACK'}
        </span>
      </section>

      <section className="mc-kpi-strip" aria-label="Expense KPIs">
        <article className="mc-kpi-card">
          <p>Month Spend</p>
          <strong className={panel.runRateStatus === 'overshoot' ? 'red' : ''}>₹{panel.monthSpendInr.toFixed(0)}</strong>
          <span className="muted">Cap ₹{panel.monthlySpendCapInr.toFixed(0)} ({panel.spendVsCapPct}%)</span>
        </article>
        <article className="mc-kpi-card">
          <p>7-Day Run Rate</p>
          <strong>₹{panel.avgDailyLast7Inr.toFixed(0)}/day</strong>
          <span className="muted">vs prev week: {panel.trendPct > 0 ? '+' : ''}{panel.trendPct}%</span>
        </article>
        <article className="mc-kpi-card">
          <p>Dues Receivable</p>
          <strong className="amber">₹{panel.duesReceivableInr.toFixed(2)}</strong>
          <span className="muted">Pending settlement to recover</span>
        </article>
      </section>

      <section className="mc-main-panels">
        <article className="mc-panel">
          <div className="mc-panel-header">
            <h3>Daily spend trend (10d)</h3>
            <p>Mini trend for quick anomaly scan</p>
          </div>
          <SparkBars data={panel.miniTrend} formatValue={(value) => `₹${value.toFixed(0)}`} />
          <div className="mc-summary-row">
            {panel.alerts.map((alert) => (
              <span key={alert} className="mc-chip mc-chip--amber">
                {alert}
              </span>
            ))}
          </div>
        </article>

        <article className="mc-panel">
          <div className="mc-panel-header">
            <h3>Category pressure</h3>
            <p>Highest monthly drivers</p>
          </div>
          <div className="spaced-list">
            {panel.topCategories.slice(0, 5).map((category) => (
              <div key={category.category} className="category-row">
                <div>
                  <p className="risk-title">{category.category}</p>
                  <p className="risk-meta">₹{category.amountInr.toFixed(0)}</p>
                </div>
                <span className="mc-chip">{category.sharePct}%</span>
              </div>
            ))}
          </div>
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
