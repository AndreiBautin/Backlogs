import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DEMO_ITEM_COUNT } from '@/infrastructure/seed/demo-backlog'
import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'
import { buildItem } from '@/test/builders/item-builder'
import {
  DEMO_TEST_CONFIG,
  PERSONAL_TEST_CONFIG,
  renderWithProviders,
} from '@/test/render-with-providers'

import { DemoBanner } from './DemoBanner'

/**
 * These go through `renderWithProviders`, which wires the *real* demo
 * fixture through the real seed use-case. That is the point: it verifies
 * the whole seeding path a visitor actually hits, not a stubbed version
 * of it.
 */
describe('demo bootstrap', () => {
  it('seeds an empty backlog before showing the app', async () => {
    const repository = new InMemoryItemRepository()

    renderWithProviders(<p>Loaded</p>, { repository, config: DEMO_TEST_CONFIG })

    expect(await screen.findByText('Loaded')).toBeInTheDocument()
    expect(await repository.getAll()).toHaveLength(DEMO_ITEM_COUNT)
  })

  it('leaves a returning visitor’s edits alone', async () => {
    const theirs = buildItem({ title: 'Added by a visitor' })
    const repository = new InMemoryItemRepository([theirs])

    renderWithProviders(<p>Loaded</p>, { repository, config: DEMO_TEST_CONFIG })

    expect(await screen.findByText('Loaded')).toBeInTheDocument()
    expect(await repository.getAll()).toEqual([theirs])
  })

  /**
   * The one that matters for the owner. Demo seeding must be unreachable
   * from a personal build no matter what else changes.
   */
  it('never seeds in personal mode', async () => {
    const repository = new InMemoryItemRepository()

    renderWithProviders(<p>Loaded</p>, { repository, config: PERSONAL_TEST_CONFIG })

    expect(await screen.findByText('Loaded')).toBeInTheDocument()
    expect(await repository.getAll()).toEqual([])
  })

  it('renders children immediately in personal mode, with no loading state', () => {
    renderWithProviders(<p>Loaded</p>, { config: PERSONAL_TEST_CONFIG })

    expect(screen.getByText('Loaded')).toBeInTheDocument()
    expect(screen.queryByText(/preparing the demo/i)).not.toBeInTheDocument()
  })
})

describe('DemoBanner', () => {
  it('tells a visitor the data is sample data stored in their own browser', async () => {
    renderWithProviders(<DemoBanner />, { config: DEMO_TEST_CONFIG })

    const banner = await screen.findByRole('status')
    expect(banner).toHaveTextContent(/demo mode/i)
    expect(banner).toHaveTextContent(/sample data/i)
    expect(banner).toHaveTextContent(/your own browser/i)
  })

  it('renders nothing at all in personal mode', () => {
    renderWithProviders(<DemoBanner />, { config: PERSONAL_TEST_CONFIG })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
