import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useMemo } from 'react'
import './App.css'
import { DashboardProvider } from './context/DashboardProvider'
import { useDashboard } from './context/useDashboard'
import { DashboardPage } from './pages/DashboardPage'
import { DepartmentDetailPage, DepartmentsPage } from './pages/DepartmentsPage'
import { LearningsPage } from './pages/LearningsPage'
import { RisksPage } from './pages/RisksPage'

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Cross-team pulse and mission health' },
  '/departments': { title: 'Departments', subtitle: 'Ownership, updates, and execution status' },
  '/risks': { title: 'Risks', subtitle: 'Severity queue, mitigation, and due windows' },
  '/learnings': { title: 'Learnings', subtitle: 'Operational insights and reusable discoveries' },
}

function AppShell() {
  const { data, loading, error, reload } = useDashboard()
  const { pathname } = useLocation()

  const currentMeta = useMemo(() => {
    if (pathname.startsWith('/departments/')) {
      return { title: 'Department Detail', subtitle: 'Latest update and risk register' }
    }

    return pageMeta[pathname] ?? pageMeta['/']
  }, [pathname])

  const lastSync = useMemo(() => {
    if (!data) return '—'

    const updateTimes = data.dailyUpdates.map((item) => item.updatedAt).sort()
    return updateTimes.at(-1) ?? data.dateLabel
  }, [data])

  return (
    <main className="page-shell">
      <header className="top-nav">
        <div className="brand-block">
          <strong>Mission Control</strong>
          <span>Operations Center</span>
        </div>

        <div className="page-context">
          <h2>{currentMeta.title}</h2>
          <p>{currentMeta.subtitle}</p>
        </div>

        <div className="utility-cluster">
          <span className="pill status-chip green">● System nominal</span>
          <span className="muted">Last synced: {lastSync}</span>
          <button type="button" className="action-button" onClick={() => void reload()}>
            Refresh
          </button>
        </div>

        <nav aria-label="Primary">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Dashboard
          </NavLink>
          <NavLink to="/departments" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Departments
          </NavLink>
          <NavLink to="/risks" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Risks
          </NavLink>
          <NavLink to="/learnings" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Learnings
          </NavLink>
        </nav>
      </header>

      {loading ? (
        <section className="state-panel" aria-live="polite">
          <h2>Loading dashboard…</h2>
          <p>Fetching latest mission-control data.</p>
        </section>
      ) : error ? (
        <section className="state-panel" aria-live="assertive">
          <h2>Could not load dashboard data</h2>
          <p className="error">{error}</p>
          <button type="button" className="action-button" onClick={() => void reload()}>
            Retry
          </button>
        </section>
      ) : (
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/departments/:departmentId" element={<DepartmentDetailPage />} />
          <Route path="/risks" element={<RisksPage />} />
          <Route path="/learnings" element={<LearningsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </main>
  )
}

function App() {
  return (
    <DashboardProvider>
      <AppShell />
    </DashboardProvider>
  )
}

export default App
