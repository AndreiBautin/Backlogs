import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'
import { renderWithProviders } from '@/test/render-with-providers'
import { buildItem } from '@/test/builders/item-builder'

import { useItemUiStore } from '../store/use-item-ui-store'
import { ItemDetailDrawer } from './ItemDetailDrawer'

describe('ItemDetailDrawer', () => {
  it('is closed when no item is selected', () => {
    renderWithProviders(<ItemDetailDrawer />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens with the selected item and saves status changes', async () => {
    const user = userEvent.setup()
    const repository = new InMemoryItemRepository()
    const item = buildItem({ title: 'The Legend of Zelda', status: 'backlog' })
    await repository.save(item)

    renderWithProviders(<ItemDetailDrawer />, { repository })
    useItemUiStore.getState().selectItem(item.id)

    expect(await screen.findByDisplayValue('The Legend of Zelda')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Status' }))
    await user.click(await screen.findByRole('option', { name: 'Completed' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(async () => {
      const updated = await repository.getById(item.id)
      expect(updated?.status).toBe('completed')
    })
  })

  it('closes when dismissed', async () => {
    const repository = new InMemoryItemRepository()
    const item = buildItem()
    await repository.save(item)

    renderWithProviders(<ItemDetailDrawer />, { repository })
    useItemUiStore.getState().selectItem(item.id)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    useItemUiStore.getState().selectItem(null)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})

describe('ItemDetailDrawer daily goals', () => {
  it('sets a daily goal, prefilled with the unit its category is counted in', async () => {
    const user = userEvent.setup()
    const repository = new InMemoryItemRepository()
    const item = buildItem({ title: 'The Way of Kings', category: 'books' })
    await repository.save(item)

    renderWithProviders(<ItemDetailDrawer />, { repository })
    useItemUiStore.getState().selectItem(item.id)

    await user.click(await screen.findByRole('button', { name: 'Set a daily goal' }))
    expect(screen.getByLabelText('Daily goal unit')).toHaveValue('chapter')

    await user.clear(screen.getByLabelText('Daily goal'))
    await user.type(screen.getByLabelText('Daily goal'), '2')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(async () => {
      const updated = await repository.getById(item.id)
      expect(updated?.dailyGoal).toEqual({ amount: 2, unit: 'chapter' })
    })
  })

  it('removes a daily goal', async () => {
    const user = userEvent.setup()
    const repository = new InMemoryItemRepository()
    const item = buildItem({ dailyGoal: { amount: 1, unit: 'episode' } })
    await repository.save(item)

    renderWithProviders(<ItemDetailDrawer />, { repository })
    useItemUiStore.getState().selectItem(item.id)

    await user.click(await screen.findByRole('button', { name: 'Remove daily goal' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(async () => {
      const updated = await repository.getById(item.id)
      expect(updated?.dailyGoal).toBeUndefined()
    })
  })

  it('blocks saving a goal with no unit', async () => {
    const user = userEvent.setup()
    const repository = new InMemoryItemRepository()
    const item = buildItem({ dailyGoal: { amount: 1, unit: 'episode' } })
    await repository.save(item)

    renderWithProviders(<ItemDetailDrawer />, { repository })
    useItemUiStore.getState().selectItem(item.id)

    await user.clear(await screen.findByLabelText('Daily goal unit'))

    expect(screen.getByText(/Add a unit/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })
})
