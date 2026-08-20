import { describe, expect, it } from 'vitest'

import { DomainValidationError } from '../errors/domain-validation-error'
import type { ItemId } from '../value-objects/item-id'
import { toDateKey } from './daily-goal'
import { applyItemUpdate, createItem, logDailyProgress } from './item'

const FIXED_NOW = new Date('2026-03-01T12:00:00.000Z')
const FIXED_ID = 'fixed-id' as ItemId
const deps = { now: () => FIXED_NOW, generateId: () => FIXED_ID }

describe('createItem', () => {
  it('creates an item with sensible defaults', () => {
    const item = createItem({ title: 'Baldur’s Gate 3', category: 'games' }, deps)

    expect(item).toMatchObject({
      id: 'fixed-id',
      title: 'Baldur’s Gate 3',
      category: 'games',
      status: 'backlog',
      priority: 'medium',
      favorite: false,
      tags: [],
      dateAdded: FIXED_NOW.toISOString(),
      lastUpdated: FIXED_NOW.toISOString(),
    })
  })

  it('honors explicitly provided optional fields', () => {
    const item = createItem(
      {
        title: 'Fullmetal Alchemist',
        category: 'anime',
        status: 'wishlist',
        priority: 'high',
        platform: 'Crunchyroll',
        favorite: true,
        tags: ['shonen', 'classic'],
      },
      deps,
    )

    expect(item.status).toBe('wishlist')
    expect(item.priority).toBe('high')
    expect(item.platform).toBe('Crunchyroll')
    expect(item.favorite).toBe(true)
    expect(item.tags).toEqual(['shonen', 'classic'])
  })

  it('rejects a blank title', () => {
    expect(() => createItem({ title: '   ', category: 'games' }, deps)).toThrow(
      DomainValidationError,
    )
  })

  it('rejects an unknown category', () => {
    expect(() =>
      createItem({ title: 'Valid title', category: 'not-a-category' }, deps),
    ).toThrow(DomainValidationError)
  })

  it('trims the title', () => {
    const item = createItem({ title: '  Hades 2  ', category: 'games' }, deps)

    expect(item.title).toBe('Hades 2')
  })
})

describe('applyItemUpdate', () => {
  const base = createItem({ title: 'Dune', category: 'books' }, deps)

  it('merges changes and bumps lastUpdated', () => {
    const later = new Date('2026-03-05T09:00:00.000Z')
    const updated = applyItemUpdate(base, { priority: 'high' }, { now: () => later })

    expect(updated.priority).toBe('high')
    expect(updated.lastUpdated).toBe(later.toISOString())
    expect(updated.dateAdded).toBe(base.dateAdded)
  })

  it('auto-stamps dateStarted when status moves to currently-using', () => {
    const later = new Date('2026-03-05T09:00:00.000Z')
    const updated = applyItemUpdate(
      base,
      { status: 'currently-using' },
      { now: () => later },
    )

    expect(updated.dateStarted).toBe(later.toISOString())
  })

  it('does not overwrite an existing dateStarted', () => {
    const started = applyItemUpdate(
      base,
      { status: 'currently-using' },
      { now: () => new Date('2026-03-02T00:00:00.000Z') },
    )
    const later = new Date('2026-03-06T00:00:00.000Z')

    const updated = applyItemUpdate(started, { priority: 'high' }, { now: () => later })

    expect(updated.dateStarted).toBe(started.dateStarted)
  })

  it('auto-stamps dateCompleted when status moves to completed', () => {
    const later = new Date('2026-03-10T00:00:00.000Z')
    const updated = applyItemUpdate(base, { status: 'completed' }, { now: () => later })

    expect(updated.dateCompleted).toBe(later.toISOString())
  })

  it('rejects clearing the title to blank', () => {
    expect(() => applyItemUpdate(base, { title: '  ' }, deps)).toThrow(
      DomainValidationError,
    )
  })
})

describe('daily goals on an item', () => {
  const base = createItem({ title: 'The Way of Kings', category: 'books' }, deps)

  it('starts with an empty progress log and no goal', () => {
    expect(base.dailyGoal).toBeUndefined()
    expect(base.dailyProgress).toEqual([])
  })

  it('accepts a daily goal at creation time', () => {
    const item = createItem(
      {
        title: 'Severance',
        category: 'tv-shows',
        dailyGoal: { amount: 2, unit: 'episode' },
      },
      deps,
    )

    expect(item.dailyGoal).toEqual({ amount: 2, unit: 'episode' })
  })

  it('sets a daily goal through an update', () => {
    const updated = applyItemUpdate(
      base,
      { dailyGoal: { amount: 1, unit: 'chapter' } },
      deps,
    )

    expect(updated.dailyGoal).toEqual({ amount: 1, unit: 'chapter' })
  })

  it('clears a daily goal when passed null', () => {
    const withGoal = applyItemUpdate(
      base,
      { dailyGoal: { amount: 1, unit: 'chapter' } },
      deps,
    )

    const cleared = applyItemUpdate(withGoal, { dailyGoal: null }, deps)

    expect(cleared.dailyGoal).toBeUndefined()
    expect('dailyGoal' in cleared).toBe(false)
  })

  it('leaves an existing goal untouched by an unrelated update', () => {
    const withGoal = applyItemUpdate(
      base,
      { dailyGoal: { amount: 1, unit: 'chapter' } },
      deps,
    )

    const renamed = applyItemUpdate(withGoal, { title: 'Words of Radiance' }, deps)

    expect(renamed.dailyGoal).toEqual({ amount: 1, unit: 'chapter' })
  })

  it('rejects an invalid goal', () => {
    expect(() =>
      applyItemUpdate(base, { dailyGoal: { amount: 0, unit: 'chapter' } }, deps),
    ).toThrow(DomainValidationError)
  })
})

describe('logDailyProgress', () => {
  const goalItem = createItem(
    {
      title: 'The Way of Kings',
      category: 'books',
      dailyGoal: { amount: 2, unit: 'chapter' },
    },
    deps,
  )
  const today = new Date(2026, 7, 19, 9, 0)

  it('logs one unit of progress against today by default', () => {
    const logged = logDailyProgress(goalItem, { on: today }, deps)

    expect(logged.dailyProgress).toEqual([{ date: '2026-08-19', amount: 1 }])
  })

  it('accumulates repeated logs on the same day', () => {
    const once = logDailyProgress(goalItem, { on: today }, deps)

    const twice = logDailyProgress(once, { on: today }, deps)

    expect(twice.dailyProgress).toEqual([{ date: '2026-08-19', amount: 2 }])
  })

  it('undoes progress with a negative delta', () => {
    const once = logDailyProgress(goalItem, { on: today }, deps)

    const undone = logDailyProgress(once, { on: today, delta: -1 }, deps)

    expect(undone.dailyProgress).toEqual([])
  })

  it('bumps lastUpdated so the item resurfaces as recently touched', () => {
    const later = new Date('2026-08-19T15:00:00.000Z')

    const logged = logDailyProgress(goalItem, { on: today }, { now: () => later })

    expect(logged.lastUpdated).toBe(later.toISOString())
  })

  it('defaults to the current day when no date is given', () => {
    const now = new Date()

    const logged = logDailyProgress(goalItem, {}, { now: () => now })

    expect(logged.dailyProgress).toEqual([{ date: toDateKey(now), amount: 1 }])
  })

  it('refuses to log against an item that has no daily goal', () => {
    const withoutGoal = createItem({ title: 'Hades II', category: 'games' }, deps)

    expect(() => logDailyProgress(withoutGoal, { on: today }, deps)).toThrow(
      DomainValidationError,
    )
  })
})
