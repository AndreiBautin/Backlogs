import { beforeEach, describe, expect, it } from 'vitest'

import type { ItemRepository } from '@/domain/repositories/item-repository'
import { createItemId } from '@/domain/value-objects/item-id'
import { buildItem } from '@/test/builders/item-builder'

/**
 * A shared behavioral contract every ItemRepository implementation must
 * satisfy, so the in-memory test double and the LocalStorage adapter stay
 * interchangeable in practice, not just in their type signatures. Clears
 * window.localStorage between tests — a no-op for implementations that
 * don't use it, essential isolation for the ones that do.
 */
export function itBehavesLikeAnItemRepository(
  createRepository: () => ItemRepository,
): void {
  describe('ItemRepository contract', () => {
    beforeEach(() => {
      window.localStorage.clear()
    })

    it('starts empty', async () => {
      const repository = createRepository()

      await expect(repository.getAll()).resolves.toEqual([])
    })

    it('saves and retrieves an item', async () => {
      const repository = createRepository()
      const item = buildItem()

      await repository.save(item)

      await expect(repository.getAll()).resolves.toEqual([item])
      await expect(repository.getById(item.id)).resolves.toEqual(item)
    })

    it('returns null for an unknown id', async () => {
      const repository = createRepository()

      await expect(repository.getById(createItemId())).resolves.toBeNull()
    })

    it('upserts on save when the id already exists', async () => {
      const repository = createRepository()
      const item = buildItem()
      await repository.save(item)

      const updated = { ...item, title: 'Updated title' }
      await repository.save(updated)

      const all = await repository.getAll()
      expect(all).toHaveLength(1)
      expect(all[0]?.title).toBe('Updated title')
    })

    it('deletes an item by id', async () => {
      const repository = createRepository()
      const item = buildItem()
      await repository.save(item)

      await repository.delete(item.id)

      await expect(repository.getAll()).resolves.toEqual([])
    })

    it('deleting an unknown id is a no-op', async () => {
      const repository = createRepository()
      const item = buildItem()
      await repository.save(item)

      await repository.delete(createItemId())

      await expect(repository.getAll()).resolves.toEqual([item])
    })

    it('replaceAll overwrites the entire collection', async () => {
      const repository = createRepository()
      await repository.save(buildItem())

      const replacement = [buildItem(), buildItem()]
      await repository.replaceAll(replacement)

      const all = await repository.getAll()
      expect(all).toHaveLength(2)
      expect(all.map((item) => item.id).sort()).toEqual(
        replacement.map((item) => item.id).sort(),
      )
    })
  })
}
