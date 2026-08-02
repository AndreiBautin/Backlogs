import { describe, expect, it, vi } from 'vitest'

import { buildItem } from '@/test/builders/item-builder'

import { deserializeItems, serializeItems } from './serialization'

describe('serializeItems / deserializeItems', () => {
  it('round-trips a list of items', () => {
    const items = [buildItem(), buildItem({ category: 'books' })]

    const restored = deserializeItems(serializeItems(items))

    expect(restored).toEqual(items)
  })

  it('returns an empty array when nothing has been stored yet', () => {
    expect(deserializeItems(null)).toEqual([])
  })

  it('recovers from invalid JSON instead of throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    expect(deserializeItems('{not valid json')).toEqual([])
    expect(warn).toHaveBeenCalled()

    warn.mockRestore()
  })

  it('recovers from well-formed JSON that is not a valid item envelope', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    expect(deserializeItems(JSON.stringify({ some: 'other shape' }))).toEqual([])
    expect(warn).toHaveBeenCalled()

    warn.mockRestore()
  })

  it('drops individual malformed items but keeps the well-formed ones', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const good = buildItem()
    const raw = JSON.stringify({
      version: 1,
      items: [good, { id: 'missing-fields' }],
    })

    expect(deserializeItems(raw)).toEqual([good])
    expect(warn).toHaveBeenCalled()

    warn.mockRestore()
  })
})
