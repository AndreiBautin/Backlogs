import type { ItemRepository } from '@/domain/repositories/item-repository'

import type { DemoItemFactory } from './seed-demo-data'

export interface ResetDemoDataResult {
  readonly itemCount: number
}

export type ResetDemoDataUseCase = (now?: Date) => Promise<ResetDemoDataResult>

/**
 * Replaces whatever is in the backlog with a freshly generated demo set.
 *
 * Unlike seeding, this is unconditionally destructive — which is exactly
 * why it exists as a separate use-case with a separate name, reachable
 * only from a confirmed button in demo mode. Nothing should be able to
 * call "seed" and get "wipe".
 */
export function createResetDemoDataUseCase(
  repository: ItemRepository,
  createDemoItems: DemoItemFactory,
): ResetDemoDataUseCase {
  return async (now = new Date()) => {
    const items = createDemoItems(now)
    await repository.replaceAll(items)
    return { itemCount: items.length }
  }
}
