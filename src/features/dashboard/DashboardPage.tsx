import { EmptyState } from '@/components/shared/EmptyState'
import type { Item } from '@/domain/entities/item'
import { ItemCard } from '@/features/items/components/ItemCard'
import { useItemUiStore } from '@/features/items/store/use-item-ui-store'

import { QuickStats } from './components/QuickStats'
import { useDashboardDataQuery } from './hooks/use-dashboard-data'

interface DashboardSectionProps {
  title: string
  description?: string
  items: readonly Item[]
  emptyMessage: string
  onSelectItem: (id: Item['id']) => void
}

function DashboardSection({
  title,
  description,
  items,
  emptyMessage,
  onSelectItem,
}: DashboardSectionProps) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-foreground text-sm font-semibold">{title}</h2>
        {description ? (
          <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        ) : null}
      </div>
      {items.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => {
                onSelectItem(item.id)
              }}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export function DashboardPage() {
  const { data, isLoading } = useDashboardDataQuery()
  const selectItem = useItemUiStore((state) => state.selectItem)

  if (isLoading || !data) {
    return <div className="text-muted-foreground p-8 text-sm">Loading…</div>
  }

  const { sections, stats } = data

  return (
    <div className="flex flex-col gap-8 p-8">
      <QuickStats stats={stats} />

      <DashboardSection
        title="Continue"
        items={sections.continue}
        emptyMessage="Nothing in progress right now."
        onSelectItem={selectItem}
      />
      <DashboardSection
        title="Start Next"
        description="The top backlog pick in each category."
        items={sections.startNext}
        emptyMessage="Your backlog is empty — press N to add something."
        onSelectItem={selectItem}
      />
      <DashboardSection
        title="Recently Finished"
        items={sections.recentlyFinished}
        emptyMessage="Nothing finished yet."
        onSelectItem={selectItem}
      />
      <DashboardSection
        title="Recently Added"
        items={sections.recentlyAdded}
        emptyMessage="Nothing added yet."
        onSelectItem={selectItem}
      />
    </div>
  )
}
