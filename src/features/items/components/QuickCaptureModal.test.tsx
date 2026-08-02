import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/render-with-providers'

import { useItemUiStore } from '../store/use-item-ui-store'
import { QuickCaptureModal } from './QuickCaptureModal'

describe('QuickCaptureModal', () => {
  it('is closed by default and opens when N is pressed', async () => {
    const user = userEvent.setup()
    renderWithProviders(<QuickCaptureModal />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.keyboard('n')

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('creates an item and closes on submit', async () => {
    const user = userEvent.setup()
    const { repository } = renderWithProviders(<QuickCaptureModal />)
    useItemUiStore.getState().openQuickCapture()

    await user.type(await screen.findByLabelText('Title'), 'Hollow Knight')
    await user.click(screen.getByRole('combobox', { name: 'Category' }))
    await user.click(await screen.findByRole('option', { name: 'Games' }))
    await user.click(screen.getByRole('button', { name: 'Add item' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    const items = await repository.getAll()
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ title: 'Hollow Knight', category: 'games' })
  })

  it('disables submit until title and category are filled in', async () => {
    renderWithProviders(<QuickCaptureModal />)
    useItemUiStore.getState().openQuickCapture()

    expect(await screen.findByRole('button', { name: 'Add item' })).toBeDisabled()
  })
})
