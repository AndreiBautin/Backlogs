import { describe, expect, it } from 'vitest'

import { DomainValidationError } from '../errors/domain-validation-error'
import type { ItemId } from '../value-objects/item-id'
import { applyItemUpdate, createItem } from './item'

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
