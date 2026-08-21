import { describe, expect, it } from 'vitest'

import { APP_MODES } from './app-config'
import { getStorageKeys } from './storage-keys'

describe('getStorageKeys', () => {
  /**
   * A regression guard with real stakes: renaming these keys would orphan
   * every backlog already saved in someone's browser. They are frozen, and
   * this test is the reason a future refactor has to say so out loud.
   */
  it('keeps the personal keys at the values existing backlogs are stored under', () => {
    expect(getStorageKeys('personal')).toEqual({
      items: 'backlogs:items:v1',
      settings: 'backlogs:settings:v1',
    })
  })

  it('gives demo mode a separate namespace', () => {
    expect(getStorageKeys('demo')).toEqual({
      items: 'backlogs:demo:items:v1',
      settings: 'backlogs:demo:settings:v1',
    })
  })

  it('never reuses a key across modes', () => {
    const allKeys = APP_MODES.flatMap((mode) => {
      const keys = getStorageKeys(mode)
      return [keys.items, keys.settings]
    })

    expect(new Set(allKeys).size).toBe(allKeys.length)
  })
})
