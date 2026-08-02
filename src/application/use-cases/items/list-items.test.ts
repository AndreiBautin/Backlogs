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

  it('applies filters when given', async () => {
    const repository = new InMemoryItemRepository()
    const game = buildItem({ title: 'Game', category: 'games' })
    const book = buildItem({ title: 'Book', category: 'books' })
    await repository.save(game)
    await repository.save(book)
    const listItems = createListItemsUseCase(repository)

    const items = await listItems({ filters: { category: 'games' } })

    expect(items).toEqual([game])
  })

  it('applies a sort key when given', async () => {
    const repository = new InMemoryItemRepository()
    const banana = buildItem({ title: 'Banana' })
    const apple = buildItem({ title: 'Apple' })
    await repository.save(banana)
    await repository.save(apple)
    const listItems = createListItemsUseCase(repository)

    const items = await listItems({ sortKey: 'alphabetical' })

    expect(items.map((item) => item.title)).toEqual(['Apple', 'Banana'])
  })

  it('applies filters and sort together', async () => {
    const repository = new InMemoryItemRepository()
    const zGame = buildItem({ title: 'Zelda', category: 'games' })
    const aGame = buildItem({ title: 'Adventure', category: 'games' })
    const book = buildItem({ title: 'Book', category: 'books' })
    await repository.save(zGame)
    await repository.save(aGame)
    await repository.save(book)
    const listItems = createListItemsUseCase(repository)

    const items = await listItems({
      filters: { category: 'games' },
      sortKey: 'alphabetical',
    })

    expect(items.map((item) => item.title)).toEqual(['Adventure', 'Zelda'])
  })
})
