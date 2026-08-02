import type { Item } from '@/domain/entities/item'

const STORAGE_VERSION = 1

interface StorageEnvelope {
  version: number
  items: unknown[]
}

function isStorageEnvelope(value: unknown): value is StorageEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    'items' in value &&
    Array.isArray((value as { items: unknown }).items)
  )
}

function isPlausibleItem(value: unknown): value is Item {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<Record<keyof Item, unknown>>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.category === 'string' &&
    typeof candidate.status === 'string' &&
    typeof candidate.priority === 'string' &&
    Array.isArray(candidate.tags) &&
    typeof candidate.favorite === 'boolean' &&
    typeof candidate.dateAdded === 'string' &&
    typeof candidate.lastUpdated === 'string'
  )
}

export function serializeItems(items: readonly Item[]): string {
  const envelope: StorageEnvelope = { version: STORAGE_VERSION, items: [...items] }
  return JSON.stringify(envelope)
}

/** Parses the persisted envelope, recovering to an empty list on any corruption. */
export function deserializeItems(raw: string | null): Item[] {
  if (raw === null) {
    return []
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.warn('[backlogs] Ignoring corrupted item storage: invalid JSON')
    return []
  }

  if (!isStorageEnvelope(parsed)) {
    console.warn('[backlogs] Ignoring corrupted item storage: unexpected shape')
    return []
  }

  const validItems = parsed.items.filter(isPlausibleItem)
  if (validItems.length !== parsed.items.length) {
    console.warn('[backlogs] Dropped malformed item(s) found in storage')
  }

  return validItems
}
