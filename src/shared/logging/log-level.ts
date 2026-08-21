/**
 * Log severities, ordered. Follows the same closed-value-set +
 * type-guard pattern as `Status`, `Priority`, and `Theme` in the domain,
 * so an environment variable can be validated the same way a user input is.
 */
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'silent'] as const

export type LogLevel = (typeof LOG_LEVELS)[number]

export function isLogLevel(value: string): value is LogLevel {
  return (LOG_LEVELS as readonly string[]).includes(value)
}

const SEVERITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
}

/** True when a message at `level` should be emitted by a logger set to `threshold`. */
export function meetsThreshold(level: LogLevel, threshold: LogLevel): boolean {
  return SEVERITY[level] >= SEVERITY[threshold]
}
