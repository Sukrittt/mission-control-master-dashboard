interface SparkBarsProps {
  data: Array<{ date: string; value: number }>
  formatValue?: (value: number) => string
}

export function SparkBars({ data, formatValue = (value) => `${value}` }: SparkBarsProps) {
  const max = Math.max(...data.map((row) => row.value), 1)

  return (
    <div className="spark-bars" role="img" aria-label="Recent trend mini chart">
      {data.map((row) => (
        <div key={row.date} className="spark-bar-wrap" title={`${row.date}: ${formatValue(row.value)}`}>
          <div className="spark-bar" style={{ height: `${Math.max(8, (row.value / max) * 56)}px` }} />
          <span>{row.date.slice(5)}</span>
        </div>
      ))}
    </div>
  )
}
