export interface ExpensePanelContract {
  meta: {
    generatedAt: string
    month: string
    monthlySpendCapInr: number
    dailySoftCapInr: number
  }
  totals: {
    monthSpendInr: number
    essentialSpendInr: number
    discretionarySpendInr: number
    duesReceivableInr: number
  }
  topCategories: Array<{ category: string; amountInr: number }>
  dailySpend: Array<{ date: string; amountInr: number }>
  alerts: string[]
  deepLinks: Array<{ label: string; url: string }>
}

export interface ExpensePanelData {
  lastUpdated: string
  month: string
  spendVsCapPct: number
  runRateStatus: 'ontrack' | 'watch' | 'overshoot'
  monthSpendInr: number
  monthlySpendCapInr: number
  avgDailyLast7Inr: number
  avgDailyPrev7Inr: number
  trendPct: number
  topCategories: Array<{ category: string; amountInr: number; sharePct: number }>
  duesReceivableInr: number
  alerts: string[]
  deepLinks: Array<{ label: string; url: string }>
  miniTrend: Array<{ date: string; value: number }>
}

function round(value: number, digits = 1): number {
  const base = 10 ** digits
  return Math.round(value * base) / base
}

export function toExpensePanelData(input: ExpensePanelContract): ExpensePanelData {
  const spendVsCapPct = (input.totals.monthSpendInr / input.meta.monthlySpendCapInr) * 100
  const recent = input.dailySpend.slice(-14)
  const prev = recent.slice(0, Math.max(0, recent.length - 7))
  const last = recent.slice(-7)

  const avgDailyPrev7Inr = prev.length ? prev.reduce((sum, row) => sum + row.amountInr, 0) / prev.length : 0
  const avgDailyLast7Inr = last.length ? last.reduce((sum, row) => sum + row.amountInr, 0) / last.length : 0
  const trendPct = avgDailyPrev7Inr > 0 ? ((avgDailyLast7Inr - avgDailyPrev7Inr) / avgDailyPrev7Inr) * 100 : 0

  const runRateStatus: ExpensePanelData['runRateStatus'] =
    spendVsCapPct > 100 ? 'overshoot' : spendVsCapPct > 85 ? 'watch' : 'ontrack'

  return {
    lastUpdated: input.meta.generatedAt,
    month: input.meta.month,
    spendVsCapPct: round(spendVsCapPct),
    runRateStatus,
    monthSpendInr: input.totals.monthSpendInr,
    monthlySpendCapInr: input.meta.monthlySpendCapInr,
    avgDailyLast7Inr: round(avgDailyLast7Inr, 0),
    avgDailyPrev7Inr: round(avgDailyPrev7Inr, 0),
    trendPct: round(trendPct),
    topCategories: input.topCategories.map((row) => ({
      ...row,
      sharePct: round((row.amountInr / input.totals.monthSpendInr) * 100),
    })),
    duesReceivableInr: input.totals.duesReceivableInr,
    alerts: input.alerts,
    deepLinks: input.deepLinks,
    miniTrend: input.dailySpend.slice(-10).map((row) => ({ date: row.date, value: row.amountInr })),
  }
}
