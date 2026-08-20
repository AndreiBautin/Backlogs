import { type CategoryId, isCategoryId } from '../categories/category-registry'
import { DomainValidationError } from '../errors/domain-validation-error'
import { isPriority, type Priority } from '../priority/priority'
import { isStatus, type Status } from '../status/status'
import { createItemId, type ItemId } from '../value-objects/item-id'
import {
  applyProgressDelta,
  requireDailyGoal,
  toDateKey,
  type DailyGoal,
  type DailyGoalInput,
  type DailyProgressEntry,
} from './daily-goal'

export interface Item {
  readonly id: ItemId
  readonly title: string
  readonly category: CategoryId
  readonly status: Status
  readonly priority: Priority
  readonly platform?: string
  readonly estimatedLength?: string
  readonly notes?: string
  readonly tags: readonly string[]
  readonly favorite: boolean
  readonly dailyGoal?: DailyGoal
  readonly dailyProgress: readonly DailyProgressEntry[]
  readonly dateAdded: string
  readonly dateStarted?: string
  readonly dateCompleted?: string
  readonly lastUpdated: string
}

export interface CreateItemInput {
  title: string
  category: string
  status?: string
  priority?: string
  platform?: string
  estimatedLength?: string
  notes?: string
  tags?: readonly string[]
  favorite?: boolean
  dailyGoal?: DailyGoalInput
}

export interface ItemChanges {
  title?: string
  category?: string
  status?: string
  priority?: string
  platform?: string
  estimatedLength?: string
  notes?: string
  tags?: readonly string[]
  favorite?: boolean
  /** A goal to set, or `null` to drop the item's daily goal entirely. */
  dailyGoal?: DailyGoalInput | null
  dateStarted?: string
  dateCompleted?: string
}

export interface ItemClock {
  now?: () => Date
  generateId?: () => ItemId
}

export interface LogDailyProgressInput {
  /** The day being logged against. Defaults to the clock's current day. */
  on?: Date
  /** Units to add; negative undoes progress. Defaults to one unit. */
  delta?: number
}

function requireTitle(title: string): string {
  const trimmed = title.trim()
  if (trimmed.length === 0) {
    throw new DomainValidationError('Title is required')
  }
  return trimmed
}

function requireCategory(category: string): CategoryId {
  if (!isCategoryId(category)) {
    throw new DomainValidationError(`Unknown category: ${category}`)
  }
  return category
}

function requireStatus(status: string): Status {
  if (!isStatus(status)) {
    throw new DomainValidationError(`Unknown status: ${status}`)
  }
  return status
}

function requirePriority(priority: string): Priority {
  if (!isPriority(priority)) {
    throw new DomainValidationError(`Unknown priority: ${priority}`)
  }
  return priority
}

export function createItem(input: CreateItemInput, deps: ItemClock = {}): Item {
  const now = deps.now ?? (() => new Date())
  const generateId = deps.generateId ?? createItemId
  const timestamp = now().toISOString()

  return {
    id: generateId(),
    title: requireTitle(input.title),
    category: requireCategory(input.category),
    status: input.status !== undefined ? requireStatus(input.status) : 'backlog',
    priority: input.priority !== undefined ? requirePriority(input.priority) : 'medium',
    tags: input.tags ?? [],
    favorite: input.favorite ?? false,
    dailyProgress: [],
    dateAdded: timestamp,
    lastUpdated: timestamp,
    ...(input.platform !== undefined && { platform: input.platform }),
    ...(input.estimatedLength !== undefined && {
      estimatedLength: input.estimatedLength,
    }),
    ...(input.notes !== undefined && { notes: input.notes }),
    ...(input.dailyGoal !== undefined && {
      dailyGoal: requireDailyGoal(input.dailyGoal),
    }),
  }
}

/** `undefined` change = leave as-is; `null` = clear; otherwise validate and set. */
function resolveDailyGoal(
  current: DailyGoal | undefined,
  change: DailyGoalInput | null | undefined,
): DailyGoal | undefined {
  if (change === undefined) {
    return current
  }
  return change === null ? undefined : requireDailyGoal(change)
}

export function applyItemUpdate(
  item: Item,
  changes: ItemChanges,
  deps: ItemClock = {},
): Item {
  const now = deps.now ?? (() => new Date())
  const timestamp = now().toISOString()

  const title = changes.title !== undefined ? requireTitle(changes.title) : item.title
  const category =
    changes.category !== undefined ? requireCategory(changes.category) : item.category
  const status =
    changes.status !== undefined ? requireStatus(changes.status) : item.status
  const priority =
    changes.priority !== undefined ? requirePriority(changes.priority) : item.priority

  const startingNow = status === 'currently-using' && item.dateStarted === undefined
  const completingNow = status === 'completed' && item.dateCompleted === undefined

  const platform = changes.platform ?? item.platform
  const estimatedLength = changes.estimatedLength ?? item.estimatedLength
  const notes = changes.notes ?? item.notes
  const dateStarted = changes.dateStarted ?? (startingNow ? timestamp : item.dateStarted)
  const dateCompleted =
    changes.dateCompleted ?? (completingNow ? timestamp : item.dateCompleted)
  const dailyGoal = resolveDailyGoal(item.dailyGoal, changes.dailyGoal)

  // Spreading `withoutGoal` rather than `item` is what lets a goal be *removed*:
  // a conditional spread can add an optional key back, never take one away.
  const { dailyGoal: currentGoal, ...withoutGoal } = item
  void currentGoal

  return {
    ...withoutGoal,
    title,
    category,
    status,
    priority,
    tags: changes.tags ?? item.tags,
    favorite: changes.favorite ?? item.favorite,
    lastUpdated: timestamp,
    ...(platform !== undefined && { platform }),
    ...(estimatedLength !== undefined && { estimatedLength }),
    ...(notes !== undefined && { notes }),
    ...(dateStarted !== undefined && { dateStarted }),
    ...(dateCompleted !== undefined && { dateCompleted }),
    ...(dailyGoal !== undefined && { dailyGoal }),
  }
}

/**
 * Records progress toward the item's daily goal. Kept separate from
 * `applyItemUpdate` because it is an append to a log, not a field edit — and
 * because it only makes sense for an item that actually has a goal.
 */
export function logDailyProgress(
  item: Item,
  input: LogDailyProgressInput = {},
  deps: ItemClock = {},
): Item {
  if (item.dailyGoal === undefined) {
    throw new DomainValidationError(`Item has no daily goal: ${item.title}`)
  }

  const now = deps.now ?? (() => new Date())
  const timestamp = now()
  const dateKey = toDateKey(input.on ?? timestamp)

  return {
    ...item,
    dailyProgress: applyProgressDelta(item.dailyProgress, dateKey, input.delta ?? 1),
    lastUpdated: timestamp.toISOString(),
  }
}
