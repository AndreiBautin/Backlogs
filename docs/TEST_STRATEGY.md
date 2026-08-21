# Test Strategy

> **Historical.** This records the TDD discipline the app was built with,
> and its counts are as of the daily-goals feature. For the current suite —
> including the productionization tests and what is deliberately left
> untested — see [TESTING.md](TESTING.md).

Tests are colocated with source (`x.ts` + `x.test.ts`, `X.tsx` + `X.test.tsx`)
using Vitest, `jsdom`, and React Testing Library. As of the daily-goals
feature: **257 tests across 42 files, all layers, zero skipped.**

| Layer          | What's tested                     | How                                                                                                     | Mocks needed                       |
| -------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| domain         | entities, value objects, services | plain Vitest unit tests                                                                                 | none                               |
| application    | use-cases                         | run against `InMemoryItemRepository`/`InMemorySettingsRepository`                                       | none                               |
| infrastructure | both repositories' adapters       | shared contract suites + adapter-specific tests                                                         | none (real `jsdom` `localStorage`) |
| presentation   | critical flows only               | React Testing Library + `userEvent`, rendered under `AppProviders` with injected in-memory repositories | none                               |

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
- **`src/infrastructure/storage/item-repository.contract.ts`** and
  **`settings-repository.contract.ts`** —
  `itBehavesLikeAnItemRepository`/`itBehavesLikeASettingsRepository`,
  shared Vitest `describe` blocks each run against both the in-memory and
  LocalStorage adapter of their repository. Guarantee the two stay
  behaviorally interchangeable (upsert semantics, delete-of-unknown-id is
  a no-op, `replaceAll` overwrites, `get()` never fails), not just
  type-compatible. Clear `window.localStorage` between tests — a no-op for
  the in-memory doubles, essential isolation for the real adapters (real
  `localStorage` is a shared global across `it()` blocks).
- **`src/test/render-with-providers.tsx`** — renders a component tree under
  `AppProviders`, backed by fresh (or caller-seeded) in-memory item and
  settings repositories, so presentation tests exercise the exact same
  TanStack Query + context wiring the app uses, without ever touching real
  `localStorage`.
- **`src/test/setup.ts`** — global setup: `@testing-library/jest-dom`
  matchers, RTL `cleanup()` and Zustand UI-store reset after every test
  (the store is a module-level singleton and would otherwise leak state
  between test files); jsdom polyfills for the Pointer Events capture API
  and `scrollIntoView` that Radix UI's Select/Dialog primitives call, and
  for `URL.createObjectURL`/`revokeObjectURL` that Settings' "Export
  backup" button calls, none of which jsdom implements; and a raised
  `asyncUtilTimeout` (see below).

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

## Notes from building out the spec

### A global timeout fix from Settings

Once `QuickCaptureModal` and `DiscoveryPage` started reading settings
before mounting their real content (see `ARCHITECTURE.md`'s "gate on
settings load" pattern), page-level RTL tests gained an extra sequential
async hop. That made the default 1000ms `findBy*`/`waitFor` timeout
occasionally too tight under this machine's full 37-file parallel suite —
`DiscoveryPage`'s "shows every item by default" test flaked once. Rather
than bump timeouts test-by-test as this kept coming up, `configure({
asyncUtilTimeout: 5000 })` was added once in `src/test/setup.ts`. If a new
page adds another sequential data dependency and starts flaking under
full-suite runs, this is the first place to look before reaching for a
per-test timeout again.

### A flakiness note from Discovery

One RTL test (`DiscoveryPage > shows an empty state when nothing matches`)
timed out under the full 24-file parallel suite despite passing reliably
in isolation — `userEvent.type` firing a query refetch per keystroke,
multiplied by CPU contention across parallel workers, occasionally
exceeded Vitest's 5s default. Fixed by shortening the typed string and
giving that one test a 10s timeout, rather than loosening the global
default for every test. Worth remembering if a future RTL test that types
a long string starts flaking only in full-suite runs.

### A real-clock gotcha from Goals

`GoalsPage` (unlike `DashboardPage`) doesn't thread a fixed `now` through
to `getGoalsData` — it just calls it with no args, so the use-case falls
back to the real `new Date()`. That's fine for the app, but it makes any
RTL test whose expected outcome depends on "this month" or "this year"
implicitly coupled to wall-clock time at test-run time. One `GoalsPage`
test originally hardcoded `dateCompleted: '2026-01-01T00:00:00.000Z'` to
land in "this year" — correct today, silently wrong (and flaky-looking)
in a future year. Fixed by computing the date relative to
`new Date()` at test-run time instead of a hardcoded string. If Goals ever
needs deterministic date-dependent RTL tests, the real fix is giving
`GoalsPage`/`useGoalsDataQuery` an injectable clock the way the domain
layer already has, rather than continuing to route around real time in
tests.

### Dates in daily-goal tests

Daily goals made the above sharper, since every assertion is about "today."
Two rules keep those tests stable:

- **Domain and use-case tests pin the clock.** They pass an explicit `now`
  and build dates with local constructors (`new Date(2026, 7, 19)`), never
  ISO strings — `new Date('2026-08-19')` is parsed as UTC midnight, which
  is the _previous_ local day west of Greenwich and would make the suite
  pass or fail by timezone.
- **RTL tests derive dates from the real clock.** `DailyGoalsPanel` goes
  through `useDailyGoalsQuery`, which has no injectable clock, so its test
  file computes `TODAY = toDateKey(new Date())` and shifts from there
  rather than hardcoding a day. This is the same fix the Goals note above
  describes, applied up front.
