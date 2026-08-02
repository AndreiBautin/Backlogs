import { getCategoryDefinition } from '@/domain/categories/category-registry'
import type { Item } from '@/domain/entities/item'

import { CATEGORY_ICONS } from '../category-icons'
import { PriorityBadge } from './PriorityBadge'
import { StatusBadge } from './StatusBadge'

interface ItemCardProps {
  item: Item
  onClick?: () => void
}

export function ItemCard({ item, onClick }: ItemCardProps) {
  const category = getCategoryDefinition(item.category)
  const Icon = CATEGORY_ICONS[item.category]

  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border bg-card hover:border-primary/40 flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors"
    >
      <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-medium">{item.title}</p>
        <p className="text-muted-foreground truncate text-xs">
          {category.label}
          {item.platform ? ` · ${item.platform}` : ''}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <PriorityBadge priority={item.priority} />
        <StatusBadge status={item.status} />
      </div>
    </button>
  )
}
