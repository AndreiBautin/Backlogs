import { describe, expect, it } from 'vitest'

import { buildItem } from '@/test/builders/item-builder'

import { createItemEnvelope, parseItemEnvelope } from './item-envelope'

describe('createItemEnvelope / parseItemEnvelope', () => {
  it('round-trips a list of items with no warning', () => {
    const items = [buildItem(), buildItem({ category: 'books' })]

    const result = parseItemEnvelope(JSON.stringify(createItemEnvelope(items)))

    expect(result).toEqual({ items, warning: null, envelopeValid: true })
  })

  it('round-trips an empty list', () => {
    const result = parseItemEnvelope(JSON.stringify(createItemEnvelope([])))

    expect(result).toEqual({ items: [], warning: null, envelopeValid: true })
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
