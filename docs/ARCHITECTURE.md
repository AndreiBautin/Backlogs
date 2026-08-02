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

- **entities/** — `Item`, plus `createItem`/`applyItemUpdate` factory
  functions that own every business rule (validation, default values, the
  auto-stamp-`dateStarted`/`dateCompleted` rule).
- **value-objects/** — `ItemId`, a branded string with a `createItemId()`
  generator.
- **categories/** — `CATEGORY_REGISTRY`, the single extension point for
  content categories. Adding a category is a one-line addition to this
  array; `CategoryId` is derived from it (`(typeof CATEGORY_REGISTRY)[number]['id']`),
  so the type and the data can never drift apart. No domain service or
  use-case ever branches on a specific category.
- **status/**, **priority/** — closed value sets with label maps and rank
  ordering (priority), each with a runtime type guard.
- **services/** — pure functions over `Item[]`:
  `getDashboardSections` (Continue / Start Next / Recently Finished /
  Recently Added) and `getCompletionStats` (backlog size, completions,
  completion %, items-by-category).
- **repositories/** — `ItemRepository`, a port (interface only). Every
  method returns a `Promise`, even though the current adapter is
  synchronous under the hood — this is what lets a future network/SQLite
  backend slot in without changing a single call site.
- **errors/** — `DomainValidationError`.

## application/ — `src/application`

Use-cases orchestrate domain logic against a repository port. No framework
code, no concrete storage details. Each is a factory function —
`createXUseCase(repository) => (...) => Promise<...>` — so tests inject an
`InMemoryItemRepository` and never touch real storage or mocks.

- **use-cases/items/** — `createItem`, `updateItem` (throws
  `ItemNotFoundError` for an unknown id), `deleteItem`, `listItems`.
- **use-cases/dashboard/** — `getDashboardData`, which composes both domain
  stats services into one payload for the presentation layer.
- **errors/** — `ItemNotFoundError`.

## infrastructure/ — `src/infrastructure`

Adapters that implement domain ports. This is the _only_ layer allowed to
touch `window.localStorage`.

- **storage/local-storage-item-repository.ts** — the real `ItemRepository`.
  Persists a versioned JSON envelope (`{ version, items }`) under
  `backlogs:items:v1`.
- **storage/serialization.ts** — encode/decode for that envelope, with
  graceful recovery: invalid JSON, an unexpected shape, or individual
  malformed items are dropped (with a `console.warn`) rather than crashing
  the app or losing the rest of the backlog.
- **storage/in-memory-item-repository.ts** — the test double used
  everywhere above this layer instead of real storage.
- **storage/item-repository.contract.ts** — a shared Vitest suite
  (`itBehavesLikeAnItemRepository`) that both adapters are run against, so
  they stay behaviorally interchangeable, not just type-compatible.

## app/ — `src/app` (composition root)

The one place that wires concrete infrastructure into the rest of the app.

- **di.ts** — `createAppUseCases(repository?)` constructs a
  `LocalStorageItemRepository` by default and wires every use-case to it.
  Swapping storage later means changing this one default argument.
- **use-cases-context.ts** / **providers.tsx** — expose the use-cases to
  React via context (`AppProviders`), alongside a `QueryClient`.
- **router.tsx** — route table (`react-router-dom`).
- **layout/AppShell.tsx** — sidebar nav, the "New" button, and the two
  globally-mounted overlays (`QuickCaptureModal`, `ItemDetailDrawer`).

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
- **items/** — `QuickCaptureModal`, `ItemDetailDrawer`, `ItemCard`,
  `StatusBadge`, `PriorityBadge`, the item-UI Zustand store, and the
  TanStack Query hooks (`useItemsQuery`, `useCreateItemMutation`,
  `useUpdateItemMutation`).
- **discovery/**, **goals/**, **settings/** — stub pages for now (see
  `IMPLEMENTATION_PLAN.md`).

Components stay thin: hooks call use-cases, domain services do the
decision-making, components render the result. No business logic lives in
a `.tsx` file.

## shared/ and components/

- **shared/hooks/use-keyboard-shortcut.ts** — a generic single-key
  shortcut hook (ignores modifier combos and typing targets). Lives here
  rather than under `features/items` because it has zero domain knowledge;
  `QuickCaptureModal` is simply its first caller (`N` opens Quick Capture).
- **components/ui/** — shadcn/ui primitives (Button, Dialog, Sheet, Select,
  etc.).
- **components/shared/** — small generic presentational pieces used across
  features, e.g. `EmptyState`.

## Why this shape

- **Testability without mocks.** Domain services are pure functions;
  use-cases are tested against an in-memory fake; only the two repository
  adapters touch anything resembling I/O, and both are covered by the same
  contract suite.
- **Replaceable storage.** `ItemRepository` is the only seam infrastructure
  is allowed to leak through. A SQLite or REST adapter is a new file in
  `infrastructure/storage/`, a one-line change in `app/di.ts`, and nothing
  else moves.
- **Category extensibility without core-logic changes.** New categories are
  additive data (`CATEGORY_REGISTRY`), never a new `switch` branch in a
  service or use-case.
