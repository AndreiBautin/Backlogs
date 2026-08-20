import { Check, Flame, Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatDailyGoal } from '@/domain/entities/daily-goal'
import type { DailyGoalStatus } from '@/domain/services/daily-goals'
import { CATEGORY_ICONS } from '@/features/items/category-icons'
import { cn } from '@/lib/utils'

import { DailyGoalHistory } from './DailyGoalHistory'

interface DailyGoalRowProps {
  status: DailyGoalStatus
  showHistory?: boolean
  onSelectItem: () => void
  onLogProgress: (delta: number) => void
  isLogging: boolean
}

export function DailyGoalRow({
  status,
  showHistory = false,
  onSelectItem,
  onLogProgress,
  isLogging,
}: DailyGoalRowProps) {
  const { item, goal, loggedToday, target, isMet, currentStreak, longestStreak } = status
  const Icon = CATEGORY_ICONS[item.category]

  return (
    <li
      className={cn(
        'border-border flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
        isMet ? 'border-primary/40 bg-primary/5' : 'bg-card',
      )}
    >
      {isMet ? (
        <Check className="text-primary size-4 shrink-0" aria-hidden="true" />
      ) : (
        <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
      )}

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onSelectItem}
          className="text-foreground hover:text-primary max-w-full truncate text-sm font-medium transition-colors"
        >
          {item.title}
        </button>
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span>{formatDailyGoal(goal)}</span>
          {currentStreak > 0 && (
            <span className="text-foreground/70 inline-flex items-center gap-0.5">
              <Flame className="size-3" aria-hidden="true" />
              {currentStreak} day{currentStreak === 1 ? '' : 's'}
            </span>
          )}
        </p>
      </div>

      {showHistory && <DailyGoalHistory days={status.recentDays} label={item.title} />}

      <span
        className="text-foreground shrink-0 text-sm font-medium tabular-nums"
        aria-label={`${loggedToday.toString()} of ${target.toString()} logged today for ${item.title}`}
      >
        {loggedToday} / {target}
      </span>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Undo progress for ${item.title}`}
          disabled={loggedToday === 0 || isLogging}
          onClick={() => {
            onLogProgress(-1)
          }}
        >
          <Minus aria-hidden="true" />
        </Button>
        <Button
          variant={isMet ? 'outline' : 'default'}
          size="icon-sm"
          aria-label={`Log progress for ${item.title}`}
          disabled={isLogging}
          onClick={() => {
            onLogProgress(1)
          }}
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>

      {showHistory && longestStreak > currentStreak && (
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          best {longestStreak}
        </span>
      )}
    </li>
  )
}
