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

## Milestone 2 — Discovery (done)

1. **Domain** — `filterItems(items, filters)` (category / status /
   priority / platform / tags, all AND'd, plus a case-insensitive search
   over title/notes/tags) and `sortItems(items, sortKey)` (recently-added,
   alphabetical, priority, recently-completed, recently-updated), plus
   `SortKey`/`SORT_KEY_LABELS` following the Status/Priority pattern. 20
   tests, no I/O.
2. **Application** — `listItems` extended to accept optional
   `{ filters, sortKey }`, composing the two new domain services over the
   repository's full snapshot. `useItemsQuery` takes the same options and
   folds them into its query key so filtered/sorted queries cache
   separately from the plain call the Item Detail drawer still makes.
3. **Presentation** — `DiscoveryPage` replacing its stub: free-text search,
   category/status/priority filters, platform/tag filters populated from
   values actually present in the backlog, a sort control, a Clear
   filters button, and an empty state. RTL-tested and verified live in
   the browser.

**Result:** 109 tests total, all four layers still green, `pnpm typecheck`
/ `pnpm lint` / `pnpm build` all clean.

## Milestone 3 — Goals (done)

1. **Domain** — `getGoalsStats(items, now)`: current completion streak
   (consecutive months with ≥1 completion, counting back from the current
   month — the current month must itself have a completion for the streak
   to be non-zero), average completions per month (total completions ÷
   months since the first one, rounded to 1 decimal), average backlog age
   in days (rounded, over items that are neither completed nor dropped),
   and the oldest such unfinished item. Reuses `getCompletionStats`
   internally for completed-this-month/year rather than duplicating that
   logic. 11 tests, no I/O.
2. **Application** — `getGoalsData` wraps `getGoalsStats` over the
   repository snapshot, wired into `AppUseCases`. Item create/update
   mutations now invalidate a `goals` query key alongside `items` and
   `dashboard`, so the Goals view stays in sync.
3. **Presentation** — `GoalsPage` replacing its stub: streak, completed
   this month/year, average completions/month, average backlog age, and
   the oldest unfinished item (clickable — opens the Item Detail drawer).
   A friendly empty state for a totally empty backlog; a local empty
   state in the "oldest unfinished" section when the backlog exists but
   is fully caught up. `StatTile` was extracted out of `QuickStats` into
   `components/shared` so Dashboard and Goals share it instead of
   duplicating it. RTL-tested and verified live in the browser.

**Result:** 125 tests total, all four layers still green, `pnpm typecheck`
/ `pnpm lint` / `pnpm build` all clean.

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
