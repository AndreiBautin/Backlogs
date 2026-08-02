import { describe, expect, it } from 'vitest'

import { DEFAULT_SETTINGS } from '@/domain/entities/settings'
import { DomainValidationError } from '@/domain/errors/domain-validation-error'
import { InMemorySettingsRepository } from '@/infrastructure/storage/in-memory-settings-repository'

import { createUpdateSettingsUseCase } from './update-settings'

describe('updateSettings use-case', () => {
  it('merges changes onto the current settings and persists the result', async () => {
    const repository = new InMemorySettingsRepository()
    const updateSettings = createUpdateSettingsUseCase(repository)

    const updated = await updateSettings({ theme: 'light' })

    expect(updated.theme).toBe('light')
    await expect(repository.get()).resolves.toEqual(updated)
  })

  it('merges onto whatever was previously saved, not just the defaults', async () => {
    const repository = new InMemorySettingsRepository()
    await repository.save({ ...DEFAULT_SETTINGS, theme: 'light' })
    const updateSettings = createUpdateSettingsUseCase(repository)

    const updated = await updateSettings({ defaultCategory: 'books' })

    expect(updated.theme).toBe('light')
    expect(updated.defaultCategory).toBe('books')
  })

  it('propagates domain validation errors without persisting', async () => {
    const repository = new InMemorySettingsRepository()
    const updateSettings = createUpdateSettingsUseCase(repository)

    await expect(updateSettings({ theme: 'neon' })).rejects.toThrow(DomainValidationError)
    await expect(repository.get()).resolves.toEqual(DEFAULT_SETTINGS)
  })
})
