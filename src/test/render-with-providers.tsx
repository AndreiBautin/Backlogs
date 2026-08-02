import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'

import { createAppUseCases } from '@/app/di'
import { AppProviders } from '@/app/providers'
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
}

/** Renders a tree under AppProviders backed by isolated, seedable in-memory repositories. */
export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  const repository = options.repository ?? new InMemoryItemRepository()
  const settingsRepository =
    options.settingsRepository ?? new InMemorySettingsRepository()
  const useCases = createAppUseCases(repository, settingsRepository)

  const result = render(<AppProviders useCases={useCases}>{ui}</AppProviders>)

  return { ...result, repository, settingsRepository }
}
