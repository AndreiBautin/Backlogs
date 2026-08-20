import { EmptyState } from '@/components/shared/EmptyState'
import { StatTile } from '@/components/shared/StatTile'
import { ItemCard } from '@/features/items/components/ItemCard'
import { useItemUiStore } from '@/features/items/store/use-item-ui-store'

import { DailyGoalsPanel } from './components/DailyGoalsPanel'
import { useGoalsDataQuery } from './hooks/use-goals-data'

export function GoalsPage() {
  const { data, isLoading } = useGoalsDataQuery()
  const selectItem = useItemUiStore((state) => state.selectItem)

  if (isLoading || !data) {
    return <div className="text-muted-foreground p-8 text-sm">Loading…</div>
  }

  const hasAnySignal =
    data.currentStreak > 0 ||
    data.completedThisMonth > 0 ||
    data.completedThisYear > 0 ||
    data.oldestUnfinishedItem !== null

  return (
    <div className="flex flex-col gap-8 p-8">
      <DailyGoalsPanel
        title="Today’s goals"
        showHistory
        emptyMessage="No daily goals yet — open an item you’re working through and give it a per-day target."
      />

      {hasAnySignal ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile
              label="Current streak"
              value={`${data.currentStreak.toString()} mo`}
            />
            <StatTile label="Completed this month" value={data.completedThisMonth} />
            <StatTile label="Completed this year" value={data.completedThisYear} />
            <StatTile
              label="Avg completions / month"
              value={data.averageCompletionsPerMonth}
            />
            <StatTile
              label="Average backlog age"
              value={`${data.averageBacklogAgeDays.toString()} d`}
            />
          </div>

          <section>
            <h2 className="text-foreground mb-3 text-sm font-semibold">
              Oldest unfinished item
            </h2>
            {data.oldestUnfinishedItem ? (
              <ItemCard
                item={data.oldestUnfinishedItem}
                onClick={() => {
                  if (data.oldestUnfinishedItem) {
                    selectItem(data.oldestUnfinishedItem.id)
                  }
                }}
              />
            ) : (
              <EmptyState message="Nothing unfinished — the backlog is fully caught up." />
            )}
          </section>
        </>
      ) : (
        <EmptyState message="Nothing to show yet — add and finish a few items to start building goals." />
      )}
    </div>
  )
}
