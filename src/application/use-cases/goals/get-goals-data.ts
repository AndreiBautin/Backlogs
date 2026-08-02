import type { ItemRepository } from '@/domain/repositories/item-repository'
import { getGoalsStats, type GoalsStats } from '@/domain/services/goals-stats'

export interface GetGoalsDataDeps {
  now?: () => Date
}

export type GetGoalsDataUseCase = (deps?: GetGoalsDataDeps) => Promise<GoalsStats>

export function createGetGoalsDataUseCase(
  repository: ItemRepository,
): GetGoalsDataUseCase {
  return async (deps = {}) => {
    const now = deps.now ?? (() => new Date())
    const items = await repository.getAll()
    return getGoalsStats(items, now())
  }
}
