import { describe, expect, it } from 'vitest'

import { DomainValidationError } from '@/domain/errors/domain-validation-error'
import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'

import { createCreateItemUseCase } from './create-item'

describe('createItem use-case', () => {
  it('creates and persists an item', async () => {
    const repository = new InMemoryItemRepository()
    const createItem = createCreateItemUseCase(repository)

    const item = await createItem({ title: 'Elden Ring', category: 'games' })

    expect(item.title).toBe('Elden Ring')
    await expect(repository.getAll()).resolves.toEqual([item])
  })

  it('propagates domain validation errors without persisting', async () => {
    const repository = new InMemoryItemRepository()
    const createItem = createCreateItemUseCase(repository)

    await expect(createItem({ title: '', category: 'games' })).rejects.toThrow(
      DomainValidationError,
    )
    await expect(repository.getAll()).resolves.toEqual([])
  })
})
