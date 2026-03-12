import { useMemo, useState } from 'react'
import { useDashboard } from '../context/useDashboard'
import type { RiskSeverity } from '../types'

const riskOrder: Record<RiskSeverity, number> = {
  critical: 0,
  high: 1,
  med: 2,
  low: 3,
}

type DueWindow = 'all' | 'overdue' | 'soon' | 'later'

export function RisksPage() {
  const { data } = useDashboard()
  const [severityFilter, setSeverityFilter] = useState<RiskSeverity | 'all'>('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState<'all' | 'open' | 'monitoring' | 'mitigated' | 'closed'>('all')
  const [dueWindow, setDueWindow] = useState<DueWindow>('all')

  const risks = useMemo(() => data?.risks ?? [], [data?.risks])

  const departmentOptions = useMemo(() => ['all', ...new Set(risks.map((risk) => risk.departmentName))], [risks])

  const filtered = useMemo(
    () =>
      risks
        .filter((risk) => (severityFilter === 'all' ? true : risk.severity === severityFilter))
        .filter((risk) => (departmentFilter === 'all' ? true : risk.departmentName === departmentFilter))
        .filter((risk) => (stateFilter === 'all' ? true : risk.state === stateFilter))
        .filter((risk) => {
          const status = getDueWindow(risk.dueDate)
          return dueWindow === 'all' ? true : status === dueWindow
        })
        .sort((a, b) => {
          const severityDiff = riskOrder[a.severity] - riskOrder[b.severity]
          if (severityDiff !== 0) return severityDiff
          return a.dueDate.localeCompare(b.dueDate)
        }),
    [risks, severityFilter, departmentFilter, stateFilter, dueWindow],
  )

  if (!data) return null

  return (
    <section className="panel">
      <div className="panel-header">
        <h1>Risk Register</h1>
        <p>{filtered.length} records</p>
      </div>

      <div className="filters-row" aria-label="Risk filters">
        <label>
          Severity
          <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as RiskSeverity | 'all')}>
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="med">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>

        <label>
          Department
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
            {departmentOptions.map((department) => (
              <option key={department} value={department}>
                {department === 'all' ? 'All' : department}
              </option>
            ))}
          </select>
        </label>

        <label>
          State
          <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as typeof stateFilter)}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="monitoring">Monitoring</option>
            <option value="mitigated">Mitigated</option>
            <option value="closed">Closed</option>
          </select>
        </label>

        <label>
          Due window
          <select value={dueWindow} onChange={(event) => setDueWindow(event.target.value as DueWindow)}>
            <option value="all">All</option>
            <option value="overdue">Overdue</option>
            <option value="soon">Due soon</option>
            <option value="later">Later</option>
          </select>
        </label>

        <button
          type="button"
          className="action-button"
          onClick={() => {
            setSeverityFilter('all')
            setDepartmentFilter('all')
            setStateFilter('all')
            setDueWindow('all')
          }}
        >
          Reset
        </button>
      </div>

      {filtered.length ? (
        <ul className="risk-list spaced-list">
          {filtered.map((risk) => (
            <li key={risk.id} className={`risk-row severity-${risk.severity}`}>
              <div>
                <p className="risk-title">{risk.title}</p>
                <p className="risk-meta">
                  {risk.departmentName} • {risk.owner} • {risk.state} • due {risk.dueDate}
                </p>
                <p className="clamp-2">{risk.mitigation}</p>
              </div>
              <span className={`pill ${risk.severity === 'critical' || risk.severity === 'high' ? 'red' : 'amber'}`}>
                {risk.severity.toUpperCase()}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="state-panel">
          <h2>No risks match current filters</h2>
          <p>Try resetting filters to restore the full register.</p>
          <button
            type="button"
            className="action-button"
            onClick={() => {
              setSeverityFilter('all')
              setDepartmentFilter('all')
              setStateFilter('all')
              setDueWindow('all')
            }}
          >
            Reset filters
          </button>
        </div>
      )}
    </section>
  )
}

function getDueWindow(dueDate: string): DueWindow {
  const now = new Date()
  const due = new Date(dueDate)
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'overdue'
  if (diffDays <= 3) return 'soon'
  return 'later'
}
