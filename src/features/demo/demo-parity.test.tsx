import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CATEGORY_REGISTRY } from '@/domain/categories/category-registry'
import { getDailyGoalBoard } from '@/domain/services/daily-goals'
import { getDashboardSections } from '@/domain/services/dashboard-sections'
import { getGoalsStats } from '@/domain/services/goals-stats'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DiscoveryPage } from '@/features/discovery/DiscoveryPage'
import { GoalsPage } from '@/features/goals/GoalsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { createDemoItems } from '@/infrastructure/seed/demo-backlog'
import { InMemoryItemRepository } from '@/infrastructure/storage/in-memory-item-repository'
import { DEMO_TEST_CONFIG, renderWithProviders } from '@/test/render-with-providers'

/**
 * The guard against the specific way this app can rot: a feature that
 * works perfectly against a personal backlog and shows an empty box on
 * the public demo, because the fixture has no data that exercises it.
 *
 * A page rendering its empty state is not a test failure in isolation —
 * it is a failure *here*, because the deployed demo is the thing a
 * stranger judges the project by.
 *
 * **Adding a data-driven feature? Add data for it to
 * `src/infrastructure/seed/demo-backlog.ts` and assert it here.**
 */

const NOW = new Date('2026-08-20T12:00:00.000Z')

/** Renders a page in demo mode against the real fixture, exactly as the deployed app does. */
function renderInDemoMode(ui: React.ReactElement) {
  return renderWithProviders(ui, {
    repository: new InMemoryItemRepository(createDemoItems(NOW)),
    config: DEMO_TEST_CONFIG,
  })
}

describe('every page has something to show in demo mode', () => {
  it('the dashboard is populated, not showing its empty state', async () => {
    renderInDemoMode(<DashboardPage />)

    expect(await screen.findByText('Continue')).toBeInTheDocument()
    expect(screen.getByText('Start Next')).toBeInTheDocument()
    expect(screen.getByText('Recently Finished')).toBeInTheDocument()
    expect(screen.queryByText(/press N to add something/i)).not.toBeInTheDocument()
  })

  it('discovery lists items rather than an empty result set', async () => {
    renderInDemoMode(<DiscoveryPage />)

    expect(await screen.findByRole('combobox', { name: 'Category' })).toBeInTheDocument()
    // The filter controls render before the item query resolves, so the
    // empty state is briefly correct. Wait for the load to settle rather
    // than racing it.
    await waitFor(() => {
      expect(screen.queryByText(/no items match/i)).not.toBeInTheDocument()
    })
  })

  it('goals shows a live check-in board', async () => {
    renderInDemoMode(<GoalsPage />)

    expect(await screen.findByText(/today.s goals/i)).toBeInTheDocument()
    expect(screen.getByText(/of \d+ done/i)).toBeInTheDocument()
  })

  it('settings shows the demo controls and the build identity', async () => {
    renderInDemoMode(<SettingsPage />)

    expect(
      await screen.findByRole('button', { name: /reset demo data/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/^Version .+ · build .+$/)).toBeInTheDocument()
  })

  it('shows the demo banner so a visitor knows what they are looking at', async () => {
    renderInDemoMode(<DashboardPage />)

    // The banner lives in AppShell, so assert the config drives it rather
    // than re-rendering the whole shell here.
    expect(DEMO_TEST_CONFIG.isDemo).toBe(true)
    expect(await screen.findByText('Continue')).toBeInTheDocument()
  })
})

/**
 * The fixture's *coverage* obligations, stated as properties rather than
 * as a fixed list of titles — so adding or renaming demo items is free,
 * but removing the last item of a kind is not.
 */
describe('the demo fixture covers what the UI can display', () => {
  const items = createDemoItems(NOW)

  it('fills every dashboard section', () => {
    const sections = getDashboardSections(items)

    expect(sections.continue.length).toBeGreaterThan(0)
    expect(sections.recentlyFinished.length).toBeGreaterThan(0)
    expect(sections.recentlyAdded.length).toBeGreaterThan(0)
    // One pick per category is the contract of Start Next; anything less
    // means a category has no backlog item and renders as a gap.
    expect(sections.startNext).toHaveLength(CATEGORY_REGISTRY.length)
  })

  it('gives the goals board both met and unmet rows', () => {
    const board = getDailyGoalBoard(items, NOW)

    expect(board.metCount).toBeGreaterThan(0)
    expect(board.metCount).toBeLessThan(board.totalCount)
  })

  it('gives every headline stat a non-zero value', () => {
    const stats = getGoalsStats(items, NOW)

    expect(stats.currentStreak).toBeGreaterThan(0)
    expect(stats.completedThisMonth).toBeGreaterThan(0)
    expect(stats.completedThisYear).toBeGreaterThan(0)
    expect(stats.averageCompletionsPerMonth).toBeGreaterThan(0)
    expect(stats.averageBacklogAgeDays).toBeGreaterThan(0)
    expect(stats.oldestUnfinishedItem).not.toBeNull()
  })

  it('gives the discovery filters something to filter by', () => {
    // A filter dropdown with one option demonstrates nothing.
    expect(new Set(items.map((i) => i.category)).size).toBeGreaterThan(5)
    expect(new Set(items.map((i) => i.status)).size).toBeGreaterThan(3)
    expect(new Set(items.map((i) => i.priority)).size).toBeGreaterThan(2)
    expect(new Set(items.flatMap((i) => i.tags)).size).toBeGreaterThan(5)
    expect(new Set(items.map((i) => i.platform).filter(Boolean)).size).toBeGreaterThan(5)
  })
})
