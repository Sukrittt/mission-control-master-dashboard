import type { Status } from '../types'

type StatusTone = Status | 'critical' | 'high' | 'med' | 'low' | 'overdue' | 'soon' | 'planned'

const toneMap: Record<StatusTone, 'green' | 'amber' | 'red'> = {
  green: 'green',
  amber: 'amber',
  red: 'red',
  critical: 'red',
  high: 'red',
  med: 'amber',
  low: 'green',
  overdue: 'red',
  soon: 'amber',
  planned: 'green',
}

export function StatusChip({ label, tone }: { label: string; tone: StatusTone }) {
  return <span className={`mc-chip mc-chip--${toneMap[tone]}`}>{label}</span>
}
