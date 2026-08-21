import type { Item } from '@/domain/entities/item'
import type { ItemRepository } from '@/domain/repositories/item-repository'

/**
 * Supplies the dataset to seed. Injected rather than imported so this
 * use-case keeps pointing only at `domain/` — the concrete fixture lives
 * in `infrastructure/seed/` and is wired in at the composition root, the
 * same way a repository is.
 */
export type DemoItemFactory = (now: Date) => Item[]

export interface SeedDemoDataResult {
  readonly seeded: boolean
  readonly itemCount: number
}

export type SeedDemoDataUseCase = (now?: Date) => Promise<SeedDemoDataResult>

/**
 * Fills an *empty* backlog with the demo dataset.
 *
 * The empty check is the safety property, not an optimization: it is what
 * guarantees seeding can never destroy data. A visitor who adds their own
 * items to the demo keeps them across reloads, and a personal build that
 * somehow ran this would leave a real backlog untouched.
 */
export function createSeedDemoDataUseCase(
  repository: ItemRepository,
  createDemoItems: DemoItemFactory,
): SeedDemoDataUseCase {
  return async (now = new Date()) => {
    const existing = await repository.getAll()
    if (existing.length > 0) {
      return { seeded: false, itemCount: existing.length }
    }

    const items = createDemoItems(now)
    await repository.replaceAll(items)
    return { seeded: true, itemCount: items.length }
  }
}
