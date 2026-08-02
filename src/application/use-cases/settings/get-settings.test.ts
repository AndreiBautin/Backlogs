import { describe, expect, it } from 'vitest'

import { DEFAULT_SETTINGS } from '@/domain/entities/settings'
import { InMemorySettingsRepository } from '@/infrastructure/storage/in-memory-settings-repository'

import { createGetSettingsUseCase } from './get-settings'

describe('getSettings use-case', () => {
  it('returns the defaults when nothing has been saved', async () => {
    const repository = new InMemorySettingsRepository()
    const getSettings = createGetSettingsUseCase(repository)

    await expect(getSettings()).resolves.toEqual(DEFAULT_SETTINGS)
  })

  it('returns whatever was previously saved', async () => {
    const repository = new InMemorySettingsRepository()
    await repository.save({ ...DEFAULT_SETTINGS, theme: 'light' })
    const getSettings = createGetSettingsUseCase(repository)

    await expect(getSettings()).resolves.toEqual({ ...DEFAULT_SETTINGS, theme: 'light' })
  })
})
