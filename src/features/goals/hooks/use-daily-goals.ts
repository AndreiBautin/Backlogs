import { useMutation, useQuery } from '@tanstack/react-query'

import { useUseCases } from '@/app/use-cases-context'
import type { LogDailyProgressInput } from '@/domain/entities/item'
import type { ItemId } from '@/domain/value-objects/item-id'
import {
  dailyGoalsQueryKey,
  useInvalidateItemQueries,
} from '@/features/items/hooks/use-items'

/**
 * "Today" is resolved when the query runs, so a session left open across
 * midnight keeps showing the old day until something refetches — which
 * TanStack Query's refetch-on-focus already does the moment the tab is used.
 */
export function useDailyGoalsQuery() {
  const { getDailyGoals } = useUseCases()
  return useQuery({ queryKey: dailyGoalsQueryKey, queryFn: () => getDailyGoals() })
}

export interface LogDailyProgressArgs {
  id: ItemId
  delta?: LogDailyProgressInput['delta']
}

export function useLogDailyProgressMutation() {
  const { logDailyProgress } = useUseCases()
  const invalidate = useInvalidateItemQueries()

  return useMutation({
    mutationFn: ({ id, delta }: LogDailyProgressArgs) =>
      logDailyProgress(id, delta === undefined ? {} : { delta }),
    onSuccess: invalidate,
  })
}
