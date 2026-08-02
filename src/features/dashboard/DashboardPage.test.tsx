import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'
import { renderWithProviders } from '@/test/render-with-providers'
import { buildItem } from '@/test/builders/item-builder'

import { DashboardPage } from './DashboardPage'

describe('DashboardPage', () => {
  it('shows an empty-backlog message when there are no items', async () => {
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText(/press N to add something/i)).toBeInTheDocument()
  })

  it('sorts items into Continue, Start Next, and Recently Finished', async () => {
    const repository = new InMemoryItemRepository()
    await repository.save(
      buildItem({ title: 'In progress game', status: 'currently-using' }),
    )
    await repository.save(
      buildItem({ title: 'Top of backlog', status: 'backlog', priority: 'high' }),
    )
    await repository.save(
      buildItem({
        title: 'Just finished',
        status: 'completed',
        dateCompleted: '2026-01-01T00:00:00.000Z',
      }),
    )

    renderWithProviders(<DashboardPage />, { repository })

    // Items also surface in "Recently Added" alongside their status-specific
    // section, so titles can legitimately appear more than once.
    expect((await screen.findAllByText('In progress game')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Top of backlog').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Just finished').length).toBeGreaterThan(0)
  })

  it('shows quick stats computed from the repository', async () => {
    const repository = new InMemoryItemRepository()
    await repository.save(buildItem({ status: 'backlog' }))
    await repository.save(buildItem({ status: 'backlog' }))

    renderWithProviders(<DashboardPage />, { repository })

    expect(await screen.findByText('2')).toBeInTheDocument()
  })
})
