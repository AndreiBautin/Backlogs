import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { DEFAULT_SETTINGS } from '@/domain/entities/settings'
import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'
import { InMemorySettingsRepository } from '@/infrastructure/storage/in-memory-settings-repository'
import { buildItem } from '@/test/builders/item-builder'
import { renderWithProviders } from '@/test/render-with-providers'

import { DiscoveryPage } from './DiscoveryPage'

async function seedRepository() {
  const repository = new InMemoryItemRepository()
  await repository.save(
    buildItem({
      title: 'Hollow Knight',
      category: 'games',
      status: 'backlog',
      platform: 'Steam',
      tags: ['metroidvania'],
    }),
  )
  await repository.save(
    buildItem({
      title: 'Dune',
      category: 'books',
      status: 'completed',
      platform: 'Kindle',
      tags: ['sci-fi'],
    }),
  )
  return repository
}

describe('DiscoveryPage', () => {
  it('shows every item by default', async () => {
    const repository = await seedRepository()
    renderWithProviders(<DiscoveryPage />, { repository })

    expect(await screen.findByText('Hollow Knight')).toBeInTheDocument()
    expect(screen.getByText('Dune')).toBeInTheDocument()
  })

  it('narrows results by search text', async () => {
    const user = userEvent.setup()
    const repository = await seedRepository()
    renderWithProviders(<DiscoveryPage />, { repository })
    await screen.findByText('Hollow Knight')

    await user.type(screen.getByLabelText('Search'), 'hollow')

    await waitFor(() => {
      expect(screen.queryByText('Dune')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Hollow Knight')).toBeInTheDocument()
  })

  it('filters by category', async () => {
    const user = userEvent.setup()
    const repository = await seedRepository()
    renderWithProviders(<DiscoveryPage />, { repository })
    await screen.findByText('Hollow Knight')

    await user.click(screen.getByRole('combobox', { name: 'Category' }))
    await user.click(await screen.findByRole('option', { name: 'Books' }))

    await waitFor(() => {
      expect(screen.queryByText('Hollow Knight')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Dune')).toBeInTheDocument()
  })

  it('shows an empty state when nothing matches', async () => {
    const user = userEvent.setup()
    const repository = await seedRepository()
    renderWithProviders(<DiscoveryPage />, { repository })
    await screen.findByText('Hollow Knight')

    await user.type(screen.getByLabelText('Search'), 'zzz')

    expect(await screen.findByText(/no items match/i)).toBeInTheDocument()
  }, 10000)

  it('clears filters via the Clear filters button', async () => {
    const user = userEvent.setup()
    const repository = await seedRepository()
    renderWithProviders(<DiscoveryPage />, { repository })
    await screen.findByText('Hollow Knight')

    await user.type(screen.getByLabelText('Search'), 'hollow')
    await user.click(await screen.findByRole('button', { name: 'Clear filters' }))

    expect(await screen.findByText('Dune')).toBeInTheDocument()
    expect(screen.getByText('Hollow Knight')).toBeInTheDocument()
  })

  it('initializes the sort control from the default sort setting', async () => {
    const repository = await seedRepository()
    const settingsRepository = new InMemorySettingsRepository()
    await settingsRepository.save({ ...DEFAULT_SETTINGS, defaultSort: 'alphabetical' })
    renderWithProviders(<DiscoveryPage />, { repository, settingsRepository })

    expect(await screen.findByRole('combobox', { name: 'Sort' })).toHaveTextContent(
      'Alphabetical',
    )
  })
})
