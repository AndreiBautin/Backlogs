import { getStorageKeys } from '@/config/storage-keys'
import {
  applySettingsChanges,
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsChanges,
} from '@/domain/entities/settings'
import { DomainValidationError } from '@/domain/errors/domain-validation-error'
import type { SettingsRepository } from '@/domain/repositories/settings-repository'
import { createLogger, type Logger } from '@/shared/logging/logger'

/** The personal-mode key. Kept as a named export because existing settings live under it. */
export const ITEM_SETTINGS_STORAGE_KEY = getStorageKeys('personal').settings

export interface LocalStorageSettingsRepositoryOptions {
  storageKey?: string
  logger?: Logger
}

/** The only place in the app that touches window.localStorage for settings. */
export class LocalStorageSettingsRepository implements SettingsRepository {
  private readonly storage: Storage
  private readonly storageKey: string
  private readonly logger: Logger

  constructor(storage: Storage, options: LocalStorageSettingsRepositoryOptions = {}) {
    this.storage = storage
    this.storageKey = options.storageKey ?? ITEM_SETTINGS_STORAGE_KEY
    this.logger = options.logger ?? createLogger({ threshold: 'warn' })
  }

  get(): Promise<Settings> {
    const raw = this.storage.getItem(this.storageKey)
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
      this.logger.warn('storage.settings.corrupted')
      return Promise.resolve(DEFAULT_SETTINGS)
    }
  }

  save(settings: Settings): Promise<void> {
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(settings))
    } catch (error) {
      this.logger.error('storage.settings.write-failed', {
        reason: error instanceof Error ? error.name : 'unknown',
      })
      throw new Error('Could not save settings — browser storage is unavailable.', {
        cause: error,
      })
    }
    return Promise.resolve()
  }
}
