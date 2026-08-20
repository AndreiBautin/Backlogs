import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useUseCases } from '@/app/use-cases-context'
import type { ListItemsOptions } from '@/application/use-cases/items/list-items'
import type { CreateItemInput, ItemChanges } from '@/domain/entities/item'
import type { ItemId } from '@/domain/value-objects/item-id'

export const itemsQueryKey = ['items'] as const
export const dashboardQueryKey = ['dashboard'] as const
export const goalsQueryKey = ['goals'] as const
export const dailyGoalsQueryKey = ['daily-goals'] as const

export function useItemsQuery(options: ListItemsOptions = {}) {
  const { listItems } = useUseCases()
  return useQuery({
    queryKey: [...itemsQueryKey, options],
    queryFn: () => listItems(options),
  })
}

/** Every query that a change to an item can invalidate — shared by all item mutations. */
export function useInvalidateItemQueries() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: itemsQueryKey })
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKey })
    void queryClient.invalidateQueries({ queryKey: goalsQueryKey })
    void queryClient.invalidateQueries({ queryKey: dailyGoalsQueryKey })
  }
}

export function useCreateItemMutation() {
  const { createItem } = useUseCases()
  const invalidate = useInvalidateItemQueries()

  return useMutation({
    mutationFn: (input: CreateItemInput) => createItem(input),
    onSuccess: invalidate,
  })
}

export interface UpdateItemArgs {
  id: ItemId
  changes: ItemChanges
}

export function useUpdateItemMutation() {
  const { updateItem } = useUseCases()
  const invalidate = useInvalidateItemQueries()

  return useMutation({
    mutationFn: ({ id, changes }: UpdateItemArgs) => updateItem(id, changes),
    onSuccess: invalidate,
  })
}

export function useExportItemsMutation() {
  const { exportItems } = useUseCases()
  return useMutation({ mutationFn: () => exportItems() })
}

export function useImportItemsMutation() {
  const { importItems } = useUseCases()
  const invalidate = useInvalidateItemQueries()

  return useMutation({
    mutationFn: (raw: string) => importItems(raw),
    onSuccess: invalidate,
  })
}
