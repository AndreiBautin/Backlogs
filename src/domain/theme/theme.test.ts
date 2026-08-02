import { describe, expect, it } from 'vitest'

import { isTheme, THEME_LABELS, THEMES } from './theme'

describe('THEME_LABELS', () => {
  it('has exactly one label per theme with no typos or gaps', () => {
    expect(Object.keys(THEME_LABELS).sort()).toEqual([...THEMES].sort())
  })
})

describe('isTheme', () => {
  it('accepts every registered theme', () => {
    for (const theme of THEMES) {
      expect(isTheme(theme)).toBe(true)
    }
  })

  it('rejects an unknown string', () => {
    expect(isTheme('solarized')).toBe(false)
  })
})
