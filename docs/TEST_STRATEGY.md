# Test Strategy

Tests are colocated with source (`x.ts` + `x.test.ts`, `X.tsx` + `X.test.tsx`)
using Vitest, `jsdom`, and React Testing Library. As of Milestone 2: **109
tests across 24 files, all layers, zero skipped.**

| Layer          | What's tested                     | How                                                                                                          | Mocks needed                       |
| -------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| domain         | entities, value objects, services | plain Vitest unit tests                                                                                      | none                               |
| application    | use-cases                         | run against `InMemoryItemRepository`                                                                         | none                               |
| infrastructure | both `ItemRepository` adapters    | shared contract suite + adapter-specific tests                                                               | none (real `jsdom` `localStorage`) |
| presentation   | critical flows only               | React Testing Library + `userEvent`, rendered under `AppProviders` with an injected `InMemoryItemRepository` | none                               |

No layer above domain needs a mocking library. The in-memory repository and
dependency injection through `AppProviders`/`renderWithProviders` are
sufficient everywhere.

## TDD discipline

Every unit in this codebase was written test-first: the test is written
and run to confirm it fails for the _expected_ reason (missing
implementation), then the minimal implementation is added and the test is
re-run to confirm it passes. This was done explicitly and visibly for the
first unit in each new layer (`ItemId`, the in-memory repository, the item
use-cases, the keyboard shortcut hook) to establish the pattern, and
followed for every subsequent unit. Each layer's tests are committed
together with its implementation as one working, green vertical slice —
never partial or with a failing suite.

## Test helpers

- **`src/test/builders/item-builder.ts`** — `buildItem(overrides?)` builds
  a fully valid `Item` via the real `createItem` factory (with a fixed
  clock) plus a field-override spread. Used everywhere a test needs an
  `Item` without hand-rolling every field.
- **`src/infrastructure/storage/item-repository.contract.ts`** —
  `itBehavesLikeAnItemRepository(createRepository)`, a shared Vitest
  `describe` block run against both `InMemoryItemRepository` and
  `LocalStorageItemRepository`. Guarantees the two stay behaviorally
  interchangeable (upsert semantics, delete-of-unknown-id is a no-op,
  `replaceAll` overwrites), not just type-compatible. Clears
  `window.localStorage` between tests — a no-op for the in-memory double,
  essential isolation for the real adapter (real `localStorage` is a
  shared global across `it()` blocks).
- **`src/test/render-with-providers.tsx`** — renders a component tree under
  `AppProviders`, backed by a fresh (or caller-seeded)
  `InMemoryItemRepository`, so presentation tests exercise the exact same
  TanStack Query + context wiring the app uses, without ever touching real
  `localStorage`.
- **`src/test/setup.ts`** — global setup: `@testing-library/jest-dom`
  matchers, RTL `cleanup()` and Zustand UI-store reset after every test
  (the store is a module-level singleton and would otherwise leak state
  between test files), and jsdom polyfills for the Pointer Events capture
  API and `scrollIntoView` that Radix UI's Select/Dialog primitives call
  but jsdom doesn't implement.

## What's _not_ separately unit-tested

Small, purely presentational leaf components with no branching logic of
their own (`ItemCard`, `StatusBadge`, `PriorityBadge`, `EmptyState`) don't
get dedicated test files — they're exercised implicitly through the
`DashboardPage`/`QuickCaptureModal`/`ItemDetailDrawer` RTL tests that
render them with real data. This matches the plan's "critical UI flows
tested," not exhaustive line coverage of every leaf.

## Running the suite

```bash
pnpm test        # watch mode
pnpm test:run     # single run (CI mode)
pnpm typecheck    # tsc -b, strict, no emit
pnpm lint         # type-aware ESLint (strictTypeChecked + stylisticTypeChecked)
pnpm build        # tsc -b && vite build
```

## Milestone 3+ additions

Goals will need streak/backlog-age service tests; Settings and
Import/Export will need their own repository/use-case tests following the
exact same patterns established here (in-memory fakes, no mocks, contract
tests for any new persistence adapter).

### A flakiness note from Discovery

One RTL test (`DiscoveryPage > shows an empty state when nothing matches`)
timed out under the full 24-file parallel suite despite passing reliably
in isolation — `userEvent.type` firing a query refetch per keystroke,
multiplied by CPU contention across parallel workers, occasionally
exceeded Vitest's 5s default. Fixed by shortening the typed string and
giving that one test a 10s timeout, rather than loosening the global
default for every test. Worth remembering if a future RTL test that types
a long string starts flaking only in full-suite runs.
