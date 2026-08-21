import { describe, expect, it } from 'vitest'

import { readAppConfig } from './app-config'

describe('readAppConfig', () => {
  it('defaults to personal mode when nothing is configured', () => {
    const config = readAppConfig({})

    expect(config.mode).toBe('personal')
    expect(config.isDemo).toBe(false)
    expect(config.warnings).toEqual([])
  })

  it('reads demo mode', () => {
    const config = readAppConfig({ VITE_APP_MODE: 'demo' })

    expect(config.mode).toBe('demo')
    expect(config.isDemo).toBe(true)
  })

  // The safety-critical direction: a typo must never accidentally *enable*
  // demo mode, and must never take the app down either.
  it('falls back to personal mode and warns on an unknown mode', () => {
    const config = readAppConfig({ VITE_APP_MODE: 'DEMO_MODE_PLEASE' })

    expect(config.mode).toBe('personal')
    expect(config.warnings).toHaveLength(1)
    expect(config.warnings[0]).toContain('VITE_APP_MODE')
  })

  it('ignores a blank mode rather than treating it as unknown', () => {
    const config = readAppConfig({ VITE_APP_MODE: '   ' })

    expect(config.mode).toBe('personal')
    expect(config.warnings).toEqual([])
  })

  it('is quieter by default in production than in development', () => {
    expect(readAppConfig({ PROD: true }).logLevel).toBe('warn')
    expect(readAppConfig({ PROD: false }).logLevel).toBe('debug')
  })

  it('lets an explicit log level override the per-environment default', () => {
    expect(readAppConfig({ PROD: true, VITE_LOG_LEVEL: 'debug' }).logLevel).toBe('debug')
  })

  it('falls back and warns on an unknown log level', () => {
    const config = readAppConfig({ PROD: true, VITE_LOG_LEVEL: 'chatty' })

    expect(config.logLevel).toBe('warn')
    expect(config.warnings[0]).toContain('VITE_LOG_LEVEL')
  })

  describe('base path', () => {
    it('defaults to the root', () => {
      const config = readAppConfig({})

      expect(config.basePath).toBe('/')
      expect(config.routerBasename).toBe('')
    })

    it('derives the router basename from the base path', () => {
      const config = readAppConfig({ BASE_URL: '/Backlogs/' })

      expect(config.basePath).toBe('/Backlogs/')
      expect(config.routerBasename).toBe('/Backlogs')
    })

    // Vite is lenient about how `base` is written; the router is not. The
    // normalization is what keeps the two from disagreeing about where the
    // app lives, which is the failure that 404s every route on a project page.
    it.each([
      ['Backlogs', '/Backlogs/'],
      ['/Backlogs', '/Backlogs/'],
      ['Backlogs/', '/Backlogs/'],
      ['/Backlogs/', '/Backlogs/'],
    ])('normalizes %s to %s', (input, expected) => {
      expect(readAppConfig({ BASE_URL: input }).basePath).toBe(expected)
    })

    it('treats an empty base as the root', () => {
      expect(readAppConfig({ BASE_URL: '' }).basePath).toBe('/')
    })
  })

  describe('build info', () => {
    it('marks a local build as such', () => {
      const config = readAppConfig({})

      expect(config.build).toEqual({
        version: 'dev',
        commit: 'local',
        builtAt: 'unknown',
      })
    })

    it('passes CI-supplied metadata through', () => {
      const config = readAppConfig({
        VITE_APP_VERSION: '1.0.0',
        VITE_COMMIT_SHA: 'abc1234',
        VITE_BUILT_AT: '2026-08-20T00:00:00.000Z',
      })

      expect(config.build).toEqual({
        version: '1.0.0',
        commit: 'abc1234',
        builtAt: '2026-08-20T00:00:00.000Z',
      })
    })
  })
})
