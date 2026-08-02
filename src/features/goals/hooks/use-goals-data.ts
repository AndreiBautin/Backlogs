import { useQuery } from '@tanstack/react-query'

import { useUseCases } from '@/app/use-cases-context'
import { goalsQueryKey } from '@/features/items/hooks/use-items'

export function useGoalsDataQuery() {
  const { getGoalsData } = useUseCases()
  return useQuery({ queryKey: goalsQueryKey, queryFn: () => getGoalsData() })
}
