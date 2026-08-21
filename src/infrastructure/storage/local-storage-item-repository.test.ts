import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildItem } from '@/test/builders/item-builder'
import { createTestLogger } from '@/test/test-logger'

import {
  ITEM_STORAGE_KEY,
  LocalStorageItemRepository,
} from './local-storage-item-repository'
import { itBehavesLikeAnItemRepository } from './item-repository.contract'

itBehavesLikeAnItemRepository(() => new LocalStorageItemRepository(window.localStorage))

describe('LocalStorageItemRepository', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('persists items under a dedicated, versioned storage key', async () => {
    const repository = new LocalStorageItemRepository(window.localStorage)
    const item = buildItem()

    await repository.save(item)

    const raw = window.localStorage.getItem(ITEM_STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw ?? '{}')).toMatchObject({ version: 1 })
  })

  it('recovers to an empty list when the stored value is corrupted', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    window.localStorage.setItem(ITEM_STORAGE_KEY, 'not json at all')

    const repository = new LocalStorageItemRepository(window.localStorage)

    await expect(repository.getAll()).resolves.toEqual([])
    expect(warn).toHaveBeenCalled()

    warn.mockRestore()
  })

  it('survives being reconstructed, reading back what a prior instance wrote', async () => {
    const item = buildItem()
    await new LocalStorageItemRepository(window.localStorage).save(item)

    const secondInstance = new LocalStorageItemRepository(window.localStorage)

    await expect(secondInstance.getAll()).resolves.toEqual([item])
  })
})

describe('LocalStorageItemRepository configuration and failure handling', () => {
  it('reads and writes the key it was given, not a hardcoded one', async () => {
    window.localStorage.clear()
    const repository = new LocalStorageItemRepository(window.localStorage, {
      storageKey: 'backlogs:demo:items:v1',
    })

    await repository.save(buildItem({ title: 'Demo item' }))

    expect(window.localStorage.getItem('backlogs:demo:items:v1')).toContain('Demo item')
    expect(window.localStorage.getItem(ITEM_STORAGE_KEY)).toBeNull()
  })

  /** An empty Storage whose every write fails, the way a full quota does. */
  function unwritableStorage(failure: Error): Storage {
    return {
      length: 0,
      clear: () => undefined,
      getItem: () => null,
      key: () => null,
      removeItem: () => undefined,
      setItem: () => {
        throw failure
      },
    }
  }

  /**
   * LocalStorage throws when full, and in Safari's private mode it can
   * throw on every write. Letting that escape surfaces as an unhandled
   * rejection inside a mutation; a plain message gives the UI something
   * it can show.
   */
  it('turns a storage failure into an error the UI can present', async () => {
    const { logger, events } = createTestLogger()
    const storage = unwritableStorage(new DOMException('quota', 'QuotaExceededError'))
    const repository = new LocalStorageItemRepository(storage, { logger })

    await expect(repository.save(buildItem())).rejects.toThrow(/storage is full/i)
    expect(events()).toContain('storage.items.write-failed')
  })

  it('keeps the underlying failure attached as the cause', async () => {
    const { logger } = createTestLogger()
    const cause = new DOMException('quota', 'QuotaExceededError')
    const repository = new LocalStorageItemRepository(unwritableStorage(cause), {
      logger,
    })

    await expect(repository.save(buildItem())).rejects.toMatchObject({ cause })
  })

  it('does not leak the stored content into the failure log', async () => {
    const { logger, records } = createTestLogger()
    const storage = unwritableStorage(new DOMException('quota', 'QuotaExceededError'))
    const repository = new LocalStorageItemRepository(storage, { logger })

    await expect(
      repository.save(buildItem({ title: 'A private reading habit' })),
    ).rejects.toThrow()

    expect(JSON.stringify(records)).not.toContain('A private reading habit')
  })
})
