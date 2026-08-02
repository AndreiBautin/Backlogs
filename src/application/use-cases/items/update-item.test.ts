import { describe, expect, it } from 'vitest'

import { createItemId } from '@/domain/value-objects/item-id'
import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'
import { buildItem } from '@/test/builders/item-builder'

import { ItemNotFoundError } from '../../errors/item-not-found-error'
import { createUpdateItemUseCase } from './update-item'

describe('updateItem use-case', () => {
  it('applies changes and persists the updated item', async () => {
    const repository = new InMemoryItemRepository()
    const existing = buildItem({ priority: 'low' })
    await repository.save(existing)
    const updateItem = createUpdateItemUseCase(repository)

    const updated = await updateItem(existing.id, { priority: 'high' })

    expect(updated.priority).toBe('high')
    await expect(repository.getById(existing.id)).resolves.toEqual(updated)
  })

  it('throws ItemNotFoundError for an unknown id', async () => {
    const repository = new InMemoryItemRepository()
    const updateItem = createUpdateItemUseCase(repository)

    await expect(updateItem(createItemId(), { priority: 'high' })).rejects.toThrow(
      ItemNotFoundError,
    )
  })
})
