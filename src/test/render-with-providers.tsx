import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'

import { createAppUseCases } from '@/app/di'
import { AppProviders } from '@/app/providers'
import type { ItemRepository } from '@/domain/repositories/item-repository'
import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'

interface RenderWithProvidersResult extends RenderResult {
  repository: ItemRepository
}

/** Renders a tree under AppProviders backed by an isolated, seedable InMemoryItemRepository. */
export function renderWithProviders(
  ui: ReactElement,
  options: { repository?: ItemRepository } = {},
): RenderWithProvidersResult {
  const repository = options.repository ?? new InMemoryItemRepository()
  const useCases = createAppUseCases(repository)

  const result = render(<AppProviders useCases={useCases}>{ui}</AppProviders>)

  return { ...result, repository }
}
