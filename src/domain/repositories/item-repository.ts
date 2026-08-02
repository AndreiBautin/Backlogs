import type { Item } from '../entities/item'
import type { ItemId } from '../value-objects/item-id'

/**
 * Persistence port for items. `Promise`-returning even for a synchronous
 * LocalStorage adapter, so swapping in a real network/SQLite backend later
 * changes only the infrastructure implementation, never call sites.
 */
export interface ItemRepository {
  getAll(): Promise<Item[]>
  getById(id: ItemId): Promise<Item | null>
  save(item: Item): Promise<void>
  delete(id: ItemId): Promise<void>
  replaceAll(items: readonly Item[]): Promise<void>
}
