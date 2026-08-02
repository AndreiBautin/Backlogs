import type { ItemRepository } from '@/domain/repositories/item-repository'
import { createItemEnvelope } from '@/domain/services/item-envelope'

export type ExportItemsUseCase = () => Promise<string>

/** Serializes the full backlog into a downloadable JSON string. */
export function createExportItemsUseCase(repository: ItemRepository): ExportItemsUseCase {
  return async () => {
    const items = await repository.getAll()
    return JSON.stringify(createItemEnvelope(items), null, 2)
  }
}
