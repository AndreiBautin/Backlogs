import {
  applySettingsChanges,
  type Settings,
  type SettingsChanges,
} from '@/domain/entities/settings'
import type { SettingsRepository } from '@/domain/repositories/settings-repository'

export type UpdateSettingsUseCase = (changes: SettingsChanges) => Promise<Settings>

export function createUpdateSettingsUseCase(
  repository: SettingsRepository,
): UpdateSettingsUseCase {
  return async (changes) => {
    const current = await repository.get()
    const updated = applySettingsChanges(current, changes)
    await repository.save(updated)
    return updated
  }
}
