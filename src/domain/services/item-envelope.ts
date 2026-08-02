import type { Item } from '../entities/item'

export const ITEM_ENVELOPE_VERSION = 1

export interface ItemEnvelope {
  readonly version: number
  readonly items: readonly Item[]
}

interface RawEnvelopeShape {
  version: number
  items: unknown[]
}

function isEnvelopeShape(value: unknown): value is RawEnvelopeShape {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    'items' in value &&
    Array.isArray((value as { items: unknown }).items)
  )
}

export function isPlausibleItem(value: unknown): value is Item {
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

/** The shape shared by both the LocalStorage envelope and the user-facing export file. */
export function createItemEnvelope(items: readonly Item[]): ItemEnvelope {
  return { version: ITEM_ENVELOPE_VERSION, items: [...items] }
}

export interface ParsedItemEnvelope {
  readonly items: Item[]
  readonly warning: string | null
}

/** Parses raw JSON into a validated item list, never throwing — corruption is reported via `warning`. */
export function parseItemEnvelope(raw: string): ParsedItemEnvelope {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { items: [], warning: 'Invalid JSON' }
  }

  if (!isEnvelopeShape(parsed)) {
    return { items: [], warning: 'Unexpected data shape' }
  }

  const validItems = parsed.items.filter(isPlausibleItem)
  const warning =
    validItems.length !== parsed.items.length ? 'Dropped malformed item(s)' : null

  return { items: validItems, warning }
}
