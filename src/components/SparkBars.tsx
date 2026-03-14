import { useMemo } from 'react'

interface SparkBarsProps {
  data: Array<{ date: string; value: number }>
  formatValue?: (value: number) => string
  size?: 'compact' | 'default' | 'expanded'
  showReferenceLines?: boolean
}

export function SparkBars({
  data,
  formatValue = (value) => `${value}`,
  size = 'default',
  showReferenceLines = false,
}: SparkBarsProps) {
  const values = data.map((row) => row.value)
  const sorted = [...values].sort((a, b) => a - b)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const q1Index = Math.max(0, Math.floor((sorted.length - 1) * 0.1))
  const q9Index = Math.max(0, Math.floor((sorted.length - 1) * 0.9))
  const robustMin = sorted[q1Index] ?? min
  const robustMax = sorted[q9Index] ?? max
  const robustSpread = Math.max(1, robustMax - robustMin)

  const avg = useMemo(() => {
    if (!data.length) return 0
    return data.reduce((sum, row) => sum + row.value, 0) / data.length
  }, [data])

  const referenceLevels = useMemo(() => {
    if (!showReferenceLines) return []
    return [
      { label: 'Min', value: min },
      { label: 'Avg', value: avg },
      { label: 'Max', value: max },
    ]
  }, [avg, max, min, showReferenceLines])

  const labelEvery = size === 'expanded' ? 3 : size === 'default' ? 2 : 4

  return (
    <div className={`spark-bars spark-bars--${size}`} role="img" aria-label="Expense trend chart">
      {showReferenceLines ? (
        <div className="spark-reference-grid" aria-hidden="true">
          {referenceLevels.map((level) => {
            const offset = robustSpread === 0 ? 50 : ((Math.max(robustMin, Math.min(robustMax, level.value)) - robustMin) / robustSpread) * 100
            return (
              <div key={level.label} className="spark-reference-line" style={{ bottom: `${offset}%` }}>
                <span>{level.label}</span>
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="spark-bars-inner">
        {data.map((row, index) => {
          const clamped = Math.max(robustMin, Math.min(robustMax, row.value))
          const normalized = robustSpread === 0 ? 0.5 : (clamped - robustMin) / robustSpread
          const height = 28 + normalized * 72
          const prev = data[index - 1]?.value ?? row.value
          const deltaPct = prev ? ((row.value - prev) / prev) * 100 : 0

          return (
            <div
              key={row.date}
              className="spark-bar-wrap"
              title={`${row.date}: ${formatValue(row.value)} (${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}% vs prev)`}
            >
              <div className="spark-bar" style={{ height: `${height}%` }} />
              <span>{index % labelEvery === 0 || index === data.length - 1 ? row.date.slice(5) : ''}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
