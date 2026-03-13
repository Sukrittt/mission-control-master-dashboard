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
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const spread = Math.max(1, max - min)

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
            const offset = spread === 0 ? 50 : ((level.value - min) / spread) * 100
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
          const normalized = spread === 0 ? 0.5 : (row.value - min) / spread
          const height = 20 + normalized * 100
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
