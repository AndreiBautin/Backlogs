import { createGetDashboardDataUseCase } from '@/application/use-cases/dashboard/get-dashboard-data'
import { createCreateItemUseCase } from '@/application/use-cases/items/create-item'
import { createDeleteItemUseCase } from '@/application/use-cases/items/delete-item'
import { createListItemsUseCase } from '@/application/use-cases/items/list-items'
import { createUpdateItemUseCase } from '@/application/use-cases/items/update-item'
import type { ItemRepository } from '@/domain/repositories/item-repository'
import { LocalStorageItemRepository } from '@/infrastructure/storage/local-storage-item-repository'

export interface AppUseCases {
  readonly createItem: ReturnType<typeof createCreateItemUseCase>
  readonly updateItem: ReturnType<typeof createUpdateItemUseCase>
  readonly deleteItem: ReturnType<typeof createDeleteItemUseCase>
  readonly listItems: ReturnType<typeof createListItemsUseCase>
  readonly getDashboardData: ReturnType<typeof createGetDashboardDataUseCase>
}

/**
 * The single place that constructs a concrete ItemRepository and wires it
 * into use-cases. Swapping LocalStorage for SQLite/an API later means
 * changing the default argument here — nothing above this layer changes.
 */
export function createAppUseCases(
  repository: ItemRepository = new LocalStorageItemRepository(window.localStorage),
): AppUseCases {
  return {
    createItem: createCreateItemUseCase(repository),
    updateItem: createUpdateItemUseCase(repository),
    deleteItem: createDeleteItemUseCase(repository),
    listItems: createListItemsUseCase(repository),
    getDashboardData: createGetDashboardDataUseCase(repository),
  }
}
