import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '@/domain/entities/settings'

import {
  ITEM_SETTINGS_STORAGE_KEY,
  LocalStorageSettingsRepository,
} from './local-storage-settings-repository'
import { itBehavesLikeASettingsRepository } from './settings-repository.contract'

itBehavesLikeASettingsRepository(
  () => new LocalStorageSettingsRepository(window.localStorage),
)

describe('LocalStorageSettingsRepository', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('persists settings under a dedicated storage key', async () => {
    const repository = new LocalStorageSettingsRepository(window.localStorage)

    await repository.save({ ...DEFAULT_SETTINGS, theme: 'light' })

    const raw = window.localStorage.getItem(ITEM_SETTINGS_STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw ?? '{}')).toMatchObject({ theme: 'light' })
  })

  it('recovers to the defaults when the stored value is corrupted', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    window.localStorage.setItem(ITEM_SETTINGS_STORAGE_KEY, 'not json at all')

    const repository = new LocalStorageSettingsRepository(window.localStorage)

    await expect(repository.get()).resolves.toEqual(DEFAULT_SETTINGS)
    expect(warn).toHaveBeenCalled()

    warn.mockRestore()
  })

  it('recovers to the defaults when a stored field is invalid', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    window.localStorage.setItem(
      ITEM_SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, theme: 'neon' }),
    )

    const repository = new LocalStorageSettingsRepository(window.localStorage)

    await expect(repository.get()).resolves.toEqual(DEFAULT_SETTINGS)
    expect(warn).toHaveBeenCalled()

    warn.mockRestore()
  })

  it('survives being reconstructed, reading back what a prior instance wrote', async () => {
    const settings = { ...DEFAULT_SETTINGS, defaultCategory: 'books' as const }
    await new LocalStorageSettingsRepository(window.localStorage).save(settings)

    const secondInstance = new LocalStorageSettingsRepository(window.localStorage)

    await expect(secondInstance.get()).resolves.toEqual(settings)
  })
})
