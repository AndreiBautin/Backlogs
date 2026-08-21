# Testing

**355 tests across 52 files, running in about 25 seconds.** Coverage of
`domain/`, `application/`, and `infrastructure/` sits at **97.6% of
statements and 100% of functions** — but that number is a diagnostic, not
a target, and nothing in CI enforces it.

```bash
pnpm test          # watch mode
pnpm test:run      # single run — what CI runs
pnpm test:coverage # coverage report
```

## The strategy

The architecture is what makes the testing strategy possible, so the two
are worth reading together.

Because `domain/` is pure TypeScript with no React and no browser API,
**every business rule is tested by calling a function and comparing the
result.** There is not a single mocking library in this project, and no
test anywhere stubs a module. Where a test needs a dependency, it passes
one.

That leaves four levels, each doing a job the others cannot.

### 1 · Domain — the rules (16 files)

Direct unit tests over pure functions. Clocks and ID generators are
injected (`createItem(input, { now, generateId })`), so nothing is
time-dependent or flaky.

This is where the genuinely tricky logic gets pinned down:

- **Streaks with a grace day.** A streak counts back from today, or from
  yesterday when today has not been logged yet — so a streak dies only
  once a day is fully missed, not the moment midnight passes.
- **Local calendar-day arithmetic.** `shiftDateKey` goes through a real
  `Date` rather than adding 86 400 000 ms, because a day is not always 24
  hours long. Tested across month ends, year ends, leap days, and DST.
- **Sparse progress logs.** A day enters the log when it gains progress
  and drops back out when it returns to zero, so undo leaves no trace.
- **Ranking.** Priority then age, and one backlog pick per category so a
  single category cannot crowd out the rest.

### 2 · Application — the intents (14 files)

Use-cases tested against in-memory repositories. These verify
orchestration and error paths — that `updateItem` throws
`ItemNotFoundError` for an unknown id, that `importItems` refuses to
overwrite when the envelope was not recognizable, that `seedDemoData`
never writes into non-empty storage.

### 3 · Infrastructure — the adapters, via a shared contract (6 files)

The most useful idea in the suite. `item-repository.contract.ts` and
`settings-repository.contract.ts` each export a suite that runs against
**both** implementations:

```ts
itBehavesLikeAnItemRepository(() => new InMemoryItemRepository())
itBehavesLikeAnItemRepository(() => new LocalStorageItemRepository(window.localStorage))
```

This is what makes the in-memory double trustworthy. It is not "close
enough" to the real adapter — it is _proven to satisfy the same contract_,
which is the only thing that justifies running the entire UI suite against
it.

### 4 · Features — the screens (10 files)

React Testing Library, rendered through `renderWithProviders`, which wires
the real use-cases to in-memory repositories. Tests interact the way a
person does — click a button, find text — and assert on what the user sees
or on what ended up in the repository. Never on component internals.

Because storage is in memory, these are fast and completely isolated:
**there is no `localStorage.clear()` between tests** because no page test
ever touches it.

## What is prioritized

Deliberately, and not evenly:

| Priority                   | Why                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Business rules**         | Streaks, date arithmetic, ranking, and the status transitions. Wrong here means the app lies to the user, silently.            |
| **Trust boundaries**       | Every path into the app from outside — see below.                                                                              |
| **The privacy boundary**   | The demo fixture is scanned for anything resembling personal data, and the logger is asserted never to emit item content.      |
| **Destructive operations** | Import replaces the whole backlog; reset wipes it. Both are tested from the "must not destroy" side as well as the happy path. |
| **Configuration**          | A typo in `VITE_APP_MODE` must never accidentally enable demo mode, and must never crash the app.                              |
| **Whole workflows**        | Add an item, filter for it, open it, change its status, see the dashboard update.                                              |

### The trust-boundary tests

`parseItemEnvelope` is where untrusted data enters, so it gets the
heaviest scrutiny in the suite:

- Unknown `category` / `status` / `priority` values are **dropped rather
  than repaired** — silently rewriting someone's data is worse than
  declining one row.
- A crafted `__proto__` payload cannot reach `Object.prototype`.
- Oversized input is rejected before parsing; too many items are rejected
  after.
- **No rejection path ever reports `envelopeValid: true`.** This one has
  real stakes: `importItems` only overwrites when that flag is set, so if
  a size rejection ever reported valid, opening the wrong file would erase
  the backlog.

## What is deliberately not tested

Stated so the gaps read as decisions:

- **Presentational components** (`StatusBadge`, `PriorityBadge`,
  `StatTile`, the shadcn/ui primitives). They render props. A test would
  restate the JSX.
- **Tailwind classes and visual layout.** Asserting on class strings
  tests the stylesheet, not the behaviour, and breaks on every restyle.
- **Third-party behaviour.** Radix's focus trapping and TanStack Query's
  caching are their maintainers' tests to write.
- **Coverage percentage as a gate.** Nothing in CI enforces a number.
  Chasing one produces tests written to raise it, which are exactly the
  tests that do not catch bugs.
- **End-to-end browser tests.** For a client-only app whose entire
  integration surface is LocalStorage, jsdom plus the repository contract
  covers the same ground. The one thing they would add — that the real
  deployed bundle boots — is covered instead by the deploy workflow's
  smoke test and by manual verification against the live URL.

## Test infrastructure

- **`buildItem(overrides)`** — builds a fully valid `Item` with sensible
  defaults and complete override support, so a test states only what it
  cares about. Ids are sequential and deterministic.
- **`renderWithProviders(ui, { repository, settingsRepository, config })`** —
  renders under the real provider tree with in-memory storage, and returns
  the repositories so a test can assert on what was persisted.
- **`DEMO_TEST_CONFIG` / `PERSONAL_TEST_CONFIG`** — pinned configurations
  rather than the ambient one, so a test's world does not change depending
  on which Vite mode the suite happens to run under. This is how the demo
  experience is tested with no environment stubbing at all.
- **`createTestLogger()`** — a logger that records instead of printing.
  Tests assert on _event names_ (`storage.items.corrupted`) rather than on
  message strings, so wording can change without breaking a test.
- **`src/test/setup.ts`** — polyfills the Pointer Events capture API and
  `scrollIntoView` that jsdom lacks and Radix requires, plus the
  Blob/File URL APIs the export button needs.

## Notes from experience

Two things in the setup file exist because of real failures, and are worth
knowing before changing them:

**`asyncUtilTimeout` is raised to 5 s.** Pages chain a settings query
before their content query mounts, so async updates take extra microtask
hops. The 1 s default is fine for one test in isolation and gets tight
under the full parallel suite. Raised once, centrally, rather than
sprinkling `waitFor` timeouts.

**Clocks are always injected, never faked globally.** Every domain
function takes `now` as a parameter. Tests that reach for the real clock
are the ones that fail at midnight, at month boundaries, or on a machine
in a different timezone.

## In CI

Every push and pull request runs, in order: `typecheck` → `lint` →
`format:check` → `test:run` → `build` → `build:demo`, plus a parallel job
running `pnpm audit --audit-level high` and `gitleaks` over the full
history. All of it is reproducible locally with:

```bash
pnpm verify
```
