import { describe, expect, it } from 'vitest'

import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'
import { buildItem } from '@/test/builders/item-builder'

import { createGetDailyGoalsUseCase } from './get-daily-goals'

const NOW = new Date(2026, 7, 19, 8, 0)

describe('getDailyGoals use-case', () => {
  it('builds today’s board from the repository', async () => {
    const repository = new InMemoryItemRepository()
    await repository.save(
      buildItem({
        title: 'The Way of Kings',
        status: 'currently-using',
        dailyGoal: { amount: 1, unit: 'chapter' },
        dailyProgress: [{ date: '2026-08-18', amount: 1 }],
      }),
    )
    await repository.save(buildItem({ title: 'Untracked', status: 'backlog' }))
    const getDailyGoals = createGetDailyGoalsUseCase(repository)

    const board = await getDailyGoals({ now: () => NOW })

    expect(board.totalCount).toBe(1)
    expect(board.statuses[0]).toMatchObject({
      loggedToday: 0,
      isMet: false,
      currentStreak: 1,
    })
  })

  it('returns an empty board when nothing is tracked', async () => {
    const getDailyGoals = createGetDailyGoalsUseCase(new InMemoryItemRepository())

    const board = await getDailyGoals({ now: () => NOW })

    expect(board).toMatchObject({
      statuses: [],
      metCount: 0,
      totalCount: 0,
      allMet: false,
    })
  })
})
