interface SparkBarsProps {
  data: Array<{ date: string; value: number }>
  formatValue?: (value: number) => string
}

export function SparkBars({ data, formatValue = (value) => `${value}` }: SparkBarsProps) {
  const values = data.map((row) => row.value)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const spread = Math.max(1, max - min)

  return (
    <div className="spark-bars" role="img" aria-label="Recent trend mini chart">
      {data.map((row) => {
        const normalized = spread === 0 ? 0.5 : (row.value - min) / spread
        const height = 22 + normalized * 98

        return (
          <div key={row.date} className="spark-bar-wrap" title={`${row.date}: ${formatValue(row.value)}`}>
            <div className="spark-bar" style={{ height: `${height}px` }} />
            <span>{row.date.slice(5)}</span>
          </div>
        )
      })}
    </div>
  )
}
