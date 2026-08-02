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

## Milestone 4 — Settings + Import/Export (done)

1. **Domain** — `Theme` (following the `Status`/`Priority` pattern) and
   the `Settings` entity with `applySettingsChanges` (validated
   field-by-field merge, mirroring `applyItemUpdate`). Extracted the item
   envelope validate/serialize logic that used to live only in
   `infrastructure/storage/serialization.ts` into
   `domain/services/item-envelope.ts` (`createItemEnvelope`,
   `parseItemEnvelope`) — pure data-shape validation with zero
   `localStorage` dependency, reused by both the LocalStorage adapter and
   the new Import/Export use-cases. Gave `parseItemEnvelope` an explicit
   `envelopeValid` flag (rather than inferring it from the warning
   string) so a totally garbage import leaves the existing backlog
   untouched instead of wiping it, while a legitimately empty backup
   still replaces it. 15 tests, no I/O; `serialization.ts`'s existing
   tests passed unchanged, confirming the refactor was
   behavior-preserving.
2. **Infrastructure** — `SettingsRepository` port, `InMemorySettingsRepository`,
   `LocalStorageSettingsRepository` (recovers to `DEFAULT_SETTINGS` on
   corruption by reusing `applySettingsChanges` for validation instead of
   a separate duplicated type guard), shared contract test. 10 tests.
3. **Application** — `getSettings`/`updateSettings`; `exportItems`
   (serializes the full backlog via `createItemEnvelope`) and
   `importItems` (parses via `parseItemEnvelope`, only replaces the
   backlog when `envelopeValid` is true). `di.ts` now takes both an
   `ItemRepository` and a `SettingsRepository`, independently injectable.
   11 tests.
4. **Presentation** — `SettingsPage` replacing its stub: theme/default-
   sort/default-category/default-status pickers (auto-save per field),
   Export (downloads a JSON file via `shared/download-text-file.ts`) and
   Import (confirms before replacing the backlog, reports item count +
   any warning). `useApplyTheme` toggles `<html>`'s `dark` class from the
   persisted theme, mounted once in `AppShell`. `QuickCaptureModal` was
   refactored into an outer shell + inner `QuickCaptureForm` that only
   mounts while open, so it always seeds fresh state from the current
   `defaultCategory`/`defaultStatus`; `DiscoveryPage` gates on settings
   loading and seeds its sort control from `defaultSort` the same way —
   both avoid a `setState`-in-`useEffect` sync by mounting the
   state-owning component only once the data its initial state depends on
   is available. RTL-tested and verified live in the browser: theme
   toggle persists through reload, Quick Capture pre-fills the configured
   default category, Export produces a real download, and a
   JS-simulated file-input Import correctly replaced the entire backlog.

**Result:** 170 tests total, all four layers still green, `pnpm typecheck`
/ `pnpm lint` / `pnpm build` all clean. Every section of the original spec
is implemented: Dashboard, Discovery, Goals, Quick Capture, Item Details,
Settings, and Import/Export.

## Summary

Four milestones, ~22 commits, every unit written test-first. The
architecture held up unchanged from Milestone 1 to Milestone 4 — no layer
was reshuffled, no dependency direction was violated, and the two
repository ports (`ItemRepository`, `SettingsRepository`) remain the only
places LocalStorage-specific code exists. Recurring patterns that emerged
along the way and are documented for future extension:

- **Data-driven extension points** (`CATEGORY_REGISTRY` for categories,
  the same shape used for `Status`/`Priority`/`SortKey`/`Theme`) so adding
  a new value never means touching a service or use-case.
- **Shared contract tests** for every repository pair, so a real adapter
  and its in-memory double can't silently drift apart.
- **"Mount only once the data your initial state needs exists"** instead
  of `useState` + a syncing `useEffect`, used consistently in
  `ItemDetailDrawer`, `QuickCaptureModal`, and `DiscoveryPage`.

Each milestone followed the same discipline: tests written first, one
meaningful commit per vertical slice, verified live in the browser before
moving on.
