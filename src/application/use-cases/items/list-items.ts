import type { Item } from '@/domain/entities/item'
import type { ItemRepository } from '@/domain/repositories/item-repository'
import { filterItems, type ItemFilters } from '@/domain/services/filter-items'
import { sortItems } from '@/domain/services/sort-items'
import type { SortKey } from '@/domain/sorting/sort-key'

export interface ListItemsOptions {
  filters?: ItemFilters
  sortKey?: SortKey
}

export type ListItemsUseCase = (options?: ListItemsOptions) => Promise<Item[]>

export function createListItemsUseCase(repository: ItemRepository): ListItemsUseCase {
  return async (options = {}) => {
    const items = await repository.getAll()
    const filtered = options.filters ? filterItems(items, options.filters) : items
    return options.sortKey ? sortItems(filtered, options.sortKey) : filtered
  }
}
