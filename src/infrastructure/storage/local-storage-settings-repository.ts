import {
  applySettingsChanges,
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsChanges,
} from '@/domain/entities/settings'
import { DomainValidationError } from '@/domain/errors/domain-validation-error'
import type { SettingsRepository } from '@/domain/repositories/settings-repository'

export const ITEM_SETTINGS_STORAGE_KEY = 'backlogs:settings:v1'

/** The only place in the app that touches window.localStorage for settings. */
export class LocalStorageSettingsRepository implements SettingsRepository {
  private readonly storage: Storage

  constructor(storage: Storage) {
    this.storage = storage
  }

  get(): Promise<Settings> {
    const raw = this.storage.getItem(ITEM_SETTINGS_STORAGE_KEY)
    if (raw === null) {
      return Promise.resolve(DEFAULT_SETTINGS)
    }

    try {
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null) {
        throw new DomainValidationError('Settings storage is not an object')
      }
      // Reuses the same field-by-field validation createItem/applyItemUpdate
      // rely on elsewhere, so a corrupted or hand-edited field is rejected
      // (falling back to its default below) rather than trusted blindly.
      return Promise.resolve(
        applySettingsChanges(DEFAULT_SETTINGS, parsed as SettingsChanges),
      )
    } catch {
      console.warn('[backlogs] Ignoring corrupted settings storage')
      return Promise.resolve(DEFAULT_SETTINGS)
    }
  }

  save(settings: Settings): Promise<void> {
    this.storage.setItem(ITEM_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    return Promise.resolve()
  }
}
