import type { ItemRepository } from '@/domain/repositories/item-repository'
import type { ItemId } from '@/domain/value-objects/item-id'

export type DeleteItemUseCase = (id: ItemId) => Promise<void>

export function createDeleteItemUseCase(repository: ItemRepository): DeleteItemUseCase {
  return async (id) => {
    await repository.delete(id)
  }
}
