import { createItem, type CreateItemInput, type Item } from '@/domain/entities/item'
import type { ItemId } from '@/domain/value-objects/item-id'

let sequence = 0

/** Builds a fully valid Item for tests, with sensible defaults and full override support. */
export function buildItem(overrides: Partial<Item> = {}): Item {
  sequence += 1
  const input: CreateItemInput = {
    title: overrides.title ?? `Test Item ${sequence.toString()}`,
    category: overrides.category ?? 'games',
  }
  const base = createItem(input, {
    now: () => new Date('2026-01-01T00:00:00.000Z'),
    generateId: () => `test-item-${sequence.toString()}` as ItemId,
  })

  return { ...base, ...overrides }
}
