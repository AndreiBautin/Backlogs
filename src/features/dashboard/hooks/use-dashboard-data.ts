import { useQuery } from '@tanstack/react-query'

import { useUseCases } from '@/app/use-cases-context'
import { dashboardQueryKey } from '@/features/items/hooks/use-items'

export function useDashboardDataQuery() {
  const { getDashboardData } = useUseCases()
  return useQuery({ queryKey: dashboardQueryKey, queryFn: () => getDashboardData() })
}
