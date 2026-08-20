import { isPlausibleDailyGoal, isPlausibleProgressEntry } from '../entities/daily-goal'
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

/**
 * Repairs the daily-goal fields of an otherwise-plausible item. Backlogs
 * saved before daily goals existed carry neither field, so a missing log
 * becomes an empty one here rather than an undefined-is-not-iterable crash
 * later; a malformed goal or log entry is dropped on its own instead of
 * taking the whole item down with it.
 */
function normalizeItem(item: Item): Item {
  const raw = item as unknown as Record<string, unknown>
  const rawProgress = raw.dailyProgress

  const { dailyGoal: storedGoal, ...withoutGoal } = item
  void storedGoal

  return {
    ...withoutGoal,
    dailyProgress: Array.isArray(rawProgress)
      ? rawProgress.filter(isPlausibleProgressEntry)
      : [],
    ...(isPlausibleDailyGoal(raw.dailyGoal) && { dailyGoal: raw.dailyGoal }),
  }
}

/** The shape shared by both the LocalStorage envelope and the user-facing export file. */
export function createItemEnvelope(items: readonly Item[]): ItemEnvelope {
  return { version: ITEM_ENVELOPE_VERSION, items: [...items] }
}

export interface ParsedItemEnvelope {
  readonly items: Item[]
  readonly warning: string | null
  /**
   * True once raw JSON parsed and had the { version, items[] } shape, even
   * if individual items inside were dropped or the list is empty. False
   * means raw wasn't recognizable as an envelope at all — callers should
   * treat that as "nothing usable was found," not "the backlog is now
   * empty," and must not use `items` to overwrite existing data.
   */
  readonly envelopeValid: boolean
}

/** Parses raw JSON into a validated item list, never throwing — corruption is reported via `warning`. */
export function parseItemEnvelope(raw: string): ParsedItemEnvelope {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { items: [], warning: 'Invalid JSON', envelopeValid: false }
  }

  if (!isEnvelopeShape(parsed)) {
    return { items: [], warning: 'Unexpected data shape', envelopeValid: false }
  }

  const validItems = parsed.items.filter(isPlausibleItem).map(normalizeItem)
  const warning =
    validItems.length !== parsed.items.length ? 'Dropped malformed item(s)' : null

  return { items: validItems, warning, envelopeValid: true }
}
