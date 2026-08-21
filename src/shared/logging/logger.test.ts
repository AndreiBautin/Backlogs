import { describe, expect, it, vi } from 'vitest'

import { isLogLevel, LOG_LEVELS, meetsThreshold } from './log-level'
import { createLogger, type LogRecord } from './logger'

describe('log levels', () => {
  it('recognizes every declared level', () => {
    for (const level of LOG_LEVELS) {
      expect(isLogLevel(level)).toBe(true)
    }
  })

  it('rejects anything else', () => {
    expect(isLogLevel('verbose')).toBe(false)
    expect(isLogLevel('')).toBe(false)
    expect(isLogLevel('WARN')).toBe(false)
  })

  it('orders severities so a threshold admits itself and everything above it', () => {
    expect(meetsThreshold('warn', 'debug')).toBe(true)
    expect(meetsThreshold('warn', 'warn')).toBe(true)
    expect(meetsThreshold('warn', 'error')).toBe(false)
  })

  it('drops everything at the silent threshold', () => {
    expect(meetsThreshold('error', 'silent')).toBe(false)
  })
})

function collectingLogger(threshold: Parameters<typeof createLogger>[0]['threshold']) {
  const records: LogRecord[] = []
  const logger = createLogger({
    threshold,
    sink: (record) => {
      records.push(record)
    },
  })
  return { logger, records }
}

describe('createLogger', () => {
  it('emits an event name and its context', () => {
    const { logger, records } = collectingLogger('debug')

    logger.warn('storage.items.corrupted', { reason: 'Invalid JSON', dropped: 3 })

    expect(records).toEqual([
      {
        level: 'warn',
        event: 'storage.items.corrupted',
        context: { reason: 'Invalid JSON', dropped: 3 },
      },
    ])
  })

  it('defaults the context to an empty object', () => {
    const { logger, records } = collectingLogger('debug')

    logger.info('app.start')

    expect(records[0]?.context).toEqual({})
  })

  it('filters out anything below the threshold', () => {
    const { logger, records } = collectingLogger('warn')

    logger.debug('a')
    logger.info('b')
    logger.warn('c')
    logger.error('d')

    expect(records.map((record) => record.event)).toEqual(['c', 'd'])
  })

  it('emits nothing at all when silenced', () => {
    const { logger, records } = collectingLogger('silent')

    logger.error('boom')

    expect(records).toEqual([])
  })

  it('writes errors to console.error and warnings to console.warn', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const logger = createLogger({ threshold: 'debug' })

    logger.error('ui.render-failed', { name: 'TypeError' })
    logger.warn('storage.items.corrupted')

    expect(error).toHaveBeenCalledWith('[backlogs] ui.render-failed', {
      name: 'TypeError',
    })
    expect(warn).toHaveBeenCalledWith('[backlogs] storage.items.corrupted')

    error.mockRestore()
    warn.mockRestore()
  })
})
