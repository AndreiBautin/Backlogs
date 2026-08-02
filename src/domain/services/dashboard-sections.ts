import type { Item } from '../entities/item'
import { PRIORITY_RANK } from '../priority/priority'

export interface DashboardSections {
  readonly continue: readonly Item[]
  readonly startNext: readonly Item[]
  readonly recentlyFinished: readonly Item[]
  readonly recentlyAdded: readonly Item[]
}

const DEFAULT_LIMIT = 5

function byDateDesc(getDate: (item: Item) => string) {
  return (a: Item, b: Item) => getDate(b).localeCompare(getDate(a))
}

/** Answers "what should I consume next?" from a snapshot of items. */
export function getDashboardSections(
  items: readonly Item[],
  limit = DEFAULT_LIMIT,
): DashboardSections {
  const inProgress = items
    .filter((item) => item.status === 'currently-using')
    .sort(byDateDesc((item) => item.lastUpdated))
    .slice(0, limit)

  const startNext = items
    .filter((item) => item.status === 'backlog')
    .sort((a, b) => {
      const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
      return rankDiff !== 0 ? rankDiff : a.dateAdded.localeCompare(b.dateAdded)
    })
    .slice(0, limit)

  const recentlyFinished = items
    .filter((item) => item.status === 'completed')
    .sort(byDateDesc((item) => item.dateCompleted ?? item.lastUpdated))
    .slice(0, limit)

  const recentlyAdded = [...items]
    .sort(byDateDesc((item) => item.dateAdded))
    .slice(0, limit)

  return {
    continue: inProgress,
    startNext,
    recentlyFinished,
    recentlyAdded,
  }
}
