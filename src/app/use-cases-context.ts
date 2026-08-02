import { createContext, useContext } from 'react'

import type { AppUseCases } from './di'

export const UseCasesContext = createContext<AppUseCases | null>(null)

export function useUseCases(): AppUseCases {
  const useCases = useContext(UseCasesContext)
  if (!useCases) {
    throw new Error('useUseCases must be used within an AppProviders tree')
  }
  return useCases
}
