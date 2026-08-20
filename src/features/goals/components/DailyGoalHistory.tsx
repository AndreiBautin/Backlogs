import type { DailyGoalDay } from '@/domain/services/daily-goals'
import { cn } from '@/lib/utils'

interface DailyGoalHistoryProps {
  days: readonly DailyGoalDay[]
  label: string
}

/** A compact "did I hit it?" strip — one square per day, oldest on the left. */
export function DailyGoalHistory({ days, label }: DailyGoalHistoryProps) {
  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`${label}: met on ${days.filter((day) => day.isMet).length.toString()} of the last ${days.length.toString()} days`}
    >
      {days.map((day) => (
        <span
          key={day.date}
          title={`${day.date} — ${day.amount.toString()} logged`}
          className={cn(
            'size-2.5 rounded-[3px]',
            day.isMet ? 'bg-primary' : 'bg-muted-foreground/20',
          )}
        />
      ))}
    </div>
  )
}
