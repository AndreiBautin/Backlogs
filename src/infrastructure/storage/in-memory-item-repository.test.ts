import { itBehavesLikeAnItemRepository } from './item-repository.contract'
import { InMemoryItemRepository } from './in-memory-item-repository'

itBehavesLikeAnItemRepository(() => new InMemoryItemRepository())
