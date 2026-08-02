import { describe, expect, it } from 'vitest'

import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'
import { buildItem } from '@/test/builders/item-builder'

import { createGetGoalsDataUseCase } from './get-goals-data'

const NOW = new Date('2026-03-15T00:00:00.000Z')

describe('getGoalsData use-case', () => {
  it('computes goals stats from the repository', async () => {
    const repository = new InMemoryItemRepository()
    await repository.save(
      buildItem({ status: 'completed', dateCompleted: '2026-03-10T00:00:00.000Z' }),
    )
    await repository.save(
      buildItem({ status: 'backlog', dateAdded: '2026-03-05T00:00:00.000Z' }),
    )
    const getGoalsData = createGetGoalsDataUseCase(repository)

    const stats = await getGoalsData({ now: () => NOW })

    expect(stats.currentStreak).toBe(1)
    expect(stats.completedThisMonth).toBe(1)
    expect(stats.oldestUnfinishedItem?.status).toBe('backlog')
  })

  it('returns zeroed stats for an empty backlog', async () => {
    const repository = new InMemoryItemRepository()
    const getGoalsData = createGetGoalsDataUseCase(repository)

    const stats = await getGoalsData({ now: () => NOW })

    expect(stats.currentStreak).toBe(0)
    expect(stats.averageCompletionsPerMonth).toBe(0)
    expect(stats.oldestUnfinishedItem).toBeNull()
  })
})
