import { describe, expect, it } from 'vitest'

import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'
import { buildItem } from '@/test/builders/item-builder'

import { createListItemsUseCase } from './list-items'

describe('listItems use-case', () => {
  it('returns every item currently in the repository', async () => {
    const repository = new InMemoryItemRepository()
    const first = buildItem({ title: 'First' })
    const second = buildItem({ title: 'Second' })
    await repository.save(first)
    await repository.save(second)
    const listItems = createListItemsUseCase(repository)

    const items = await listItems()

    expect(items).toHaveLength(2)
    expect(items.map((item) => item.title).sort()).toEqual(['First', 'Second'])
  })

  it('returns an empty array when the backlog is empty', async () => {
    const repository = new InMemoryItemRepository()
    const listItems = createListItemsUseCase(repository)

    await expect(listItems()).resolves.toEqual([])
  })
})
