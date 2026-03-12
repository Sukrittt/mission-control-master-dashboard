import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDashboard } from '../context/useDashboard'
import type { RiskSeverity, Status } from '../types'

const statusLabel: Record<Status, string> = {
  green: 'Green',
  amber: 'Amber',
  red: 'Red',
}

const riskOrder: Record<RiskSeverity, number> = {
  critical: 0,
  high: 1,
  med: 2,
  low: 3,
}

export function DashboardPage() {
  const { data } = useDashboard()

  const sortedRisks = useMemo(
    () =>
      [...(data?.risks ?? [])].sort((a, b) => {
        const severityDiff = riskOrder[a.severity] - riskOrder[b.severity]
        if (severityDiff !== 0) return severityDiff
        return a.dueDate.localeCompare(b.dueDate)
      }),
    [data?.risks],
  )

  if (!data) return null

  return (
    <>
      <section className="headline" aria-label="Dashboard date and overall status">
        <div>
          <h1>Mission Control Dashboard</h1>
          <p className="muted">{data.dateLabel}</p>
        </div>
        <span className={`pill status-chip ${data.overallHealth}`}>● Overall Health: {statusLabel[data.overallHealth]}</span>
      </section>

      <section className="kpi-strip" aria-label="KPI strip">
        {data.kpis.map((kpi) => (
          <article key={kpi.label} className="kpi-card">
            <p>{kpi.label}</p>
            <strong className={kpi.tone}>{kpi.value}</strong>
          </article>
        ))}
      </section>

      <section className="department-grid" aria-label="Department cards">
        {data.departments.map((department) => (
          <article key={department.id} className={`department-card status-${department.status}`}>
            <div className="department-title">
              <h2>{department.name}</h2>
              <span className={`pill status-chip ${department.status}`}>{statusLabel[department.status]}</span>
            </div>
            <p>Lead: {department.lead}</p>
            <p>Last update: {department.lastUpdate}</p>
            <div className="department-meta">
              <span>{department.activeInitiatives} active initiatives</span>
              <span>{department.openRisks} open risks</span>
            </div>
            <Link className="inline-link" to={`/departments/${department.id}`}>
              Open details →
            </Link>
          </article>
        ))}
      </section>

      <section className="main-panels" aria-label="Primary operations panels">
        <article className="panel" aria-label="Daily updates panel">
          <div className="panel-header">
            <h3>Daily Updates</h3>
            <p>Done / Changed / Next / Risk</p>
          </div>
          <div className="updates-list">
            {data.dailyUpdates.map((update) => (
              <details key={update.departmentId} className="update-item" open={update.departmentId === 'engineering'}>
                <summary>
                  <span>{update.departmentName}</span>
                  <div className="summary-end">
                    <span className={`pill status-chip ${update.status}`}>{statusLabel[update.status]}</span>
                    <span className="chevron" aria-hidden="true">
                      ▾
                    </span>
                  </div>
                </summary>
                <div className="update-body">
                  <UpdateList title="Done" items={update.done} />
                  <UpdateList title="Changed" items={update.changed} />
                  <UpdateList title="Next" items={update.next} />
                  <UpdateList title="Risk" items={update.risk} />
                </div>
              </details>
            ))}
          </div>
        </article>

        <article className="panel" aria-label="Critical risks panel">
          <div className="panel-header">
            <h3>Critical Risks</h3>
            <p>Sorted by severity and due date</p>
          </div>
          <ul className="risk-list">
            {sortedRisks.map((risk) => {
              const urgency = getDueUrgency(risk.dueDate)
              return (
                <li key={risk.id} className={`risk-row severity-${risk.severity}`}>
                  <div>
                    <p className="risk-title">{risk.title}</p>
                    <p className="risk-meta">
                      {risk.departmentName} • {risk.owner} • due {risk.dueDate}
                    </p>
                    <p className="clamp-2">{risk.mitigation}</p>
                  </div>
                  <div className="risk-right">
                    <span className={`pill ${risk.severity === 'critical' || risk.severity === 'high' ? 'red' : 'amber'}`}>
                      {risk.severity.toUpperCase()}
                    </span>
                    <span className={`pill urgency ${urgency.tone}`}>{urgency.label}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </article>
      </section>

      <section className="main-panels" aria-label="Context modules">
        <article className="panel" aria-label="Learning feed">
          <div className="panel-header">
            <h3>Daily Learning Feed</h3>
            <p>Chronological notes from all departments</p>
          </div>
          <div className="learning-list">
            {data.learnings.map((entry) => (
              <article key={entry.id} className={`learning-item ${entry.importance === 'high' ? 'is-high' : ''}`}>
                <div className="learning-top">
                  <strong>{entry.title}</strong>
                  <span>
                    {entry.departmentName} • {entry.time}
                  </span>
                </div>
                <p>{entry.note}</p>
                <div className="tags">
                  {entry.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                  {entry.importance === 'high' && <span className="pin">★ Pinned</span>}
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="panel" aria-label="Activity timeline">
          <div className="panel-header">
            <h3>Activity Timeline</h3>
            <p>Latest cross-team signal stream</p>
          </div>
          <ul className="timeline-list">
            {data.activities.map((item) => (
              <li key={item.id}>
                <div className={`timeline-dot ${item.type}`} />
                <div>
                  <p className="risk-title">{item.title}</p>
                  <p className="risk-meta">
                    {item.departmentName} • {item.timestamp}
                  </p>
                  <p>{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </>
  )
}

function UpdateList({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={`${title}-${item}`}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

function getDueUrgency(dueDate: string) {
  const now = new Date()
  const due = new Date(dueDate)
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { label: 'Overdue', tone: 'red' }
  if (diffDays <= 3) return { label: 'Due soon', tone: 'amber' }
  return { label: 'Planned', tone: 'green' }
}
