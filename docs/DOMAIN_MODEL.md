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

## Settings

```ts
interface Settings {
  theme: Theme // 'light' | 'dark'
  defaultSort: SortKey
  defaultCategory: CategoryId
  defaultStatus: Status
}
```

`DEFAULT_SETTINGS` (`src/domain/entities/settings.ts`) is the sensible
out-of-the-box starting point (`dark`, `recently-added`, `games`,
`backlog`). Like `Item`, every change goes through one validated function:

- **`applySettingsChanges(settings, changes)`** — re-validates any field
  being changed against its value set (`Theme`, `SortKey`, `CategoryId`,
  `Status`) and merges it onto the current settings; throws
  `DomainValidationError` for an unrecognized value. Reused twice outside
  the obvious `updateSettings` use-case: `LocalStorageSettingsRepository`
  calls it to validate whatever was in storage, so a corrupted or
  hand-edited single field falls back to its default instead of the whole
  settings object being discarded.

`defaultCategory`/`defaultStatus` seed Quick Capture's initial category
selection and the status new items are created with; `defaultSort` seeds
Discovery's initial sort control. None of these are enforced by
`createItem` itself, which still defaults to `'backlog'`/`'medium'` when
called with no explicit values — the settings-driven defaults are applied
by the presentation layer when it calls `createItem`.

## Item envelope (shared by storage and Import/Export)

```ts
interface ItemEnvelope {
  version: number
  items: readonly Item[]
}
```

`createItemEnvelope(items)` / `parseItemEnvelope(raw)`
(`src/domain/services/item-envelope.ts`) are the one place that defines
"what a serialized list of items looks like." `parseItemEnvelope` never
throws; it returns `{ items, warning, envelopeValid }`:

- `envelopeValid: false` — `raw` wasn't recognizable as an envelope at all
  (invalid JSON, or valid JSON missing the `{ version, items[] }` shape).
  `items` is always `[]` in this case, and callers must not use it to
  overwrite existing data.
- `envelopeValid: true` — the envelope shape was recognized, even if
  individual items inside it were dropped for being malformed (reported
  via `warning`) or the list is legitimately empty.

This distinction is why `importItems` only calls `replaceAll` when
`envelopeValid` is true: a garbage file leaves the current backlog
untouched, while a genuinely empty backup still replaces it as expected.
`LocalStorageItemRepository`'s serialization and the user-facing
Export/Import feature both build on this one module rather than each
re-implementing "is this a plausible `Item`."

## Repository ports

```ts
interface ItemRepository {
  getAll(): Promise<Item[]>
  getById(id: ItemId): Promise<Item | null>
  save(item: Item): Promise<void> // upsert
  delete(id: ItemId): Promise<void>
  replaceAll(items: readonly Item[]): Promise<void> // used by Import
}

interface SettingsRepository {
  get(): Promise<Settings> // never fails — resolves to DEFAULT_SETTINGS on corruption
  save(settings: Settings): Promise<void>
}
```

Declared in the domain layer (`src/domain/repositories/`) since they're
part of the ubiquitous language, implemented in infrastructure.
