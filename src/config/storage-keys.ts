import type { AppMode } from './app-config'

export interface StorageKeys {
  readonly items: string
  readonly settings: string
}

/**
 * LocalStorage keys, namespaced by mode.
 *
 * The `personal` keys are frozen at their original values so that an
 * existing backlog keeps working across this change — a rename here
 * would silently orphan the owner's real data.
 *
 * `demo` gets its own namespace so that the two datasets cannot collide
 * even when both are visited on the same origin (`localhost:5173`, say,
 * running the demo build once and the personal build the next day).
 */
const KEYS_BY_MODE: Record<AppMode, StorageKeys> = {
  personal: {
    items: 'backlogs:items:v1',
    settings: 'backlogs:settings:v1',
  },
  demo: {
    items: 'backlogs:demo:items:v1',
    settings: 'backlogs:demo:settings:v1',
  },
}

export function getStorageKeys(mode: AppMode): StorageKeys {
  return KEYS_BY_MODE[mode]
}
