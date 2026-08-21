import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

import { appConfig, type AppConfig } from '@/config/app-config'
import { DemoBootstrap } from '@/features/demo/DemoBootstrap'

import { AppConfigContext } from './config-context'
import { createAppUseCases, type AppUseCases } from './di'
import { UseCasesContext } from './use-cases-context'

interface AppProvidersProps {
  children: ReactNode
  /** Overridable for tests — an InMemoryItemRepository-backed AppUseCases avoids real localStorage. */
  useCases?: AppUseCases
  /** Overridable for tests — lets a test render the demo experience directly. */
  config?: AppConfig
}

export function AppProviders({ children, useCases, config }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient())
  const [resolvedUseCases] = useState(() => useCases ?? createAppUseCases())
  const resolvedConfig = config ?? appConfig

  return (
    <QueryClientProvider client={queryClient}>
      <AppConfigContext.Provider value={resolvedConfig}>
        <UseCasesContext.Provider value={resolvedUseCases}>
          <DemoBootstrap>{children}</DemoBootstrap>
        </UseCasesContext.Provider>
      </AppConfigContext.Provider>
    </QueryClientProvider>
  )
}
