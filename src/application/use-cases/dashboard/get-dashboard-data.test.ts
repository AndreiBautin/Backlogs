import { describe, expect, it } from 'vitest'

import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'
import { buildItem } from '@/test/builders/item-builder'

import { createGetDashboardDataUseCase } from './get-dashboard-data'

const NOW = new Date('2026-03-15T00:00:00.000Z')

describe('getDashboardData use-case', () => {
  it('combines dashboard sections and completion stats from the repository', async () => {
    const repository = new InMemoryItemRepository()
    await repository.save(buildItem({ status: 'currently-using' }))
    await repository.save(buildItem({ status: 'backlog', priority: 'high' }))
    await repository.save(
      buildItem({ status: 'completed', dateCompleted: '2026-03-10T00:00:00.000Z' }),
    )
    const getDashboardData = createGetDashboardDataUseCase(repository)

    const data = await getDashboardData({ now: () => NOW })

    expect(data.sections.continue).toHaveLength(1)
    expect(data.sections.startNext).toHaveLength(1)
    expect(data.sections.recentlyFinished).toHaveLength(1)
    expect(data.stats.totalBacklog).toBe(1)
    expect(data.stats.completedThisMonth).toBe(1)
  })

  it('returns empty sections and zeroed stats for an empty backlog', async () => {
    const repository = new InMemoryItemRepository()
    const getDashboardData = createGetDashboardDataUseCase(repository)

    const data = await getDashboardData({ now: () => NOW })

    expect(data.sections.recentlyAdded).toEqual([])
    expect(data.stats.completionPercentage).toBe(0)
  })
})
