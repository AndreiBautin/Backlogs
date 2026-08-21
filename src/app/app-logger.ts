import { appConfig } from '@/config/app-config'
import { createLogger } from '@/shared/logging/logger'

/**
 * The running app's logger, built once from configuration.
 *
 * Everything that logs takes a `Logger` as a parameter so it can be
 * tested against a fake sink; this singleton is only ever used as a
 * *default argument* at the composition root, never imported into a
 * module that could have had it injected instead.
 */
export const appLogger = createLogger({ threshold: appConfig.logLevel })
