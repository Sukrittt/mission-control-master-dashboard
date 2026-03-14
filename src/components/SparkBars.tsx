import { useMemo } from 'react'

interface SparkBarsProps {
  data: Array<{ date: string; value: number }>
  formatValue?: (value: number) => string
  size?: 'compact' | 'default' | 'expanded'
  showReferenceLines?: boolean
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0
  const index = (sorted.length - 1) * p
  const lo = Math.floor(index)
  const hi = Math.ceil(index)
  if (lo === hi) return sorted[lo]
  const weight = index - lo
  return sorted[lo] * (1 - weight) + sorted[hi] * weight
}

export function SparkBars({
  data,
  formatValue = (value) => `${value}`,
  size = 'default',
  showReferenceLines = false,
}: SparkBarsProps) {
  const values = data.map((row) => row.value)
  const sortedValues = [...values].sort((a, b) => a - b)

  const rawMin = Math.min(...values, 0)
  const rawMax = Math.max(...values, 0)
  const p10 = percentile(sortedValues, 0.1)
  const p50 = percentile(sortedValues, 0.5)
  const p90 = percentile(sortedValues, 0.9)

  const robustMin = Math.min(rawMin, p10)
  const robustMax = Math.max(p90, robustMin + 1)
  const paddedMin = Math.min(0, robustMin * 0.92)
  const paddedMax = robustMax * 1.08

  const useLogScale = rawMax > 0 && rawMax / Math.max(p50 || rawMin || 1, 1) > 6
  const transform = (value: number) => (useLogScale ? Math.log10(Math.max(0, value) + 1) : value)

  const domainMin = Number.isFinite(paddedMin) ? transform(paddedMin) : 0
  const domainMaxRaw = Number.isFinite(paddedMax) ? paddedMax : rawMax
  const domainMax = transform(domainMaxRaw)
  const spread = Math.max(domainMax - domainMin, 1)

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
            const clipped = Math.max(domainMin, Math.min(domainMax, transform(level.value)))
            const offset = ((clipped - domainMin) / spread) * 100
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
          const clipped = Math.max(domainMin, Math.min(domainMax, transform(row.value)))
          const normalized = (clipped - domainMin) / spread
          const height = 20 + normalized * 80
          const prev = data[index - 1]?.value ?? row.value
          const deltaPct = prev ? ((row.value - prev) / prev) * 100 : 0
          const isCurrent = index === data.length - 1

          return (
            <div
              key={`${row.date}-${index}`}
              className={`spark-bar-wrap ${isCurrent ? 'is-current' : ''}`}
              title={`${row.date}: ${formatValue(row.value)} (${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}% vs prev)`}
            >
              {isCurrent ? <strong className="spark-current-value">{formatValue(row.value)}</strong> : null}
              <div className="spark-bar" style={{ height: `${height}%` }} />
              <span>{index % labelEvery === 0 || index === data.length - 1 ? getLabel(row.date) : ''}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
