import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

import { createAppUseCases, type AppUseCases } from './di'
import { UseCasesContext } from './use-cases-context'

interface AppProvidersProps {
  children: ReactNode
  /** Overridable for tests — an InMemoryItemRepository-backed AppUseCases avoids real localStorage. */
  useCases?: AppUseCases
}

export function AppProviders({ children, useCases }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient())
  const [resolvedUseCases] = useState(() => useCases ?? createAppUseCases())

  return (
    <QueryClientProvider client={queryClient}>
      <UseCasesContext.Provider value={resolvedUseCases}>
        {children}
      </UseCasesContext.Provider>
    </QueryClientProvider>
  )
}
