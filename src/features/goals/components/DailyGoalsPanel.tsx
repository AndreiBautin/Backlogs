import { EmptyState } from '@/components/shared/EmptyState'
import { useItemUiStore } from '@/features/items/store/use-item-ui-store'

import { useDailyGoalsQuery, useLogDailyProgressMutation } from '../hooks/use-daily-goals'
import { DailyGoalRow } from './DailyGoalRow'

interface DailyGoalsPanelProps {
  title: string
  emptyMessage: string
  /** Shows the 14-day strip and best-streak column — the Goals page's fuller view. */
  showHistory?: boolean
  /** Renders nothing at all when no goals are set, instead of an empty state. */
  hideWhenEmpty?: boolean
}

/**
 * The daily check-in, shared by the Dashboard (compact) and Goals (with
 * history). Owns its own query and mutation so both callers stay thin.
 */
export function DailyGoalsPanel({
  title,
  emptyMessage,
  showHistory = false,
  hideWhenEmpty = false,
}: DailyGoalsPanelProps) {
  const { data, isLoading } = useDailyGoalsQuery()
  const logProgress = useLogDailyProgressMutation()
  const selectItem = useItemUiStore((state) => state.selectItem)

  if (isLoading || !data) {
    return null
  }

  if (data.totalCount === 0 && hideWhenEmpty) {
    return null
  }

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-foreground text-sm font-semibold">{title}</h2>
        {data.totalCount > 0 && (
          <p className="text-muted-foreground text-xs tabular-nums">
            {data.allMet
              ? 'All done for today'
              : `${data.metCount.toString()} of ${data.totalCount.toString()} done`}
          </p>
        )}
      </div>

      {data.totalCount === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.statuses.map((status) => (
            <DailyGoalRow
              key={status.item.id}
              status={status}
              showHistory={showHistory}
              isLogging={logProgress.isPending}
              onSelectItem={() => {
                selectItem(status.item.id)
              }}
              onLogProgress={(delta) => {
                logProgress.mutate({ id: status.item.id, delta })
              }}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
