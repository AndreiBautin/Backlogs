import { createLogger, type LogRecord, type Logger } from '@/shared/logging/logger'

export interface TestLogger {
  readonly logger: Logger
  /** Every record the logger emitted, oldest first. */
  readonly records: LogRecord[]
  /** Convenience for the common assertion: were any of these events logged? */
  readonly events: () => string[]
}

/**
 * A logger that records instead of printing. Tests assert on *events*
 * (`storage.items.corrupted`) rather than on message strings, so wording
 * can change without breaking a test.
 */
export function createTestLogger(): TestLogger {
  const records: LogRecord[] = []
  const logger = createLogger({
    threshold: 'debug',
    sink: (record) => {
      records.push(record)
    },
  })

  return {
    logger,
    records,
    events: () => records.map((record) => record.event),
  }
}
