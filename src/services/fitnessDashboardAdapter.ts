export interface FitnessDailyLog {
  date: string
  morningWeightKg: number
  caloriesKcal: number
  proteinG: number
  steps: number
  workout: { status: string; type: string; completed?: boolean }
  adherence: { calorieInRange: boolean; proteinMet: boolean; stepsMet: boolean }
}

export interface FitnessDashboardContract {
  meta: { generatedAt: string; weekStart: string }
  athleteProfile: {
    currentWeightKg: number
    targetWeightKg: number
  }
  targets: {
    calorieRange: { min: number; max: number }
    proteinG: number
    stepsMin: number
    plannedTrainingSessions: number
  }
  dailyLogs: FitnessDailyLog[]
  kpis: {
    weightTrendKgPerWeek: number
    adherencePct: number
    avgProteinG: number
    avgSteps: number
    trainingCompletionPct: number
  }
}

export interface FitnessDashboardPanel {
  lastUpdated: string
  currentWeightKg: number
  targetWeightKg: number
  remainingKg: number
  adherencePct: number
  trainingCompletionPct: number
  avgProteinG: number
  proteinTargetG: number
  avgSteps: number
  stepTarget: number
  caloriesAvg: number
  caloriesBand: { min: number; max: number }
  workoutStreakDays: number
  weightSeries: Array<{ date: string; value: number }>
  stepsSeries: Array<{ date: string; value: number }>
}

function average(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function toFitnessDashboardPanel(input: FitnessDashboardContract): FitnessDashboardPanel {
  const trailing = [...input.dailyLogs].sort((a, b) => a.date.localeCompare(b.date)).slice(-14)
  const recent7 = trailing.slice(-7)

  let streak = 0
  for (let index = recent7.length - 1; index >= 0; index -= 1) {
    if (recent7[index]?.workout.completed) {
      streak += 1
      continue
    }
    break
  }

  return {
    lastUpdated: input.meta.generatedAt,
    currentWeightKg: input.athleteProfile.currentWeightKg,
    targetWeightKg: input.athleteProfile.targetWeightKg,
    remainingKg: Number((input.athleteProfile.currentWeightKg - input.athleteProfile.targetWeightKg).toFixed(1)),
    adherencePct: input.kpis.adherencePct,
    trainingCompletionPct: input.kpis.trainingCompletionPct,
    avgProteinG: Number(input.kpis.avgProteinG.toFixed(1)),
    proteinTargetG: input.targets.proteinG,
    avgSteps: Math.round(input.kpis.avgSteps),
    stepTarget: input.targets.stepsMin,
    caloriesAvg: Math.round(average(recent7.map((row) => row.caloriesKcal))),
    caloriesBand: {
      min: input.targets.calorieRange.min,
      max: input.targets.calorieRange.max,
    },
    workoutStreakDays: streak,
    weightSeries: recent7.map((row) => ({ date: row.date, value: row.morningWeightKg })),
    stepsSeries: recent7.map((row) => ({ date: row.date, value: row.steps })),
  }
}
