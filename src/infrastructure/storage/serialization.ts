import type { Item } from '@/domain/entities/item'
import { createItemEnvelope, parseItemEnvelope } from '@/domain/services/item-envelope'

export function serializeItems(items: readonly Item[]): string {
  return JSON.stringify(createItemEnvelope(items))
}

/** Parses the persisted envelope, recovering to an empty list on any corruption. */
export function deserializeItems(raw: string | null): Item[] {
  if (raw === null) {
    return []
  }

  const { items, warning } = parseItemEnvelope(raw)
  if (warning) {
    console.warn(`[backlogs] Ignoring corrupted item storage: ${warning}`)
  }
  return items
}
