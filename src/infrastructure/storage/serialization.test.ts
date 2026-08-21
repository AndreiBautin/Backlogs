import { describe, expect, it } from 'vitest'

import { buildItem } from '@/test/builders/item-builder'
import { createTestLogger } from '@/test/test-logger'

import { deserializeItems, serializeItems } from './serialization'

describe('serializeItems / deserializeItems', () => {
  it('round-trips a list of items', () => {
    const { logger } = createTestLogger()
    const items = [buildItem(), buildItem({ category: 'books' })]

    const restored = deserializeItems(serializeItems(items), logger)

    expect(restored).toEqual(items)
  })

  it('returns an empty array when nothing has been stored yet', () => {
    const { logger, records } = createTestLogger()

    expect(deserializeItems(null, logger)).toEqual([])
    expect(records).toHaveLength(0)
  })

  it('recovers from invalid JSON instead of throwing', () => {
    const { logger, events } = createTestLogger()

    expect(deserializeItems('{not valid json', logger)).toEqual([])
    expect(events()).toContain('storage.items.corrupted')
  })

  it('recovers from well-formed JSON that is not a valid item envelope', () => {
    const { logger, events } = createTestLogger()

    expect(deserializeItems(JSON.stringify({ some: 'other shape' }), logger)).toEqual([])
    expect(events()).toContain('storage.items.corrupted')
  })

  it('drops individual malformed items but keeps the well-formed ones', () => {
    const { logger, records } = createTestLogger()
    const good = buildItem()
    const raw = JSON.stringify({
      version: 1,
      items: [good, { id: 'missing-fields' }],
    })

    expect(deserializeItems(raw, logger)).toEqual([good])
    expect(records[0]?.event).toBe('storage.items.corrupted')
    expect(records[0]?.context.dropped).toBe(1)
  })

  it('logs a reason code and a count, never the stored content', () => {
    const { logger, records } = createTestLogger()
    const raw = JSON.stringify({
      version: 1,
      items: [{ id: 'x', title: 'A private reading habit' }],
    })

    deserializeItems(raw, logger)

    const serialized = JSON.stringify(records)
    expect(serialized).not.toContain('A private reading habit')
  })
})
