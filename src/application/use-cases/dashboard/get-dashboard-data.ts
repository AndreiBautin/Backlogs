import type { ItemRepository } from '@/domain/repositories/item-repository'
import {
  getCompletionStats,
  type CompletionStats,
} from '@/domain/services/completion-stats'
import {
  getDashboardSections,
  type DashboardSections,
} from '@/domain/services/dashboard-sections'

export interface DashboardData {
  readonly sections: DashboardSections
  readonly stats: CompletionStats
}

export interface GetDashboardDataDeps {
  now?: () => Date
}

export type GetDashboardDataUseCase = (
  deps?: GetDashboardDataDeps,
) => Promise<DashboardData>

export function createGetDashboardDataUseCase(
  repository: ItemRepository,
): GetDashboardDataUseCase {
  return async (deps = {}) => {
    const now = deps.now ?? (() => new Date())
    const items = await repository.getAll()

    return {
      sections: getDashboardSections(items),
      stats: getCompletionStats(items, now()),
    }
  }
}
