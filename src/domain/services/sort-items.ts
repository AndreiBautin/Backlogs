import type { Item } from '../entities/item'
import { PRIORITY_RANK } from '../priority/priority'
import type { SortKey } from '../sorting/sort-key'

function byDateDesc(getDate: (item: Item) => string) {
  return (a: Item, b: Item) => getDate(b).localeCompare(getDate(a))
}

export function sortItems(items: readonly Item[], sortKey: SortKey): Item[] {
  const sorted = [...items]

  switch (sortKey) {
    case 'recently-added':
      return sorted.sort(byDateDesc((item) => item.dateAdded))
    case 'alphabetical':
      return sorted.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
      )
    case 'priority':
      return sorted.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
    case 'recently-completed':
      return sorted.sort(byDateDesc((item) => item.dateCompleted ?? ''))
    case 'recently-updated':
      return sorted.sort(byDateDesc((item) => item.lastUpdated))
  }
}
