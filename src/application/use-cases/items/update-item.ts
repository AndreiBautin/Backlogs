import { applyItemUpdate, type Item, type ItemChanges } from '@/domain/entities/item'
import type { ItemRepository } from '@/domain/repositories/item-repository'
import type { ItemId } from '@/domain/value-objects/item-id'

import { ItemNotFoundError } from '../../errors/item-not-found-error'

export type UpdateItemUseCase = (id: ItemId, changes: ItemChanges) => Promise<Item>

export function createUpdateItemUseCase(repository: ItemRepository): UpdateItemUseCase {
  return async (id, changes) => {
    const existing = await repository.getById(id)
    if (!existing) {
      throw new ItemNotFoundError(id)
    }

    const updated = applyItemUpdate(existing, changes)
    await repository.save(updated)
    return updated
  }
}
