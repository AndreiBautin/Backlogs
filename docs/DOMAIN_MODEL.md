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
  dailyGoal?: DailyGoal // optional per-day target, e.g. 1 chapter
  dailyProgress: readonly DailyProgressEntry[] // sparse log of days with progress
  dateAdded: string // ISO 8601, stamped on creation
  dateStarted?: string // ISO 8601, auto-stamped on first move to "currently-using"
  dateCompleted?: string // ISO 8601, auto-stamped on first move to "completed"
  lastUpdated: string // ISO 8601, bumped on every edit
}
```

`Item` values are only ever produced by three domain functions
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
  `'completed'`, `dateCompleted` is set (if not already present). Also
  resolves `changes.dailyGoal`, where `undefined` means "leave alone" and
  `null` means "remove the goal" — the one place an optional field is
  genuinely _deleted_ rather than overwritten.
- **`logDailyProgress(item, input?, deps?)`** — appends to `dailyProgress`
  rather than editing a field, so it is deliberately not part of
  `applyItemUpdate`. Throws if the item has no `dailyGoal`. All three
  functions accept optional `now`/`generateId` for deterministic tests.

## Daily goals

```ts
interface DailyGoal {
  amount: number // whole number, 1…99
  unit: string // free text: 'chapter', 'episode', 'level'
}

interface DailyProgressEntry {
  date: string // local calendar day, 'YYYY-MM-DD'
  amount: number // always > 0 — a day drops out of the log when it hits zero
}
```

Defined in `src/domain/entities/daily-goal.ts`, which also owns the
calendar-day helpers (`toDateKey`, `shiftDateKey`), validation
(`requireDailyGoal`), the display format (`formatDailyGoal` → "2
episodes/day"), and the log update (`applyProgressDelta`).

Two deliberate choices:

- **Local days, not UTC.** A daily goal is a human, local-clock concept, so
  `toDateKey` reads local date parts. `shiftDateKey` walks days through a
  local `Date` + `setDate`, which keeps month, year, leap-day and DST
  boundaries correct (a DST day is not 24 hours long).
- **The log is sparse.** Only days with progress are stored, and undoing a
  day back to zero removes its entry entirely, so the log never
  accumulates empty days.

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
an array of `{ id, label, icon, suggestedGoalUnit, suggestedPlatforms }`.
The type is _derived_ from the array
(`(typeof CATEGORY_REGISTRY)[number]['id']`) rather than
declared separately, so the ten categories in the spec and the TypeScript
union can never drift apart. **This is the extension point**: a new
category is a new array entry, full stop — no domain service or use-case
branches on a specific category id.

`suggestedPlatforms` is a UX hint only (used to prefill/suggest values in
the UI); `platform` on `Item` remains a free-text string, matching the
spec's "these should be configurable" note on platforms.
`suggestedGoalUnit` works the same way — `'chapter'` for books,
`'episode'` for shows, `'level'` for games — seeding the daily-goal unit
field so the common case needs no typing. Like `platform`, the stored
`DailyGoal.unit` stays free text, and adding a category still means one
array entry and nothing else.

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
- **`getDailyGoalBoard(items, now, recentDayCount = 14)`** →
  `{ statuses, metCount, totalCount, allMet }`, the daily check-in.
  - Only items that are **both** `'currently-using'` **and** have a
    `dailyGoal` are included: a goal on a paused or backlogged item stays
    configured but stops asking for attention.
  - Each `status` carries `{ item, goal, loggedToday, target, isMet, currentStreak, longestStreak, recentDays }`.
  - `currentStreak` counts consecutive met days ending today, or ending
    _yesterday_ when today hasn't been logged yet. That grace day is
    deliberate: a streak should die only once a day has been fully missed,
    not the moment a new day starts.
  - `statuses` is sorted by title, not by whether the goal is met, so the
    list never reshuffles under the user's cursor as they log progress.

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
throws; it returns `{ items, warning, droppedCount, envelopeValid }`:

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

It is also the app's **trust boundary**. Both of its inputs — a restored
backup file and LocalStorage itself — come from outside the app, so it
does more than shape-checking:

- **Closed value sets are checked against their registries.** A
  `category` of `"not-a-category"` is well-formed JSON but would reach
  `getCategoryDefinition`, which throws. Validating here is what lets
  every layer above treat `CategoryId` as the guarantee its type claims.
- **Resource limits.** 5 MB of input, checked before parsing, and 10 000
  items, checked after.
- **Prototype-polluting keys** (`__proto__`, `constructor`, `prototype`)
  are stripped during normalization, because `JSON.parse` preserves them
  as own properties and the normalizer spreads the object onward.

Rejected items are **dropped rather than repaired** — silently rewriting
someone's data is worse than declining to load one row — and
`droppedCount` reports how many, which is safe to log when the items
themselves are not.

Every item that survives the plausibility check is then **normalized**:
a missing `dailyProgress` becomes `[]`, and a malformed `dailyGoal` or log
entry is dropped on its own rather than taking the whole item with it.
This is what keeps backlogs and export files written before daily goals
existed loading cleanly — the envelope stays at `version: 1` because old
data is still valid data, not data needing migration. It is also why
`dailyProgress` can be a required (non-optional) field on `Item` without
every read site defending against `undefined`.

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
