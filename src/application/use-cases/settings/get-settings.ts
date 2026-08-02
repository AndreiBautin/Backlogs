import type { Settings } from '@/domain/entities/settings'
import type { SettingsRepository } from '@/domain/repositories/settings-repository'

export type GetSettingsUseCase = () => Promise<Settings>

export function createGetSettingsUseCase(
  repository: SettingsRepository,
): GetSettingsUseCase {
  return () => repository.get()
}
