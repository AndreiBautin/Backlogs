import { createGetDashboardDataUseCase } from '@/application/use-cases/dashboard/get-dashboard-data'
import { createGetDailyGoalsUseCase } from '@/application/use-cases/goals/get-daily-goals'
import { createGetGoalsDataUseCase } from '@/application/use-cases/goals/get-goals-data'
import { createLogDailyProgressUseCase } from '@/application/use-cases/goals/log-daily-progress'
import { createCreateItemUseCase } from '@/application/use-cases/items/create-item'
import { createDeleteItemUseCase } from '@/application/use-cases/items/delete-item'
import { createExportItemsUseCase } from '@/application/use-cases/items/export-items'
import { createImportItemsUseCase } from '@/application/use-cases/items/import-items'
import { createListItemsUseCase } from '@/application/use-cases/items/list-items'
import { createUpdateItemUseCase } from '@/application/use-cases/items/update-item'
import { createGetSettingsUseCase } from '@/application/use-cases/settings/get-settings'
import { createUpdateSettingsUseCase } from '@/application/use-cases/settings/update-settings'
import type { ItemRepository } from '@/domain/repositories/item-repository'
import type { SettingsRepository } from '@/domain/repositories/settings-repository'
import { LocalStorageItemRepository } from '@/infrastructure/storage/local-storage-item-repository'
import { LocalStorageSettingsRepository } from '@/infrastructure/storage/local-storage-settings-repository'

export interface AppUseCases {
  readonly createItem: ReturnType<typeof createCreateItemUseCase>
  readonly updateItem: ReturnType<typeof createUpdateItemUseCase>
  readonly deleteItem: ReturnType<typeof createDeleteItemUseCase>
  readonly listItems: ReturnType<typeof createListItemsUseCase>
  readonly getDashboardData: ReturnType<typeof createGetDashboardDataUseCase>
  readonly getGoalsData: ReturnType<typeof createGetGoalsDataUseCase>
  readonly getDailyGoals: ReturnType<typeof createGetDailyGoalsUseCase>
  readonly logDailyProgress: ReturnType<typeof createLogDailyProgressUseCase>
  readonly exportItems: ReturnType<typeof createExportItemsUseCase>
  readonly importItems: ReturnType<typeof createImportItemsUseCase>
  readonly getSettings: ReturnType<typeof createGetSettingsUseCase>
  readonly updateSettings: ReturnType<typeof createUpdateSettingsUseCase>
}

/**
 * The single place that constructs concrete repositories and wires them
 * into use-cases. Swapping LocalStorage for SQLite/an API later means
 * changing the default arguments here — nothing above this layer changes.
 */
export function createAppUseCases(
  itemRepository: ItemRepository = new LocalStorageItemRepository(window.localStorage),
  settingsRepository: SettingsRepository = new LocalStorageSettingsRepository(
    window.localStorage,
  ),
): AppUseCases {
  return {
    createItem: createCreateItemUseCase(itemRepository),
    updateItem: createUpdateItemUseCase(itemRepository),
    deleteItem: createDeleteItemUseCase(itemRepository),
    listItems: createListItemsUseCase(itemRepository),
    getDashboardData: createGetDashboardDataUseCase(itemRepository),
    getGoalsData: createGetGoalsDataUseCase(itemRepository),
    getDailyGoals: createGetDailyGoalsUseCase(itemRepository),
    logDailyProgress: createLogDailyProgressUseCase(itemRepository),
    exportItems: createExportItemsUseCase(itemRepository),
    importItems: createImportItemsUseCase(itemRepository),
    getSettings: createGetSettingsUseCase(settingsRepository),
    updateSettings: createUpdateSettingsUseCase(settingsRepository),
  }
}
