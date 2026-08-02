import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'
import { buildItem } from '@/test/builders/item-builder'
import { renderWithProviders } from '@/test/render-with-providers'

import { GoalsPage } from './GoalsPage'

describe('GoalsPage', () => {
  it('shows a friendly message when nothing has been added yet', async () => {
    renderWithProviders(<GoalsPage />)

    expect(await screen.findByText(/nothing to show yet/i)).toBeInTheDocument()
  })

  it('shows stats and the oldest unfinished item once there is data', async () => {
    const repository = new InMemoryItemRepository()
    await repository.save(
      buildItem({
        title: 'Half-Life 2',
        status: 'backlog',
        dateAdded: '2020-01-01T00:00:00.000Z',
      }),
    )
    await repository.save(
      buildItem({ status: 'completed', dateCompleted: '2026-01-01T00:00:00.000Z' }),
    )

    renderWithProviders(<GoalsPage />, { repository })

    expect(await screen.findByText('Current streak')).toBeInTheDocument()
    expect(screen.getByText('Average backlog age')).toBeInTheDocument()
    expect(screen.getByText('Oldest unfinished item')).toBeInTheDocument()
    expect(screen.getByText('Half-Life 2')).toBeInTheDocument()
  })

  it('shows a placeholder when there is no unfinished item', async () => {
    const repository = new InMemoryItemRepository()
    // GoalsPage reads the real current date, so anchor "completed" to
    // right now rather than a fixed string that would go stale over time.
    await repository.save(
      buildItem({ status: 'completed', dateCompleted: new Date().toISOString() }),
    )

    renderWithProviders(<GoalsPage />, { repository })

    expect(await screen.findByText('Current streak')).toBeInTheDocument()
    expect(screen.getByText(/nothing unfinished/i)).toBeInTheDocument()
  })
})
