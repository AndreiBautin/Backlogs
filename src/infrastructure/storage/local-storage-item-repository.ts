import type { Item } from '@/domain/entities/item'
import type { ItemRepository } from '@/domain/repositories/item-repository'
import type { ItemId } from '@/domain/value-objects/item-id'

import { deserializeItems, serializeItems } from './serialization'

export const ITEM_STORAGE_KEY = 'backlogs:items:v1'

/** The only place in the app that touches window.localStorage for items. */
export class LocalStorageItemRepository implements ItemRepository {
  private readonly storage: Storage

  constructor(storage: Storage) {
    this.storage = storage
  }

  getAll(): Promise<Item[]> {
    return Promise.resolve(deserializeItems(this.storage.getItem(ITEM_STORAGE_KEY)))
  }

  async getById(id: ItemId): Promise<Item | null> {
    const items = await this.getAll()
    return items.find((item) => item.id === id) ?? null
  }

  async save(item: Item): Promise<void> {
    const items = await this.getAll()
    const index = items.findIndex((existing) => existing.id === item.id)
    const next = index === -1 ? [...items, item] : items.with(index, item)
    this.storage.setItem(ITEM_STORAGE_KEY, serializeItems(next))
  }

  async delete(id: ItemId): Promise<void> {
    const items = await this.getAll()
    this.storage.setItem(
      ITEM_STORAGE_KEY,
      serializeItems(items.filter((item) => item.id !== id)),
    )
  }

  replaceAll(items: readonly Item[]): Promise<void> {
    this.storage.setItem(ITEM_STORAGE_KEY, serializeItems(items))
    return Promise.resolve()
  }
}
