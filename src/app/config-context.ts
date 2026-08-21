import { createContext, useContext } from 'react'

import { appConfig, type AppConfig } from '@/config/app-config'

/**
 * Makes configuration a dependency of the component tree rather than a
 * module-level import. Components read `useAppConfig()`, so a test can
 * render the demo experience by passing a demo config — no `vi.stubEnv`,
 * no rebuilding, no global mutation between tests.
 */
export const AppConfigContext = createContext<AppConfig>(appConfig)

export function useAppConfig(): AppConfig {
  return useContext(AppConfigContext)
}
