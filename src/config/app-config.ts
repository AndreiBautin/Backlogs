import { isLogLevel, type LogLevel } from '@/shared/logging/log-level'

/**
 * Which dataset the app is running against.
 *
 * - `personal` — the owner's own backlog. The default everywhere.
 * - `demo` — the public deployment: seeded with invented data on first
 *   visit, stored under its own keys, and resettable from the UI.
 *
 * This is the *only* switch that distinguishes the public build from the
 * private one, which is what makes "could my real data ever reach the
 * demo?" a question with a one-line answer.
 */
export const APP_MODES = ['personal', 'demo'] as const

export type AppMode = (typeof APP_MODES)[number]

export function isAppMode(value: string): value is AppMode {
  return (APP_MODES as readonly string[]).includes(value)
}

export interface BuildInfo {
  /** Package version, or `dev` for a local build. */
  readonly version: string
  /** Short commit SHA, or `local`. */
  readonly commit: string
  /** ISO timestamp the bundle was built at, or `unknown`. */
  readonly builtAt: string
}

export interface AppConfig {
  readonly mode: AppMode
  readonly isDemo: boolean
  readonly isProduction: boolean
  /** Path the app is served under, e.g. `/` or `/Backlogs/`. Always ends in `/`. */
  readonly basePath: string
  /** Router basename — `basePath` without its trailing slash (`''` at the root). */
  readonly routerBasename: string
  readonly logLevel: LogLevel
  readonly build: BuildInfo
  /**
   * Problems found while reading the environment. Bad configuration
   * degrades to a documented default and is reported here rather than
   * throwing — the same "never crash on bad input" rule the storage
   * layer follows.
   */
  readonly warnings: readonly string[]
}

/** The subset of `import.meta.env` this app reads. */
export interface RawEnv {
  readonly PROD?: boolean
  readonly BASE_URL?: string
  readonly VITE_APP_MODE?: string
  readonly VITE_LOG_LEVEL?: string
  readonly VITE_APP_VERSION?: string
  readonly VITE_COMMIT_SHA?: string
  readonly VITE_BUILT_AT?: string
}

function normalizeBasePath(raw: string | undefined): string {
  const value = raw?.trim()
  if (value === undefined || value.length === 0) {
    return '/'
  }
  const withLeading = value.startsWith('/') ? value : `/${value}`
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`
}

/**
 * Reads configuration out of a plain environment bag. Pure and
 * total — it takes any input and always returns a usable config, so it
 * can be unit-tested without a build, a browser, or a `vi.stubEnv`.
 */
export function readAppConfig(env: RawEnv): AppConfig {
  const warnings: string[] = []
  const isProduction = env.PROD === true

  const rawMode = env.VITE_APP_MODE?.trim()
  let mode: AppMode = 'personal'
  if (rawMode !== undefined && rawMode.length > 0) {
    if (isAppMode(rawMode)) {
      mode = rawMode
    } else {
      warnings.push(`Unknown VITE_APP_MODE "${rawMode}" — falling back to "personal"`)
    }
  }

  const rawLogLevel = env.VITE_LOG_LEVEL?.trim()
  let logLevel: LogLevel = isProduction ? 'warn' : 'debug'
  if (rawLogLevel !== undefined && rawLogLevel.length > 0) {
    if (isLogLevel(rawLogLevel)) {
      logLevel = rawLogLevel
    } else {
      warnings.push(
        `Unknown VITE_LOG_LEVEL "${rawLogLevel}" — falling back to "${logLevel}"`,
      )
    }
  }

  const basePath = normalizeBasePath(env.BASE_URL)

  return {
    mode,
    isDemo: mode === 'demo',
    isProduction,
    basePath,
    routerBasename: basePath === '/' ? '' : basePath.slice(0, -1),
    logLevel,
    build: {
      version: env.VITE_APP_VERSION?.trim() ?? 'dev',
      commit: env.VITE_COMMIT_SHA?.trim() ?? 'local',
      builtAt: env.VITE_BUILT_AT?.trim() ?? 'unknown',
    },
    warnings,
  }
}

/** The configuration this running instance was built with. */
export const appConfig: AppConfig = readAppConfig(import.meta.env)
