import type { ItemRepository } from '@/domain/repositories/item-repository'
import { parseItemEnvelope } from '@/domain/services/item-envelope'

export interface ImportItemsResult {
  readonly itemCount: number
  readonly warning: string | null
}

export type ImportItemsUseCase = (raw: string) => Promise<ImportItemsResult>

/**
 * Replaces the backlog with the contents of an imported JSON file. Only
 * replaces anything when the input is a recognizable envelope — invalid
 * input leaves existing data untouched rather than wiping it out.
 */
export function createImportItemsUseCase(repository: ItemRepository): ImportItemsUseCase {
  return async (raw) => {
    const { items, warning, envelopeValid } = parseItemEnvelope(raw)
    if (envelopeValid) {
      await repository.replaceAll(items)
    }
    return { itemCount: items.length, warning }
  }
}
