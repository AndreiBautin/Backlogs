# Domain Model

## Item

The single entity in the system. Everything the app manages — a game, a
show, a book, a podcast — is an `Item`.

```ts
interface Item {
  id: ItemId // branded UUID string
  title: string
  category: CategoryId
  status: Status
  priority: Priority
  platform?: string
  estimatedLength?: string
  notes?: string
  tags: readonly string[]
  favorite: boolean
  dateAdded: string // ISO 8601, stamped on creation
  dateStarted?: string // ISO 8601, auto-stamped on first move to "currently-using"
  dateCompleted?: string // ISO 8601, auto-stamped on first move to "completed"
  lastUpdated: string // ISO 8601, bumped on every edit
}
```

`Item` values are only ever produced by two domain functions
(`src/domain/entities/item.ts`), so every invariant below is enforced in
exactly one place:

- **`createItem(input, deps?)`** — validates `title` (non-empty after
  trimming) and `category` (must exist in `CATEGORY_REGISTRY`), defaults
  `status: 'backlog'`, `priority: 'medium'`, `favorite: false`, `tags: []`,
  and stamps `dateAdded`/`lastUpdated` to the same timestamp.
- **`applyItemUpdate(item, changes, deps?)`** — re-validates any field
  being changed, always bumps `lastUpdated`, and applies the auto-stamp
  business rule: the first time `status` moves to `'currently-using'`,
  `dateStarted` is set (if not already present); the first time it moves to
  `'completed'`, `dateCompleted` is set (if not already present). Both
  functions accept optional `now`/`generateId` for deterministic tests.

## CategoryId

```ts
type CategoryId =
  | 'games'
  | 'tv-shows'
  | 'movies'
  | 'anime'
  | 'books'
  | 'manga'
  | 'podcasts'
  | 'music'
  | 'youtube'
  | 'courses'
```

Defined by `CATEGORY_REGISTRY` (`src/domain/categories/category-registry.ts`),
an array of `{ id, label, icon, suggestedPlatforms }`. The type is _derived_
from the array (`(typeof CATEGORY_REGISTRY)[number]['id']`) rather than
declared separately, so the ten categories in the spec and the TypeScript
union can never drift apart. **This is the extension point**: a new
category is a new array entry, full stop — no domain service or use-case
branches on a specific category id.

`suggestedPlatforms` is a UX hint only (used to prefill/suggest values in
the UI); `platform` on `Item` remains a free-text string, matching the
spec's "these should be configurable" note on platforms.

## Status

```ts
type Status =
  'backlog' | 'currently-using' | 'completed' | 'paused' | 'dropped' | 'wishlist'
```

## Priority

```ts
type Priority = 'high' | 'medium' | 'low' | 'someday'
```

`PRIORITY_RANK` gives each value a sort rank (`high` = 0 … `someday` = 3),
used by `getDashboardSections` to order the backlog by urgency.

## Domain services

Pure functions over `readonly Item[]`, with no I/O and no framework
dependency — every case is a plain Vitest unit test.

- **`getDashboardSections(items, limit = 5)`** →
  `{ continue, startNext, recentlyFinished, recentlyAdded }`.
  - `continue`: `status === 'currently-using'`, most recently updated first.
  - `startNext`: `status === 'backlog'`, ordered by priority rank then by
    age (oldest first within the same priority).
  - `recentlyFinished`: `status === 'completed'`, most recently completed
    first.
  - `recentlyAdded`: every item, newest `dateAdded` first. (Items can
    legitimately appear here _and_ in a status-specific section — this is
    intentional, matching "Recently Added: Newest entries" as its own
    independent view.)
- **`getCompletionStats(items, now)`** →
  `{ totalBacklog, completedThisMonth, completedThisYear, completionPercentage, itemsByCategory }`.
  `itemsByCategory` always has an entry for every registered category
  (zero-filled), so the UI never has to guess about missing keys.

## Repository port

```ts
interface ItemRepository {
  getAll(): Promise<Item[]>
  getById(id: ItemId): Promise<Item | null>
  save(item: Item): Promise<void> // upsert
  delete(id: ItemId): Promise<void>
  replaceAll(items: readonly Item[]): Promise<void> // for future import
}
```

Declared in the domain layer (`src/domain/repositories/item-repository.ts`)
since it's part of the ubiquitous language, implemented in infrastructure.
