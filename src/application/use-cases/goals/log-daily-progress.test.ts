import { describe, expect, it } from 'vitest'

import { DomainValidationError } from '@/domain/errors/domain-validation-error'
import { createItemId } from '@/domain/value-objects/item-id'
import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'
import { buildItem } from '@/test/builders/item-builder'

import { ItemNotFoundError } from '../../errors/item-not-found-error'
import { createLogDailyProgressUseCase } from './log-daily-progress'

const NOW = new Date(2026, 7, 19, 8, 0)

function buildTracked() {
  return buildItem({
    status: 'currently-using',
    dailyGoal: { amount: 2, unit: 'episode' },
  })
}

describe('logDailyProgress use-case', () => {
  it('records a unit of progress and persists it', async () => {
    const repository = new InMemoryItemRepository()
    const item = buildTracked()
    await repository.save(item)
    const logDailyProgress = createLogDailyProgressUseCase(repository)

    const updated = await logDailyProgress(item.id, {}, { now: () => NOW })

    expect(updated.dailyProgress).toEqual([{ date: '2026-08-19', amount: 1 }])
    await expect(repository.getById(item.id)).resolves.toEqual(updated)
  })

  it('undoes progress with a negative delta', async () => {
    const repository = new InMemoryItemRepository()
    const item = buildTracked()
    await repository.save(item)
    const logDailyProgress = createLogDailyProgressUseCase(repository)
    await logDailyProgress(item.id, {}, { now: () => NOW })

    const undone = await logDailyProgress(item.id, { delta: -1 }, { now: () => NOW })

    expect(undone.dailyProgress).toEqual([])
  })

  it('throws ItemNotFoundError for an unknown id', async () => {
    const logDailyProgress = createLogDailyProgressUseCase(new InMemoryItemRepository())

    await expect(logDailyProgress(createItemId())).rejects.toThrow(ItemNotFoundError)
  })

  it('refuses to log against an item with no daily goal', async () => {
    const repository = new InMemoryItemRepository()
    const item = buildItem({ status: 'currently-using' })
    await repository.save(item)
    const logDailyProgress = createLogDailyProgressUseCase(repository)

    await expect(logDailyProgress(item.id)).rejects.toThrow(DomainValidationError)
  })
})
