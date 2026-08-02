import { isCategoryId, type CategoryId } from '../categories/category-registry'
import { DomainValidationError } from '../errors/domain-validation-error'
import { isSortKey, type SortKey } from '../sorting/sort-key'
import { isStatus, type Status } from '../status/status'
import { isTheme, type Theme } from '../theme/theme'

export interface Settings {
  readonly theme: Theme
  readonly defaultSort: SortKey
  readonly defaultCategory: CategoryId
  readonly defaultStatus: Status
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  defaultSort: 'recently-added',
  defaultCategory: 'games',
  defaultStatus: 'backlog',
}

export interface SettingsChanges {
  theme?: string
  defaultSort?: string
  defaultCategory?: string
  defaultStatus?: string
}

function requireTheme(value: string): Theme {
  if (!isTheme(value)) {
    throw new DomainValidationError(`Unknown theme: ${value}`)
  }
  return value
}

function requireSortKey(value: string): SortKey {
  if (!isSortKey(value)) {
    throw new DomainValidationError(`Unknown sort key: ${value}`)
  }
  return value
}

function requireCategory(value: string): CategoryId {
  if (!isCategoryId(value)) {
    throw new DomainValidationError(`Unknown category: ${value}`)
  }
  return value
}

function requireStatus(value: string): Status {
  if (!isStatus(value)) {
    throw new DomainValidationError(`Unknown status: ${value}`)
  }
  return value
}

export function applySettingsChanges(
  settings: Settings,
  changes: SettingsChanges,
): Settings {
  return {
    theme: changes.theme !== undefined ? requireTheme(changes.theme) : settings.theme,
    defaultSort:
      changes.defaultSort !== undefined
        ? requireSortKey(changes.defaultSort)
        : settings.defaultSort,
    defaultCategory:
      changes.defaultCategory !== undefined
        ? requireCategory(changes.defaultCategory)
        : settings.defaultCategory,
    defaultStatus:
      changes.defaultStatus !== undefined
        ? requireStatus(changes.defaultStatus)
        : settings.defaultStatus,
  }
}
