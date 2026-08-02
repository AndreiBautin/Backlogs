import { describe, expect, it } from 'vitest'

import { DomainValidationError } from '../errors/domain-validation-error'
import { applySettingsChanges, DEFAULT_SETTINGS } from './settings'

describe('DEFAULT_SETTINGS', () => {
  it('is a fully valid, sensible starting point', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      theme: 'dark',
      defaultSort: 'recently-added',
      defaultCategory: 'games',
      defaultStatus: 'backlog',
    })
  })
})

describe('applySettingsChanges', () => {
  it('merges a single change and leaves the rest untouched', () => {
    const updated = applySettingsChanges(DEFAULT_SETTINGS, { theme: 'light' })

    expect(updated.theme).toBe('light')
    expect(updated.defaultSort).toBe(DEFAULT_SETTINGS.defaultSort)
  })

  it('applies changes to every field at once', () => {
    const updated = applySettingsChanges(DEFAULT_SETTINGS, {
      theme: 'light',
      defaultSort: 'alphabetical',
      defaultCategory: 'books',
      defaultStatus: 'wishlist',
    })

    expect(updated).toEqual({
      theme: 'light',
      defaultSort: 'alphabetical',
      defaultCategory: 'books',
      defaultStatus: 'wishlist',
    })
  })

  it('rejects an unknown theme', () => {
    expect(() => applySettingsChanges(DEFAULT_SETTINGS, { theme: 'neon' })).toThrow(
      DomainValidationError,
    )
  })

  it('rejects an unknown sort key', () => {
    expect(() =>
      applySettingsChanges(DEFAULT_SETTINGS, { defaultSort: 'not-a-sort' }),
    ).toThrow(DomainValidationError)
  })

  it('rejects an unknown category', () => {
    expect(() =>
      applySettingsChanges(DEFAULT_SETTINGS, { defaultCategory: 'not-a-category' }),
    ).toThrow(DomainValidationError)
  })

  it('rejects an unknown status', () => {
    expect(() =>
      applySettingsChanges(DEFAULT_SETTINGS, { defaultStatus: 'not-a-status' }),
    ).toThrow(DomainValidationError)
  })
})
