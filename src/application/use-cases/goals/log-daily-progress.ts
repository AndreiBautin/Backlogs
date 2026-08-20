import {
  logDailyProgress,
  type Item,
  type ItemClock,
  type LogDailyProgressInput,
} from '@/domain/entities/item'
import type { ItemRepository } from '@/domain/repositories/item-repository'
import type { ItemId } from '@/domain/value-objects/item-id'

import { ItemNotFoundError } from '../../errors/item-not-found-error'

export type LogDailyProgressUseCase = (
  id: ItemId,
  input?: LogDailyProgressInput,
  deps?: ItemClock,
) => Promise<Item>

/**
 * Records a day's progress toward an item's daily goal. Separate from
 * `updateItem` because the domain treats logging as appending to a log, not
 * editing a field — including refusing to log against a goal-less item.
 */
export function createLogDailyProgressUseCase(
  repository: ItemRepository,
): LogDailyProgressUseCase {
  return async (id, input = {}, deps = {}) => {
    const existing = await repository.getById(id)
    if (!existing) {
      throw new ItemNotFoundError(id)
    }

    const updated = logDailyProgress(existing, input, deps)
    await repository.save(updated)
    return updated
  }
}
