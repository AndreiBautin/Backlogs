import type { Item } from '@/domain/entities/item'
import { createItemEnvelope, parseItemEnvelope } from '@/domain/services/item-envelope'
import type { Logger } from '@/shared/logging/logger'

export function serializeItems(items: readonly Item[]): string {
  return JSON.stringify(createItemEnvelope(items))
}

/**
 * Parses the persisted envelope, recovering to an empty list on any
 * corruption. The warning is logged as a *reason code*, never with the
 * offending content — stored items are the user's own reading and
 * watching habits, and those do not belong in a console anyone could be
 * looking at.
 */
export function deserializeItems(raw: string | null, logger: Logger): Item[] {
  if (raw === null) {
    return []
  }

  const { items, warning, droppedCount } = parseItemEnvelope(raw)
  if (warning !== null) {
    logger.warn('storage.items.corrupted', { reason: warning, dropped: droppedCount })
  }
  return items
}
