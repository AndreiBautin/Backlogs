import { describe, expect, it } from 'vitest'

import type { Item } from '@/domain/entities/item'
import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'
import { buildItem } from '@/test/builders/item-builder'

import { createResetDemoDataUseCase } from './reset-demo-data'

const NOW = new Date('2026-08-20T12:00:00.000Z')

function demoFixture(): Item[] {
  return [buildItem({ title: 'Sample One' }), buildItem({ title: 'Sample Two' })]
}

describe('resetDemoData', () => {
  it('replaces whatever is stored with a fresh dataset', async () => {
    const repository = new InMemoryItemRepository([
      buildItem({ title: 'Something a visitor typed' }),
    ])
    const reset = createResetDemoDataUseCase(repository, demoFixture)

    const result = await reset(NOW)

    expect(result).toEqual({ itemCount: 2 })
    const stored = await repository.getAll()
    expect(stored.map((item) => item.title)).toEqual(['Sample One', 'Sample Two'])
  })

  it('works against an empty backlog too', async () => {
    const repository = new InMemoryItemRepository()

    await createResetDemoDataUseCase(repository, demoFixture)(NOW)

    expect(await repository.getAll()).toHaveLength(2)
  })

  /**
   * Reset and seed are kept as separate use-cases precisely so that this
   * difference is visible in the type system rather than in a flag: only
   * one of them is allowed to destroy data.
   */
  it('is destructive, unlike seeding', async () => {
    const kept = buildItem({ title: 'Kept by seed, discarded by reset' })
    const repository = new InMemoryItemRepository([kept])

    await createResetDemoDataUseCase(repository, demoFixture)(NOW)

    const stored = await repository.getAll()
    expect(stored.some((item) => item.id === kept.id)).toBe(false)
  })
})
