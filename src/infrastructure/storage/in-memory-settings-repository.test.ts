import { InMemorySettingsRepository } from './in-memory-settings-repository'
import { itBehavesLikeASettingsRepository } from './settings-repository.contract'

itBehavesLikeASettingsRepository(() => new InMemorySettingsRepository())
