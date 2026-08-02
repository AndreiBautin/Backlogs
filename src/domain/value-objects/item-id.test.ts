import { describe, expect, it } from 'vitest'

import { createItemId, isItemId } from './item-id'

describe('createItemId', () => {
  it('returns a non-empty string', () => {
    const id = createItemId()

    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('returns a unique value on every call', () => {
    const first = createItemId()
    const second = createItemId()

    expect(first).not.toBe(second)
  })
})

describe('isItemId', () => {
  it('accepts a value produced by createItemId', () => {
    expect(isItemId(createItemId())).toBe(true)
  })

  it('rejects an empty string', () => {
    expect(isItemId('')).toBe(false)
  })

  it('rejects non-string values', () => {
    expect(isItemId(42)).toBe(false)
    expect(isItemId(undefined)).toBe(false)
    expect(isItemId(null)).toBe(false)
  })
})
