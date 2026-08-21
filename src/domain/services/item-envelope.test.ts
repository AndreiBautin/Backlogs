import { describe, expect, it } from 'vitest'

import { buildItem } from '@/test/builders/item-builder'

import { createItemEnvelope, parseItemEnvelope } from './item-envelope'

describe('createItemEnvelope / parseItemEnvelope', () => {
  it('round-trips a list of items with no warning', () => {
    const items = [buildItem(), buildItem({ category: 'books' })]

    const result = parseItemEnvelope(JSON.stringify(createItemEnvelope(items)))

    expect(result).toEqual({ items, warning: null, droppedCount: 0, envelopeValid: true })
  })

  it('round-trips an empty list', () => {
    const result = parseItemEnvelope(JSON.stringify(createItemEnvelope([])))

    expect(result).toEqual({
      items: [],
      warning: null,
      droppedCount: 0,
      envelopeValid: true,
    })
  })

  it('reports a warning instead of throwing on invalid JSON, and marks the envelope invalid', () => {
    const result = parseItemEnvelope('{not valid json')

    expect(result.items).toEqual([])
    expect(result.warning).not.toBeNull()
    expect(result.envelopeValid).toBe(false)
  })

  it('reports a warning for well-formed JSON that is not an item envelope, and marks it invalid', () => {
    const result = parseItemEnvelope(JSON.stringify({ some: 'other shape' }))

    expect(result.items).toEqual([])
    expect(result.warning).not.toBeNull()
    expect(result.envelopeValid).toBe(false)
  })

  it('drops individual malformed items but keeps the well-formed ones, marking the envelope valid', () => {
    const good = buildItem()
    const raw = JSON.stringify({
      version: 1,
      items: [good, { id: 'missing-fields' }],
    })

    const result = parseItemEnvelope(raw)

    expect(result.items).toEqual([good])
    expect(result.warning).not.toBeNull()
    expect(result.envelopeValid).toBe(true)
  })
})

describe('parseItemEnvelope daily-goal normalization', () => {
  /** Backlogs saved before daily goals existed have neither field. */
  function legacyRaw(overrides: Record<string, unknown> = {}): string {
    const { dailyProgress, dailyGoal, ...legacyItem } = buildItem()
    void dailyProgress
    void dailyGoal
    return JSON.stringify({ version: 1, items: [{ ...legacyItem, ...overrides }] })
  }

  it('gives an item saved before daily goals an empty progress log', () => {
    const { items, warning } = parseItemEnvelope(legacyRaw())

    expect(items[0]?.dailyProgress).toEqual([])
    expect(warning).toBeNull()
  })

  it('keeps a well-formed daily goal and its progress log', () => {
    const raw = legacyRaw({
      dailyGoal: { amount: 2, unit: 'episode' },
      dailyProgress: [{ date: '2026-08-19', amount: 2 }],
    })

    const { items } = parseItemEnvelope(raw)

    expect(items[0]).toMatchObject({
      dailyGoal: { amount: 2, unit: 'episode' },
      dailyProgress: [{ date: '2026-08-19', amount: 2 }],
    })
  })

  it('drops a malformed daily goal rather than the whole item', () => {
    const { items } = parseItemEnvelope(legacyRaw({ dailyGoal: { amount: 0 } }))

    expect(items).toHaveLength(1)
    expect(items[0]?.dailyGoal).toBeUndefined()
  })

  it('drops only the malformed entries from a progress log', () => {
    const raw = legacyRaw({
      dailyGoal: { amount: 1, unit: 'chapter' },
      dailyProgress: [
        { date: 'yesterday', amount: 1 },
        { date: '2026-08-19', amount: 1 },
      ],
    })

    const { items } = parseItemEnvelope(raw)

    expect(items[0]?.dailyProgress).toEqual([{ date: '2026-08-19', amount: 1 }])
  })

  it('recovers from a progress log that is not an array', () => {
    const { items } = parseItemEnvelope(legacyRaw({ dailyProgress: 'nope' }))

    expect(items[0]?.dailyProgress).toEqual([])
  })
})
