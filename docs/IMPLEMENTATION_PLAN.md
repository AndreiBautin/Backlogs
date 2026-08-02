# Implementation Plan

## Milestone 1 — Foundation + first vertical slice (done)

Everything below shipped as one commit per step, each a working,
fully-tested slice:

1. **Scaffold** — Vite + React 19 + TypeScript (strict), React Router,
   TanStack Query, Zustand, Tailwind v4, shadcn/ui, Vitest + RTL + jsdom,
   type-aware ESLint, Prettier. Dark mode by default (`<html class="dark">`).
2. **Domain layer** — `ItemId`, `CATEGORY_REGISTRY`, `Status`/`Priority`,
   the `Item` entity with `createItem`/`applyItemUpdate`,
   `getDashboardSections`, `getCompletionStats`. 36 tests, no I/O.
3. **Infrastructure** — `ItemRepository` port, `InMemoryItemRepository`,
   `LocalStorageItemRepository` (versioned envelope, corrupted-data
   recovery), a shared contract test suite for both.
4. **Application layer** — `createItem`/`updateItem`/`deleteItem`/
   `listItems`/`getDashboardData` use-cases, tested against the in-memory
   fake.
5. **Wiring** — composition root (`app/di.ts`), `AppProviders`
   (QueryClient + use-cases context), TanStack Query hooks, a Zustand
   store for ephemeral item-UI state, the router, and `AppShell`
   (sidebar nav, dark mode, "New" button).
6. **Feature slice** — `QuickCaptureModal` (opens on `N`, title+category
   required), `DashboardPage` (Continue / Start Next / Recently Finished /
   Recently Added + Quick Stats), `ItemDetailDrawer` (edit status,
   priority, platform, notes; dates read-only). RTL-tested and verified
   live in the browser, including a full page reload to confirm real
   `localStorage` persistence (not just query-cache state).
7. **Docs** — this file and its three companions.

**Result:** 81 tests, 20 files, all four layers, `pnpm typecheck` /
`pnpm lint` / `pnpm build` all clean. Discovery, Goals, and Settings exist
as stub routes so navigation is complete; Import/Export doesn't exist yet.

### One deliberate deviation from the original plan

`useKeyboardShortcut` was planned under `features/items/hooks/` but was
built under `shared/hooks/` instead — the hook itself has zero domain
knowledge (it's a generic single-key listener with modifier/typing-target
guards); `QuickCaptureModal` is simply its first caller. Keeping it in
`shared/` makes it reusable for whatever the next keyboard shortcut turns
out to be, without an item-specific import path implying a dependency that
doesn't exist.

## Milestone 2 — Discovery

- Domain: `filterItems(items, filters)` and `sortItems(items, sortKey)` as
  pure functions (category / status / priority / platform / tags filters;
  recently-added / alphabetical / priority / recently-completed /
  recently-updated sorts).
- Application: a `listItems` use-case variant (or extended signature) that
  accepts filter/sort options.
- Presentation: `DiscoveryPage` replacing its current stub — search input,
  filter controls, sort control, reusing `ItemCard`.

## Milestone 3 — Goals

- Domain: streak calculation (consecutive months with ≥1 completion),
  backlog age (`now - dateAdded`), oldest-unfinished-item lookup, average
  completions per month.
- Presentation: `GoalsPage` replacing its stub — current streak, completed
  this month/year, average completions/month, average backlog age, oldest
  unfinished item.

## Milestone 4 — Settings + Import/Export

- Domain/infra: a `SettingsRepository` port + LocalStorage adapter,
  following the exact same pattern as `ItemRepository` (versioned
  envelope, contract-tested). Settings: theme, default sort, default
  category, default status.
- Application: `getSettings`/`updateSettings` use-cases; `exportItems`
  (serialize the full backlog to a downloadable JSON file) and
  `importItems` (parse + validate + `replaceAll`, reusing the same
  malformed-data recovery approach already proven in
  `infrastructure/storage/serialization.ts`).
- Presentation: `SettingsPage` replacing its stub — theme toggle (backed
  by the `.dark` class already wired into `index.css`), defaults pickers,
  backup/restore buttons.

Each milestone follows the same discipline as Milestone 1: tests written
first, one meaningful commit per vertical slice, verified live in the
browser before moving on.
