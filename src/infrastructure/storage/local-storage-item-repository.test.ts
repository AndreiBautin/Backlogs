import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildItem } from '@/test/builders/item-builder'

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
