import type { Settings } from '../entities/settings'

/**
 * Persistence port for settings. Like ItemRepository, Promise-returning
 * even for a synchronous LocalStorage adapter, and `get()` never fails —
 * it resolves to DEFAULT_SETTINGS if nothing has been saved yet or the
 * stored value is corrupted.
 */
export interface SettingsRepository {
  get(): Promise<Settings>
  save(settings: Settings): Promise<void>
}
