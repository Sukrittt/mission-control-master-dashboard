import fitnessContract from '../data/fitnessDashboard.sample.json'
import { SparkBars } from '../components/SparkBars'
import { toFitnessDashboardPanel } from '../services/fitnessDashboardAdapter'

const panel = toFitnessDashboardPanel(fitnessContract)

export function FitnessPage() {
  return (
    <section className="mc-content-grid">
      <section className="headline">
        <div>
          <h1>Fitness Dashboard</h1>
          <p className="muted">Updated {panel.lastUpdated}</p>
        </div>
        <span className="mc-chip mc-chip--green">{panel.remainingKg.toFixed(1)} kg to target</span>
      </section>

      <section className="mc-kpi-strip" aria-label="Fitness KPIs">
        <article className="mc-kpi-card">
          <p>Current Weight</p>
          <strong>{panel.currentWeightKg.toFixed(1)} kg</strong>
          <span className="muted">Target {panel.targetWeightKg.toFixed(1)} kg</span>
        </article>
        <article className="mc-kpi-card">
          <p>Adherence</p>
          <strong className="green">{panel.adherencePct.toFixed(1)}%</strong>
          <span className="muted">Calorie/protein/steps compliance</span>
        </article>
        <article className="mc-kpi-card">
          <p>Training completion</p>
          <strong>{panel.trainingCompletionPct.toFixed(0)}%</strong>
          <span className="muted">Workout streak: {panel.workoutStreakDays} days</span>
        </article>
        <article className="mc-kpi-card">
          <p>Protein avg</p>
          <strong>{panel.avgProteinG.toFixed(1)} g</strong>
          <span className="muted">Target {panel.proteinTargetG} g</span>
        </article>
      </section>

      <section className="mc-main-panels">
        <article className="mc-panel">
          <div className="mc-panel-header">
            <h3>Weight trend (7d)</h3>
            <p>Steady downward signal</p>
          </div>
          <SparkBars data={panel.weightSeries} formatValue={(value) => `${value.toFixed(1)} kg`} />
        </article>

        <article className="mc-panel">
          <div className="mc-panel-header">
            <h3>Steps trend (7d)</h3>
            <p>Baseline: {panel.stepTarget.toLocaleString()} steps/day</p>
          </div>
          <SparkBars data={panel.stepsSeries} formatValue={(value) => `${value.toFixed(0)} steps`} />
          <div className="mc-summary-row">
            <span className={`mc-chip mc-chip--${panel.avgSteps >= panel.stepTarget ? 'green' : 'amber'}`}>
              Avg {panel.avgSteps.toLocaleString()} / target {panel.stepTarget.toLocaleString()}
            </span>
            <span className={`mc-chip mc-chip--${panel.caloriesAvg >= panel.caloriesBand.min && panel.caloriesAvg <= panel.caloriesBand.max ? 'green' : 'amber'}`}>
              Calories avg {panel.caloriesAvg} ({panel.caloriesBand.min}-{panel.caloriesBand.max})
            </span>
          </div>
        </article>
      </section>
    </section>
  )
}
