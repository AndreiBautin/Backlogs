import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_SETTINGS } from '@/domain/entities/settings'
import type { SettingsRepository } from '@/domain/repositories/settings-repository'

/**
 * A shared behavioral contract every SettingsRepository implementation
 * must satisfy, mirroring item-repository.contract.ts.
 */
export function itBehavesLikeASettingsRepository(
  createRepository: () => SettingsRepository,
): void {
  describe('SettingsRepository contract', () => {
    beforeEach(() => {
      window.localStorage.clear()
    })

    it('returns the default settings when nothing has been saved', async () => {
      const repository = createRepository()

      await expect(repository.get()).resolves.toEqual(DEFAULT_SETTINGS)
    })

    it('persists and retrieves saved settings', async () => {
      const repository = createRepository()
      const settings = { ...DEFAULT_SETTINGS, theme: 'light' as const }

      await repository.save(settings)

      await expect(repository.get()).resolves.toEqual(settings)
    })

    it('overwrites previously saved settings', async () => {
      const repository = createRepository()

      await repository.save({ ...DEFAULT_SETTINGS, theme: 'light' })
      await repository.save({
        ...DEFAULT_SETTINGS,
        theme: 'dark',
        defaultCategory: 'books',
      })

      await expect(repository.get()).resolves.toEqual({
        ...DEFAULT_SETTINGS,
        theme: 'dark',
        defaultCategory: 'books',
      })
    })
  })
}
