import { describe, expect, it } from 'vitest'

import { CATEGORY_REGISTRY } from '@/domain/categories/category-registry'
import { isDateKey } from '@/domain/entities/daily-goal'
import { isPriority } from '@/domain/priority/priority'
import { getDailyGoalBoard } from '@/domain/services/daily-goals'
import { getDashboardSections } from '@/domain/services/dashboard-sections'
import { isPlausibleItem } from '@/domain/services/item-envelope'
import { getGoalsStats } from '@/domain/services/goals-stats'
import { isStatus, STATUSES } from '@/domain/status/status'

import { createDemoItems, DEMO_ITEM_COUNT } from './demo-backlog'

const NOW = new Date('2026-08-20T12:00:00.000Z')

describe('createDemoItems', () => {
  it('is deterministic for a given clock', () => {
    expect(createDemoItems(NOW)).toEqual(createDemoItems(NOW))
  })

  it('produces the documented number of items', () => {
    expect(createDemoItems(NOW)).toHaveLength(DEMO_ITEM_COUNT)
  })

  it('gives every item a unique id', () => {
    const ids = createDemoItems(NOW).map((item) => item.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  /**
   * The fixture bypasses `createItem`, so nothing else would catch a
   * hand-written entry with a bad status or a missing field. Running it
   * through the same gate that guards imported files means the demo can
   * never seed data the app would refuse to load.
   */
  it('produces items that pass the same validation an imported file must', () => {
    for (const item of createDemoItems(NOW)) {
      expect(isPlausibleItem(item)).toBe(true)
      expect(isStatus(item.status)).toBe(true)
      expect(isPriority(item.priority)).toBe(true)
      expect(Number.isNaN(Date.parse(item.dateAdded))).toBe(false)
      expect(Number.isNaN(Date.parse(item.lastUpdated))).toBe(false)
    }
  })

  it('writes daily progress as local calendar-day keys', () => {
    for (const item of createDemoItems(NOW)) {
      for (const entry of item.dailyProgress) {
        expect(isDateKey(entry.date)).toBe(true)
        expect(entry.amount).toBeGreaterThan(0)
      }
    }
  })

  it('never stamps a completion or a start before the item was added', () => {
    for (const item of createDemoItems(NOW)) {
      if (item.dateStarted !== undefined) {
        expect(item.dateStarted >= item.dateAdded).toBe(true)
      }
      if (item.dateCompleted !== undefined) {
        expect(item.dateCompleted >= item.dateAdded).toBe(true)
      }
    }
  })

  it('marks every completed item with a completion date', () => {
    for (const item of createDemoItems(NOW)) {
      if (item.status === 'completed') {
        expect(item.dateCompleted).toBeDefined()
      }
    }
  })
})

describe('the demo backlog as a showcase', () => {
  const items = createDemoItems(NOW)

  it('covers every category, so "Start Next" has a pick in each', () => {
    const categories = new Set(items.map((item) => item.category))

    for (const { id } of CATEGORY_REGISTRY) {
      expect(categories).toContain(id)
    }
  })

  it('covers every status, so no badge or filter is left undemonstrated', () => {
    const statuses = new Set(items.map((item) => item.status))

    for (const status of STATUSES) {
      expect(statuses).toContain(status)
    }
  })

  it('lands the dashboard with all four sections populated', () => {
    const sections = getDashboardSections(items)

    expect(sections.continue.length).toBeGreaterThan(0)
    expect(sections.startNext).toHaveLength(CATEGORY_REGISTRY.length)
    expect(sections.recentlyFinished.length).toBeGreaterThan(0)
    expect(sections.recentlyAdded.length).toBeGreaterThan(0)
  })

  it('shows a live streak on the goals board rather than a dead one', () => {
    const board = getDailyGoalBoard(items, NOW)

    expect(board.totalCount).toBeGreaterThan(3)
    expect(board.metCount).toBeGreaterThan(0)
    // Not everything is done: a board that is entirely green has nothing
    // left to demonstrate about the check-in interaction.
    expect(board.allMet).toBe(false)
    expect(Math.max(...board.statuses.map((s) => s.currentStreak))).toBeGreaterThan(5)
  })

  it('includes a goal with no progress at all, and one only partly done today', () => {
    const board = getDailyGoalBoard(items, NOW)

    expect(board.statuses.some((s) => s.loggedToday === 0)).toBe(true)
    expect(
      board.statuses.some((s) => s.loggedToday > 0 && s.loggedToday < s.target),
    ).toBe(true)
  })

  it('has completions spread across months, not bunched into one day', () => {
    const stats = getGoalsStats(items, NOW)

    expect(stats.completedThisMonth).toBeGreaterThan(0)
    expect(stats.completedThisYear).toBeGreaterThan(stats.completedThisMonth)
    expect(stats.oldestUnfinishedItem?.title).toBe('Blame!')
  })

  it('includes an item carrying nothing but the required fields', () => {
    const sparse = items.find((item) => item.title === 'Blindsight')

    expect(sparse).toBeDefined()
    expect(sparse?.platform).toBeUndefined()
    expect(sparse?.notes).toBeUndefined()
    expect(sparse?.tags).toEqual([])
  })

  it('stays fresh as the clock moves rather than aging into a dead fixture', () => {
    const muchLater = new Date('2027-11-02T09:30:00.000Z')
    const later = createDemoItems(muchLater)
    const board = getDailyGoalBoard(later, muchLater)

    expect(Math.max(...board.statuses.map((s) => s.currentStreak))).toBeGreaterThan(5)
    expect(getGoalsStats(later, muchLater).completedThisMonth).toBeGreaterThan(0)
  })
})

describe('the demo backlog as a privacy boundary', () => {
  /**
   * This is the test that has to hold for the public deployment to be
   * safe. It is deliberately blunt: the fixture is invented data, and
   * nothing that looks like a real identity or a credential belongs in it.
   */
  it('contains nothing resembling personal or sensitive data', () => {
    const serialized = JSON.stringify(createDemoItems(NOW))

    const forbidden = [
      /[\w.+-]+@[\w-]+\.[\w.]+/, // email address
      /\b\d{3}[-.]\d{3}[-.]\d{4}\b/, // phone number
      /\bhttps?:\/\//i, // any outbound link
      /\b(?:password|passwd|secret|api[_-]?key|token|bearer)\b/i,
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    ]

    for (const pattern of forbidden) {
      expect(serialized).not.toMatch(pattern)
    }
  })
})
