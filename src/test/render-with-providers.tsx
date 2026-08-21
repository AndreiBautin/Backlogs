import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'

import { createAppUseCases } from '@/app/di'
import { AppProviders } from '@/app/providers'
import { readAppConfig, type AppConfig } from '@/config/app-config'
import type { ItemRepository } from '@/domain/repositories/item-repository'
import type { SettingsRepository } from '@/domain/repositories/settings-repository'
import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'
import { InMemorySettingsRepository } from '@/infrastructure/storage/in-memory-settings-repository'

interface RenderWithProvidersResult extends RenderResult {
  repository: ItemRepository
  settingsRepository: SettingsRepository
}

interface RenderWithProvidersOptions {
  repository?: ItemRepository
  settingsRepository?: SettingsRepository
  config?: AppConfig
}

/**
 * Pinned configs rather than the ambient `appConfig`, so a test's world
 * does not change depending on which Vite mode the suite happens to run
 * under. `DEMO_TEST_CONFIG` is how a test opts into the demo experience.
 */
export const PERSONAL_TEST_CONFIG: AppConfig = readAppConfig({})
export const DEMO_TEST_CONFIG: AppConfig = readAppConfig({ VITE_APP_MODE: 'demo' })

/** Renders a tree under AppProviders backed by isolated, seedable in-memory repositories. */
export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  const repository = options.repository ?? new InMemoryItemRepository()
  const settingsRepository =
    options.settingsRepository ?? new InMemorySettingsRepository()
  const useCases = createAppUseCases(repository, settingsRepository)

  const result = render(
    <AppProviders useCases={useCases} config={options.config ?? PERSONAL_TEST_CONFIG}>
      {ui}
    </AppProviders>,
  )

  return { ...result, repository, settingsRepository }
}
