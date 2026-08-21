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
import { createResetDemoDataUseCase } from '@/application/use-cases/seed/reset-demo-data'
import { createSeedDemoDataUseCase } from '@/application/use-cases/seed/seed-demo-data'
import { createGetSettingsUseCase } from '@/application/use-cases/settings/get-settings'
import { createUpdateSettingsUseCase } from '@/application/use-cases/settings/update-settings'
import { appConfig, type AppConfig } from '@/config/app-config'
import { getStorageKeys } from '@/config/storage-keys'
import type { ItemRepository } from '@/domain/repositories/item-repository'
import type { SettingsRepository } from '@/domain/repositories/settings-repository'
import { LocalStorageItemRepository } from '@/infrastructure/storage/local-storage-item-repository'
import { createDemoItems } from '@/infrastructure/seed/demo-backlog'
import { LocalStorageSettingsRepository } from '@/infrastructure/storage/local-storage-settings-repository'
import type { Logger } from '@/shared/logging/logger'

import { appLogger } from './app-logger'

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
  readonly seedDemoData: ReturnType<typeof createSeedDemoDataUseCase>
  readonly resetDemoData: ReturnType<typeof createResetDemoDataUseCase>
}

/**
 * Builds the LocalStorage-backed repositories for a given configuration.
 * Which keys they read is the *only* thing that differs between the
 * personal build and the public demo build.
 */
export function createDefaultRepositories(
  config: AppConfig = appConfig,
  logger: Logger = appLogger,
  storage: Storage = window.localStorage,
): { items: ItemRepository; settings: SettingsRepository } {
  const keys = getStorageKeys(config.mode)
  return {
    items: new LocalStorageItemRepository(storage, { storageKey: keys.items, logger }),
    settings: new LocalStorageSettingsRepository(storage, {
      storageKey: keys.settings,
      logger,
    }),
  }
}

/**
 * The single place that constructs concrete repositories and wires them
 * into use-cases. Swapping LocalStorage for SQLite/an API later means
 * changing the default arguments here — nothing above this layer changes.
 */
export function createAppUseCases(
  itemRepository?: ItemRepository,
  settingsRepository?: SettingsRepository,
): AppUseCases {
  // Built at most once, and only if a caller left something out — tests
  // pass both repositories in and must never touch window.localStorage.
  let defaults: ReturnType<typeof createDefaultRepositories> | null = null
  const fallback = (): ReturnType<typeof createDefaultRepositories> => {
    defaults ??= createDefaultRepositories()
    return defaults
  }

  const items = itemRepository ?? fallback().items
  const settings = settingsRepository ?? fallback().settings

  return {
    createItem: createCreateItemUseCase(items),
    updateItem: createUpdateItemUseCase(items),
    deleteItem: createDeleteItemUseCase(items),
    listItems: createListItemsUseCase(items),
    getDashboardData: createGetDashboardDataUseCase(items),
    getGoalsData: createGetGoalsDataUseCase(items),
    getDailyGoals: createGetDailyGoalsUseCase(items),
    logDailyProgress: createLogDailyProgressUseCase(items),
    exportItems: createExportItemsUseCase(items),
    importItems: createImportItemsUseCase(items),
    getSettings: createGetSettingsUseCase(settings),
    updateSettings: createUpdateSettingsUseCase(settings),
    seedDemoData: createSeedDemoDataUseCase(items, createDemoItems),
    resetDemoData: createResetDemoDataUseCase(items, createDemoItems),
  }
}
