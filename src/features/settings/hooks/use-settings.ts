import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useUseCases } from '@/app/use-cases-context'
import type { SettingsChanges } from '@/domain/entities/settings'

export const settingsQueryKey = ['settings'] as const

export function useSettingsQuery() {
  const { getSettings } = useUseCases()
  return useQuery({ queryKey: settingsQueryKey, queryFn: () => getSettings() })
}

export function useUpdateSettingsMutation() {
  const { updateSettings } = useUseCases()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (changes: SettingsChanges) => updateSettings(changes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsQueryKey })
    },
  })
}
