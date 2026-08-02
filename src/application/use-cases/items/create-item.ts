import { createItem, type CreateItemInput, type Item } from '@/domain/entities/item'
import type { ItemRepository } from '@/domain/repositories/item-repository'

export type CreateItemUseCase = (input: CreateItemInput) => Promise<Item>

export function createCreateItemUseCase(repository: ItemRepository): CreateItemUseCase {
  return async (input) => {
    const item = createItem(input)
    await repository.save(item)
    return item
  }
}
