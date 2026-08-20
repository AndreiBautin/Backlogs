import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { shiftDateKey, toDateKey } from '@/domain/entities/daily-goal'
import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'
import { buildItem } from '@/test/builders/item-builder'
import { renderWithProviders } from '@/test/render-with-providers'

import { DailyGoalsPanel } from './DailyGoalsPanel'

// The panel reads the real clock (like the rest of the Goals feature), so
// every expected date is derived from "now" at run time rather than hardcoded.
const TODAY = toDateKey(new Date())
const YESTERDAY = shiftDateKey(TODAY, -1)

function buildTracked(overrides: Parameters<typeof buildItem>[0] = {}) {
  return buildItem({
    status: 'currently-using',
    dailyGoal: { amount: 1, unit: 'chapter' },
    ...overrides,
  })
}

async function renderPanel(items: readonly ReturnType<typeof buildItem>[], props = {}) {
  const repository = new InMemoryItemRepository()
  for (const item of items) {
    await repository.save(item)
  }

  const result = renderWithProviders(
    <DailyGoalsPanel title="Today" emptyMessage="No daily goals yet." {...props} />,
    { repository },
  )
  return { ...result, repository }
}

describe('DailyGoalsPanel', () => {
  it('lists each in-progress item with a goal, and what is logged today', async () => {
    await renderPanel([
      buildTracked({ title: 'The Way of Kings' }),
      buildTracked({
        title: 'Severance',
        dailyGoal: { amount: 2, unit: 'episode' },
        dailyProgress: [{ date: TODAY, amount: 1 }],
      }),
    ])

    expect(await screen.findByText('The Way of Kings')).toBeInTheDocument()
    expect(screen.getByText('1 chapter/day')).toBeInTheDocument()
    expect(screen.getByText('2 episodes/day')).toBeInTheDocument()
    expect(screen.getByLabelText('1 of 2 logged today for Severance')).toBeInTheDocument()
  })

  it('leaves out items that are not currently being worked through', async () => {
    await renderPanel([
      buildTracked({ title: 'Active' }),
      buildTracked({ title: 'Paused', status: 'paused' }),
      buildItem({ title: 'No goal set', status: 'currently-using' }),
    ])

    expect(await screen.findByText('Active')).toBeInTheDocument()
    expect(screen.queryByText('Paused')).not.toBeInTheDocument()
    expect(screen.queryByText('No goal set')).not.toBeInTheDocument()
  })

  it('summarises how much of today is done', async () => {
    await renderPanel([
      buildTracked({ title: 'Done', dailyProgress: [{ date: TODAY, amount: 1 }] }),
      buildTracked({ title: 'Not yet' }),
    ])

    expect(await screen.findByText('1 of 2 done')).toBeInTheDocument()
  })

  it('celebrates once every goal is met', async () => {
    await renderPanel([buildTracked({ dailyProgress: [{ date: TODAY, amount: 1 }] })])

    expect(await screen.findByText('All done for today')).toBeInTheDocument()
  })

  it('logs a unit of progress and persists it', async () => {
    const user = userEvent.setup()
    const item = buildTracked({
      title: 'Hades II',
      dailyGoal: { amount: 2, unit: 'level' },
    })
    const { repository } = await renderPanel([item])

    await user.click(
      await screen.findByRole('button', { name: 'Log progress for Hades II' }),
    )

    await waitFor(async () => {
      const updated = await repository.getById(item.id)
      expect(updated?.dailyProgress).toEqual([{ date: TODAY, amount: 1 }])
    })
    expect(
      await screen.findByLabelText('1 of 2 logged today for Hades II'),
    ).toBeInTheDocument()
  })

  it('undoes progress that was logged by mistake', async () => {
    const user = userEvent.setup()
    const item = buildTracked({
      title: 'Hades II',
      dailyProgress: [{ date: TODAY, amount: 1 }],
    })
    const { repository } = await renderPanel([item])

    await user.click(
      await screen.findByRole('button', { name: 'Undo progress for Hades II' }),
    )

    await waitFor(async () => {
      const updated = await repository.getById(item.id)
      expect(updated?.dailyProgress).toEqual([])
    })
  })

  it('cannot undo a day with nothing logged yet', async () => {
    await renderPanel([buildTracked({ title: 'Hades II' })])

    expect(
      await screen.findByRole('button', { name: 'Undo progress for Hades II' }),
    ).toBeDisabled()
  })

  it('shows the streak an item is currently on', async () => {
    await renderPanel([
      buildTracked({
        title: 'The Way of Kings',
        dailyProgress: [
          { date: shiftDateKey(TODAY, -2), amount: 1 },
          { date: YESTERDAY, amount: 1 },
        ],
      }),
    ])

    expect(await screen.findByText('2 days')).toBeInTheDocument()
  })

  it('shows the empty message when nothing has a goal yet', async () => {
    await renderPanel([buildItem({ status: 'currently-using' })])

    expect(await screen.findByText('No daily goals yet.')).toBeInTheDocument()
  })

  it('renders nothing at all when asked to hide an empty board', async () => {
    const { container } = await renderPanel([buildItem()], { hideWhenEmpty: true })

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement()
    })
  })

  it('shows a history strip only in the detailed view', async () => {
    await renderPanel([buildTracked({ title: 'The Way of Kings' })], {
      showHistory: true,
    })

    expect(
      await screen.findByRole('img', {
        name: /The Way of Kings: met on 0 of the last 14 days/,
      }),
    ).toBeInTheDocument()
  })
})
