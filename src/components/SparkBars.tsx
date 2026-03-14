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

  const rawMin = Math.min(...values, 0)
  const rawMax = Math.max(...values, 0)
  const maxValue = Math.max(rawMax, 0)

  const avg = useMemo(() => {
    if (!data.length) return 0
    return data.reduce((sum, row) => sum + row.value, 0) / data.length
  }, [data])

  const referenceLevels = useMemo(() => {
    if (!showReferenceLines) return []
    return [
      { label: 'Max', value: rawMax },
      { label: 'Average', value: avg },
      { label: 'Min', value: rawMin },
    ]
  }, [avg, rawMax, rawMin, showReferenceLines])

  const yTicks = useMemo(() => {
    const top = rawMax
    const mid = rawMin + (rawMax - rawMin) / 2
    const low = rawMin
    return [top, mid, low]
  }, [rawMax, rawMin])

  const labelEvery = size === 'expanded' ? 2 : size === 'default' ? 2 : 4

  function getLabel(input: string): string {
    if (/^\d{4}-\d{2}$/.test(input)) {
      const d = new Date(`${input}-01`)
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { month: 'short' })
      }
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const d = new Date(input)
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      }
    }

    return input
  }

  return (
    <div className={`spark-bars spark-bars--${size}`} role="img" aria-label="Expense trend chart">
      <div className="spark-scale" aria-hidden="true">
        {yTicks.map((tick) => (
          <span key={tick}>{formatValue(tick)}</span>
        ))}
      </div>

      {showReferenceLines ? (
        <div className="spark-reference-grid" aria-hidden="true">
          {referenceLevels.map((level) => {
            const normalized = maxValue ? Math.max(0, Math.min(1, level.value / maxValue)) : 0
            const offset = normalized * 100
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
          const normalized = maxValue ? Math.max(0, Math.min(1, row.value / maxValue)) : 0
          const height = normalized * 100
          const prev = data[index - 1]?.value ?? row.value
          const deltaPct = prev ? ((row.value - prev) / prev) * 100 : 0
          const isCurrent = index === data.length - 1

          return (
            <div
              key={`${row.date}-${index}`}
              className={`spark-bar-wrap ${isCurrent ? 'is-current' : ''}`}
              title={`${row.date}: ${formatValue(row.value)} (${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}% vs prev)`}
            >
              <strong className="spark-bar-value">{formatValue(row.value)}</strong>
              <div className="spark-bar" style={{ height: `${height}%` }} />
              <span>{index % labelEvery === 0 || index === data.length - 1 ? getLabel(row.date) : ''}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
