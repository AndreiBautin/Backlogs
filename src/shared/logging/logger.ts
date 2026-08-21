import { meetsThreshold, type LogLevel } from './log-level'

/**
 * A structured log record. `context` is a flat bag of scalars — never an
 * `Item`, never free text a user typed. Keeping it scalar-only is what
 * makes it safe to leave logging enabled in the deployed build: the
 * console can say *that* three items were dropped during an import
 * without saying *what* was in them.
 */
export type LogContext = Record<string, string | number | boolean | null>

export interface LogRecord {
  readonly level: Exclude<LogLevel, 'silent'>
  readonly event: string
  readonly context: LogContext
}

export interface Logger {
  debug(event: string, context?: LogContext): void
  info(event: string, context?: LogContext): void
  warn(event: string, context?: LogContext): void
  error(event: string, context?: LogContext): void
}

/** The side-effecting sink a logger writes to. Swapped out in tests. */
export type LogSink = (record: LogRecord) => void

export const consoleSink: LogSink = ({ level, event, context }) => {
  const line = `[backlogs] ${event}`
  // Deliberately the only place in the app allowed to touch `console`.
  const write =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.info
  if (Object.keys(context).length === 0) {
    write(line)
  } else {
    write(line, context)
  }
}

export interface CreateLoggerOptions {
  /** Messages below this severity are dropped. */
  threshold: LogLevel
  sink?: LogSink
}

/**
 * Builds a logger that filters by severity before touching the sink.
 * Severity is a *configuration* concern rather than a build-time one, so
 * that a production build can be turned verbose by changing an
 * environment variable instead of shipping a new bundle.
 */
export function createLogger({
  threshold,
  sink = consoleSink,
}: CreateLoggerOptions): Logger {
  function emit(
    level: LogRecord['level'],
    event: string,
    context: LogContext = {},
  ): void {
    if (!meetsThreshold(level, threshold)) {
      return
    }
    sink({ level, event, context })
  }

  return {
    debug: (event, context) => {
      emit('debug', event, context)
    },
    info: (event, context) => {
      emit('info', event, context)
    },
    warn: (event, context) => {
      emit('warn', event, context)
    },
    error: (event, context) => {
      emit('error', event, context)
    },
  }
}
