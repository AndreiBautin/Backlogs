import type { ItemRepository } from '@/domain/repositories/item-repository'
import { getDailyGoalBoard, type DailyGoalBoard } from '@/domain/services/daily-goals'

export interface GetDailyGoalsDeps {
  now?: () => Date
}

export type GetDailyGoalsUseCase = (deps?: GetDailyGoalsDeps) => Promise<DailyGoalBoard>

export function createGetDailyGoalsUseCase(
  repository: ItemRepository,
): GetDailyGoalsUseCase {
  return async (deps = {}) => {
    const now = deps.now ?? (() => new Date())
    const items = await repository.getAll()
    return getDailyGoalBoard(items, now())
  }
}
