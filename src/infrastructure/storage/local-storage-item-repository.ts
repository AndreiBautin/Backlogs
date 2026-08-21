import { getStorageKeys } from '@/config/storage-keys'
import type { Item } from '@/domain/entities/item'
import type { ItemRepository } from '@/domain/repositories/item-repository'
import type { ItemId } from '@/domain/value-objects/item-id'
import { createLogger, type Logger } from '@/shared/logging/logger'

import { deserializeItems, serializeItems } from './serialization'

/** The personal-mode key. Kept as a named export because existing backlogs live under it. */
export const ITEM_STORAGE_KEY = getStorageKeys('personal').items

export interface LocalStorageItemRepositoryOptions {
  /** Which LocalStorage key to read and write. Defaults to personal mode's. */
  storageKey?: string
  logger?: Logger
}

/** The only place in the app that touches window.localStorage for items. */
export class LocalStorageItemRepository implements ItemRepository {
  private readonly storage: Storage
  private readonly storageKey: string
  private readonly logger: Logger

  constructor(storage: Storage, options: LocalStorageItemRepositoryOptions = {}) {
    this.storage = storage
    this.storageKey = options.storageKey ?? ITEM_STORAGE_KEY
    this.logger = options.logger ?? createLogger({ threshold: 'warn' })
  }

  getAll(): Promise<Item[]> {
    return Promise.resolve(
      deserializeItems(this.storage.getItem(this.storageKey), this.logger),
    )
  }

  async getById(id: ItemId): Promise<Item | null> {
    const items = await this.getAll()
    return items.find((item) => item.id === id) ?? null
  }

  async save(item: Item): Promise<void> {
    const items = await this.getAll()
    const index = items.findIndex((existing) => existing.id === item.id)
    const next = index === -1 ? [...items, item] : items.with(index, item)
    this.write(next)
  }

  async delete(id: ItemId): Promise<void> {
    const items = await this.getAll()
    this.write(items.filter((item) => item.id !== id))
  }

  replaceAll(items: readonly Item[]): Promise<void> {
    this.write(items)
    return Promise.resolve()
  }

  /**
   * LocalStorage throws `QuotaExceededError` when full, and in Safari's
   * private mode it can throw on *every* write. Letting that propagate
   * would surface as an unhandled rejection inside a mutation; catching
   * and re-throwing a plain message gives the UI something to show.
   */
  private write(items: readonly Item[]): void {
    try {
      this.storage.setItem(this.storageKey, serializeItems(items))
    } catch (error) {
      this.logger.error('storage.items.write-failed', {
        reason: error instanceof Error ? error.name : 'unknown',
        itemCount: items.length,
      })
      throw new Error('Could not save — browser storage is full or unavailable.', {
        cause: error,
      })
    }
  }
}
