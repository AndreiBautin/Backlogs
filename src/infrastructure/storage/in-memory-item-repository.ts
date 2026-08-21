import type { Item } from '@/domain/entities/item'
import type { ItemRepository } from '@/domain/repositories/item-repository'
import type { ItemId } from '@/domain/value-objects/item-id'

/** In-process test double for ItemRepository — no I/O, used across application-layer tests. */
export class InMemoryItemRepository implements ItemRepository {
  private items: Map<ItemId, Item>

  /** Optionally pre-seeded, so a test can state its starting world in one line. */
  constructor(initial: readonly Item[] = []) {
    this.items = new Map(initial.map((item) => [item.id, item]))
  }

  getAll(): Promise<Item[]> {
    return Promise.resolve([...this.items.values()])
  }

  getById(id: ItemId): Promise<Item | null> {
    return Promise.resolve(this.items.get(id) ?? null)
  }

  save(item: Item): Promise<void> {
    this.items.set(item.id, item)
    return Promise.resolve()
  }

  delete(id: ItemId): Promise<void> {
    this.items.delete(id)
    return Promise.resolve()
  }

  replaceAll(items: readonly Item[]): Promise<void> {
    this.items = new Map(items.map((item) => [item.id, item]))
    return Promise.resolve()
  }
}
