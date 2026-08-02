import type { Item } from '@/domain/entities/item'
import type { ItemRepository } from '@/domain/repositories/item-repository'

export type ListItemsUseCase = () => Promise<Item[]>

export function createListItemsUseCase(repository: ItemRepository): ListItemsUseCase {
  return () => repository.getAll()
}
