import { DEFAULT_SETTINGS, type Settings } from '@/domain/entities/settings'
import type { SettingsRepository } from '@/domain/repositories/settings-repository'

/** In-process test double for SettingsRepository — no I/O. */
export class InMemorySettingsRepository implements SettingsRepository {
  private settings: Settings = DEFAULT_SETTINGS

  get(): Promise<Settings> {
    return Promise.resolve(this.settings)
  }

  save(settings: Settings): Promise<void> {
    this.settings = settings
    return Promise.resolve()
  }
}
