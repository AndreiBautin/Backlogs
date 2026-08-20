# Architecture

Backlogs is built as four strictly layered concerns, inspired by Clean
Architecture. Dependencies point inward only — outer layers know about inner
ones, never the reverse.

```
domain  <—  application  <—  infrastructure
   ^              ^
   |              |
   +—— features (presentation) ——+
              |
           shared / components
```

## domain/ — `src/domain`

Pure TypeScript. No React, no browser APIs, no I/O. Fully unit-testable
without mocks.

- **entities/** — `Item`, plus `createItem`/`applyItemUpdate`/
  `logDailyProgress` factory functions that own every business rule
  (validation, default values, the auto-stamp-`dateStarted`/
  `dateCompleted` rule); `DailyGoal`/`DailyProgressEntry` and their
  local-calendar-day helpers in `daily-goal.ts`; `Settings`, plus
  `applySettingsChanges`, validating each field the same way
  `applyItemUpdate` does.
- **value-objects/** — `ItemId`, a branded string with a `createItemId()`
  generator.
- **categories/** — `CATEGORY_REGISTRY`, the single extension point for
  content categories. Adding a category is a one-line addition to this
  array; `CategoryId` is derived from it (`(typeof CATEGORY_REGISTRY)[number]['id']`),
  so the type and the data can never drift apart. No domain service or
  use-case ever branches on a specific category.
- **status/**, **priority/**, **theme/** — closed value sets with label
  maps and (for priority) rank ordering, each with a runtime type guard.
- **sorting/** — `SortKey`, following the same closed-value-set pattern.
- **services/** — pure functions over `Item[]`:
  `getDashboardSections` (Continue / Start Next / Recently Finished /
  Recently Added), `getCompletionStats` (backlog size, completions,
  completion %, items-by-category), `filterItems`/`sortItems` (Discovery's
  search/filter/sort), `getGoalsStats` (streak, completion averages,
  backlog age, oldest unfinished item — reuses `getCompletionStats`
  internally rather than duplicating its logic), `getDailyGoalBoard`
  (today's per-item check-in: what's logged, what's met, and the streak
  behind each), and `item-envelope`
  (`createItemEnvelope`/`parseItemEnvelope`, the shared `{ version, items }`
  shape used by both the LocalStorage adapter and Import/Export —
  `parseItemEnvelope` never throws and reports `envelopeValid` separately
  from `warning`, so callers can tell "nothing usable was found" apart
  from "a legitimately empty envelope").
- **repositories/** — `ItemRepository` and `SettingsRepository`, both
  ports (interfaces only). Every method returns a `Promise`, even though
  the current adapters are synchronous under the hood — this is what lets
  a future network/SQLite backend slot in without changing a single call
  site.
- **errors/** — `DomainValidationError`.

## application/ — `src/application`

Use-cases orchestrate domain logic against a repository port. No framework
code, no concrete storage details. Each is a factory function —
`createXUseCase(repository) => (...) => Promise<...>` — so tests inject an
`InMemoryItemRepository`/`InMemorySettingsRepository` and never touch real
storage or mocks.

- **use-cases/items/** — `createItem`, `updateItem` (throws
  `ItemNotFoundError` for an unknown id), `deleteItem`, `listItems`
  (accepts optional `{ filters, sortKey }`, composing `filterItems`/
  `sortItems` over the repository's full snapshot), `exportItems`
  (serializes the full backlog via `createItemEnvelope`), `importItems`
  (parses via `parseItemEnvelope` and only calls `replaceAll` when
  `envelopeValid` is true — garbage input leaves the existing backlog
  untouched instead of wiping it).
- **use-cases/dashboard/** — `getDashboardData`, which composes both domain
  stats services into one payload for the presentation layer.
- **use-cases/goals/** — `getGoalsData`, wrapping `getGoalsStats`;
  `getDailyGoals`, wrapping `getDailyGoalBoard`; and `logDailyProgress`,
  which records a day's progress (throwing `ItemNotFoundError` for an
  unknown id, and letting the domain refuse an item with no goal). Kept
  out of `updateItem` because the domain treats logging as appending to a
  log, not editing a field.
- **use-cases/settings/** — `getSettings`, `updateSettings` (validated
  merge via `applySettingsChanges`).
- **errors/** — `ItemNotFoundError`.

## infrastructure/ — `src/infrastructure`

Adapters that implement domain ports. This is the _only_ layer allowed to
touch `window.localStorage`.

- **storage/local-storage-item-repository.ts** — the real `ItemRepository`.
  Persists a versioned JSON envelope (`{ version, items }`) under
  `backlogs:items:v1`.
- **storage/serialization.ts** — a thin wrapper around the domain's
  `item-envelope` module, translating its `{ items, warning }` result into
  a `console.warn` and a plain `Item[]` for this specific storage key.
- **storage/local-storage-settings-repository.ts** — the real
  `SettingsRepository`, under `backlogs:settings:v1`. Recovers to
  `DEFAULT_SETTINGS` on any corruption by reusing `applySettingsChanges`
  for validation (a bad field throws, caught and treated as "start over
  from defaults") rather than a separate duplicated type guard.
- **storage/in-memory-item-repository.ts**,
  **storage/in-memory-settings-repository.ts** — the test doubles used
  everywhere above this layer instead of real storage.
- **storage/item-repository.contract.ts**,
  **storage/settings-repository.contract.ts** — shared Vitest suites that
  both adapters of each repository are run against, so they stay
  behaviorally interchangeable, not just type-compatible.

## app/ — `src/app` (composition root)

The one place that wires concrete infrastructure into the rest of the app.

- **di.ts** — `createAppUseCases(itemRepository?, settingsRepository?)`
  constructs `LocalStorageItemRepository`/`LocalStorageSettingsRepository`
  by default and wires every use-case to them. Swapping storage later
  means changing these two default arguments.
- **use-cases-context.ts** / **providers.tsx** — expose the use-cases to
  React via context (`AppProviders`), alongside a `QueryClient`.
- **router.tsx** — route table (`react-router-dom`).
- **layout/AppShell.tsx** — sidebar nav, the "New" button, the theme sync
  (`useApplyTheme`), and the two globally-mounted overlays
  (`QuickCaptureModal`, `ItemDetailDrawer`).

TanStack Query wraps every use-case call (`src/features/*/hooks`) even
though LocalStorage resolves instantly — this is the deliberate
future-proofing seam the spec calls for. Swapping in a real network API
later changes query functions, not components.

Zustand (`src/features/items/store/use-item-ui-store.ts`) holds only
ephemeral UI state — which modal is open, which item is selected. It is
never the source of truth for persisted data; that always flows through
`AppUseCases`.

## features/ — `src/features` (presentation, feature-first)

- **dashboard/** — `DashboardPage`, `QuickStats`, `useDashboardDataQuery`.
  Opens with the compact "Today" daily check-in, which hides itself
  entirely when nothing is in progress (nothing to nag about yet).
- **items/** — `QuickCaptureModal` (an outer shell + inner
  `QuickCaptureForm` that only mounts while the dialog is open, so every
  open gets fresh state seeded from the current settings' default
  category/status — no effect needed to sync state to data that loads
  after the component does), `ItemDetailDrawer`, `ItemCard`,
  `StatusBadge`, `PriorityBadge`, the item-UI Zustand store, and the
  TanStack Query hooks (`useItemsQuery`, `useCreateItemMutation`,
  `useUpdateItemMutation`, `useExportItemsMutation`,
  `useImportItemsMutation`).
- **discovery/** — `DiscoveryPage`: search, category/status/priority/
  platform/tag filters, sort control seeded from `defaultSort` (same
  "gate on the settings load, then mount with props-derived initial
  state" pattern as Quick Capture).
- **goals/** — `GoalsPage`, `useGoalsDataQuery`: streak, completion
  averages, backlog age, oldest unfinished item. Also owns the daily
  check-in, which spans two pages: `DailyGoalsPanel` (query + mutation +
  summary), `DailyGoalRow` (one item's goal, count, and +1/undo controls)
  and `DailyGoalHistory` (the 14-day strip), with `useDailyGoalsQuery`/
  `useLogDailyProgressMutation`. `DashboardPage` renders the same panel
  compactly; the Goals page passes `showHistory`. One component, two
  densities — rather than a second implementation on the Dashboard.
  A goal itself is set on the item, in `ItemDetailDrawer`, seeded from
  the category's `suggestedGoalUnit`.
- **settings/** — `SettingsPage`: theme/default-sort/default-category/
  default-status pickers (auto-save per field) and Backup/Restore
  (Export downloads a JSON file; Import confirms before replacing the
  backlog, then reports the imported item count and any warning).
  `useApplyTheme` toggles `<html>`'s `dark` class from the persisted
  theme.

Components stay thin: hooks call use-cases, domain services do the
decision-making, components render the result. No business logic lives in
a `.tsx` file.

## shared/ and components/

- **shared/hooks/use-keyboard-shortcut.ts** — a generic single-key
  shortcut hook (ignores modifier combos and typing targets). Lives here
  rather than under `features/items` because it has zero domain knowledge;
  `QuickCaptureModal` is simply its first caller (`N` opens Quick Capture).
- **shared/download-text-file.ts** — the only place that touches
  `Blob`/`URL.createObjectURL`/an anchor's `download` attribute. A pure
  browser-DOM concern with no business logic, so it isn't domain- or
  application-layer code — `SettingsPage` is its only caller today.
- **components/ui/** — shadcn/ui primitives (Button, Dialog, Sheet, Select,
  etc.).
- **components/shared/** — small generic presentational pieces used across
  features, e.g. `EmptyState`, `StatTile` (shared by Dashboard's
  `QuickStats` and Goals).

## Why this shape

- **Testability without mocks.** Domain services are pure functions;
  use-cases are tested against in-memory fakes; only the repository
  adapters touch anything resembling I/O, and each pair (item/settings) is
  covered by its own shared contract suite.
- **Replaceable storage.** `ItemRepository`/`SettingsRepository` are the
  only seams infrastructure is allowed to leak through. A SQLite or REST
  adapter is a new file in `infrastructure/storage/`, a one-line change in
  `app/di.ts`, and nothing else moves.
- **Category extensibility without core-logic changes.** New categories are
  additive data (`CATEGORY_REGISTRY`), never a new `switch` branch in a
  service or use-case.
- **No duplicated validation.** `applySettingsChanges` is reused both by
  the `updateSettings` use-case and by `LocalStorageSettingsRepository`'s
  corruption recovery; `item-envelope`'s validation is reused by both the
  LocalStorage adapter and Import/Export. One rule, enforced once, used
  everywhere it's needed.
