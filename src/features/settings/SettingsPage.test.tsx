import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '@/domain/entities/settings'
import { DEMO_ITEM_COUNT } from '@/infrastructure/seed/demo-backlog'
import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'
import { InMemorySettingsRepository } from '@/infrastructure/storage/in-memory-settings-repository'
import { buildItem } from '@/test/builders/item-builder'
import { DEMO_TEST_CONFIG, renderWithProviders } from '@/test/render-with-providers'

import { SettingsPage } from './SettingsPage'

describe('SettingsPage', () => {
  it('shows the current settings once loaded', async () => {
    renderWithProviders(<SettingsPage />)

    expect(await screen.findByRole('combobox', { name: 'Theme' })).toHaveTextContent(
      'Dark',
    )
    expect(screen.getByRole('combobox', { name: 'Default category' })).toHaveTextContent(
      'Games',
    )
  })

  it('persists a theme change', async () => {
    const user = userEvent.setup()
    const settingsRepository = new InMemorySettingsRepository()
    renderWithProviders(<SettingsPage />, { settingsRepository })

    await user.click(await screen.findByRole('combobox', { name: 'Theme' }))
    await user.click(await screen.findByRole('option', { name: 'Light' }))

    await waitFor(async () => {
      await expect(settingsRepository.get()).resolves.toMatchObject({ theme: 'light' })
    })
  })

  it('persists a default category change', async () => {
    const user = userEvent.setup()
    const settingsRepository = new InMemorySettingsRepository()
    renderWithProviders(<SettingsPage />, { settingsRepository })

    await user.click(await screen.findByRole('combobox', { name: 'Default category' }))
    await user.click(await screen.findByRole('option', { name: 'Books' }))

    await waitFor(async () => {
      await expect(settingsRepository.get()).resolves.toMatchObject({
        defaultCategory: 'books',
      })
    })
  })

  it('exports the backlog as a downloadable backup', async () => {
    const user = userEvent.setup()
    const repository = new InMemoryItemRepository()
    await repository.save(buildItem({ title: 'Hades 2' }))
    renderWithProviders(<SettingsPage />, { repository })

    await user.click(await screen.findByRole('button', { name: 'Export backup' }))

    expect(await screen.findByText(/backup downloaded/i)).toBeInTheDocument()
  })

  it('imports a backup and replaces the backlog', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const repository = new InMemoryItemRepository()
    await repository.save(buildItem({ title: 'Old item' }))
    renderWithProviders(<SettingsPage />, { repository })

    const incoming = buildItem({ title: 'Imported item' })
    const file = new File(
      [JSON.stringify({ version: 1, items: [incoming] })],
      'backup.json',
      { type: 'application/json' },
    )

    await user.upload(await screen.findByLabelText('Import backup file'), file)

    expect(await screen.findByText(/imported 1 item/i)).toBeInTheDocument()
    await expect(repository.getAll()).resolves.toEqual([incoming])

    confirmSpy.mockRestore()
  })

  it('does not import when the confirmation is declined', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const repository = new InMemoryItemRepository()
    const existing = buildItem({ title: 'Existing item' })
    await repository.save(existing)
    renderWithProviders(<SettingsPage />, { repository })

    const file = new File(
      [
        JSON.stringify({
          version: 1,
          items: [buildItem({ title: 'Should not import' })],
        }),
      ],
      'backup.json',
      { type: 'application/json' },
    )

    await user.upload(await screen.findByLabelText('Import backup file'), file)

    await expect(repository.getAll()).resolves.toEqual([existing])

    confirmSpy.mockRestore()
  })
})

describe('SettingsPage — defaults sanity', () => {
  it('matches DEFAULT_SETTINGS out of the box', async () => {
    renderWithProviders(<SettingsPage />)

    expect(await screen.findByRole('combobox', { name: 'Theme' })).toHaveTextContent(
      DEFAULT_SETTINGS.theme === 'dark' ? 'Dark' : 'Light',
    )
  })
})

describe('SettingsPage in demo mode', () => {
  it('offers a reset control that restores the sample backlog', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const repository = new InMemoryItemRepository([
      buildItem({ title: 'Typed by a visitor' }),
    ])

    renderWithProviders(<SettingsPage />, { repository, config: DEMO_TEST_CONFIG })

    await user.click(await screen.findByRole('button', { name: /reset demo data/i }))

    await waitFor(async () => {
      const stored = await repository.getAll()
      expect(stored).toHaveLength(DEMO_ITEM_COUNT)
    })
    const stored = await repository.getAll()
    expect(stored.some((item) => item.title === 'Typed by a visitor')).toBe(false)

    confirm.mockRestore()
  })

  it('does nothing if the confirmation is declined', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const mine = buildItem({ title: 'Typed by a visitor' })
    const repository = new InMemoryItemRepository([mine])

    renderWithProviders(<SettingsPage />, { repository, config: DEMO_TEST_CONFIG })

    await user.click(await screen.findByRole('button', { name: /reset demo data/i }))

    expect(await repository.getAll()).toEqual([mine])

    confirm.mockRestore()
  })

  // The reset button is destructive, so it must not exist at all on the
  // build pointed at real data — not merely be hidden by CSS.
  it('is absent in personal mode', async () => {
    renderWithProviders(<SettingsPage />)

    expect(
      await screen.findByRole('button', { name: /export backup/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /reset demo data/i }),
    ).not.toBeInTheDocument()
  })

  it('reports which build is running, so a deployed page ties back to a commit', async () => {
    renderWithProviders(<SettingsPage />)

    expect(await screen.findByText(/^Version .+ · build .+$/)).toBeInTheDocument()
  })
})
