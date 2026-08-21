import { useMutation } from '@tanstack/react-query'

import { useUseCases } from '@/app/use-cases-context'
import { useInvalidateItemQueries } from '@/features/items/hooks/use-items'

export function useResetDemoDataMutation() {
  const { resetDemoData } = useUseCases()
  const invalidate = useInvalidateItemQueries()

  return useMutation({
    mutationFn: () => resetDemoData(),
    onSuccess: invalidate,
  })
}
