interface SettingsPageProps {
  theme: 'light' | 'dark'
  onThemeChange: (theme: 'light' | 'dark') => void
  density: 'comfortable' | 'compact'
  onDensityChange: (density: 'comfortable' | 'compact') => void
}

export function SettingsPage({ theme, onThemeChange, density, onDensityChange }: SettingsPageProps) {
  return (
    <section className="mc-content-grid">
      <article className="mc-panel">
        <div className="mc-panel-header">
          <h1>Settings</h1>
          <p>Operational preferences and display controls</p>
        </div>

        <div className="mc-settings-grid">
          <section className="mc-setting-card">
            <h3>Appearance</h3>
            <p className="muted">Theme mode</p>
            <div className="tags">
              <button className={`action-button ${theme === 'light' ? 'is-active' : ''}`} onClick={() => onThemeChange('light')}>
                Light
              </button>
              <button className={`action-button ${theme === 'dark' ? 'is-active' : ''}`} onClick={() => onThemeChange('dark')}>
                Dark
              </button>
            </div>
          </section>

          <section className="mc-setting-card">
            <h3>Density</h3>
            <p className="muted">UI compactness for operations view</p>
            <div className="tags">
              <button
                className={`action-button ${density === 'comfortable' ? 'is-active' : ''}`}
                onClick={() => onDensityChange('comfortable')}
              >
                Comfortable
              </button>
              <button className={`action-button ${density === 'compact' ? 'is-active' : ''}`} onClick={() => onDensityChange('compact')}>
                Compact
              </button>
            </div>
          </section>

          <section className="mc-setting-card">
            <h3>Notifications</h3>
            <p className="muted">Risk alert threshold</p>
            <select defaultValue="high">
              <option value="critical">Critical only</option>
              <option value="high">High and above</option>
              <option value="med">Medium and above</option>
            </select>
          </section>

          <section className="mc-setting-card">
            <h3>Data refresh</h3>
            <p className="muted">Cadence: every 15 minutes</p>
            <button className="action-button">Manual refresh trigger</button>
          </section>
        </div>
      </article>
    </section>
  )
}
