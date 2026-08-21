import { describe, expect, it, vi } from 'vitest'

import type { Item } from '@/domain/entities/item'
import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'
import { buildItem } from '@/test/builders/item-builder'

import { createSeedDemoDataUseCase } from './seed-demo-data'

const NOW = new Date('2026-08-20T12:00:00.000Z')

function demoFixture(): Item[] {
  return [buildItem({ title: 'Sample One' }), buildItem({ title: 'Sample Two' })]
}

describe('seedDemoData', () => {
  it('fills an empty backlog with the supplied dataset', async () => {
    const repository = new InMemoryItemRepository()
    const seed = createSeedDemoDataUseCase(repository, demoFixture)

    const result = await seed(NOW)

    expect(result).toEqual({ seeded: true, itemCount: 2 })
    expect(await repository.getAll()).toHaveLength(2)
  })

  /**
   * The safety property the whole demo rests on. If this ever regresses,
   * a returning visitor loses their edits and — far worse — a personal
   * build that somehow reached this code would wipe a real backlog.
   */
  it('leaves an existing backlog completely untouched', async () => {
    const existing = buildItem({ title: 'Something I actually care about' })
    const repository = new InMemoryItemRepository([existing])
    const seed = createSeedDemoDataUseCase(repository, demoFixture)

    const result = await seed(NOW)

    expect(result).toEqual({ seeded: false, itemCount: 1 })
    expect(await repository.getAll()).toEqual([existing])
  })

  it('does not even build the dataset when there is nothing to seed', async () => {
    const factory = vi.fn(demoFixture)
    const repository = new InMemoryItemRepository([buildItem()])

    await createSeedDemoDataUseCase(repository, factory)(NOW)

    expect(factory).not.toHaveBeenCalled()
  })

  it('passes the clock through so the dataset can be time-relative', async () => {
    const factory = vi.fn(demoFixture)

    await createSeedDemoDataUseCase(new InMemoryItemRepository(), factory)(NOW)

    expect(factory).toHaveBeenCalledWith(NOW)
  })

  it('is idempotent — running twice seeds once', async () => {
    const repository = new InMemoryItemRepository()
    const seed = createSeedDemoDataUseCase(repository, demoFixture)

    await seed(NOW)
    const second = await seed(NOW)

    expect(second.seeded).toBe(false)
    expect(await repository.getAll()).toHaveLength(2)
  })
})
