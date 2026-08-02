import { describe, expect, it } from 'vitest'

import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'
import { buildItem } from '@/test/builders/item-builder'

import { createDeleteItemUseCase } from './delete-item'

describe('deleteItem use-case', () => {
  it('removes the item from the repository', async () => {
    const repository = new InMemoryItemRepository()
    const item = buildItem()
    await repository.save(item)
    const deleteItem = createDeleteItemUseCase(repository)

    await deleteItem(item.id)

    await expect(repository.getAll()).resolves.toEqual([])
  })
})
