import { describe, expect, it } from 'vitest'

import { buildItem } from '@/test/builders/item-builder'

import { createItemEnvelope, parseItemEnvelope } from './item-envelope'

describe('createItemEnvelope / parseItemEnvelope', () => {
  it('round-trips a list of items with no warning', () => {
    const items = [buildItem(), buildItem({ category: 'books' })]

    const result = parseItemEnvelope(JSON.stringify(createItemEnvelope(items)))

    expect(result).toEqual({ items, warning: null })
  })

  it('round-trips an empty list', () => {
    const result = parseItemEnvelope(JSON.stringify(createItemEnvelope([])))

    expect(result).toEqual({ items: [], warning: null })
  })

  it('reports a warning instead of throwing on invalid JSON', () => {
    const result = parseItemEnvelope('{not valid json')

    expect(result.items).toEqual([])
    expect(result.warning).not.toBeNull()
  })

  it('reports a warning for well-formed JSON that is not an item envelope', () => {
    const result = parseItemEnvelope(JSON.stringify({ some: 'other shape' }))

    expect(result.items).toEqual([])
    expect(result.warning).not.toBeNull()
  })

  it('drops individual malformed items but keeps the well-formed ones, with a warning', () => {
    const good = buildItem()
    const raw = JSON.stringify({
      version: 1,
      items: [good, { id: 'missing-fields' }],
    })

    const result = parseItemEnvelope(raw)

    expect(result.items).toEqual([good])
    expect(result.warning).not.toBeNull()
  })
})
