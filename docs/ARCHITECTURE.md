# Architecture

Backlogs is a **client-only React application**. There is no server, no
database, and no network call anywhere in the codebase. That is a
deliberate product decision, not a missing feature: the app's whole point
is a private backlog you own, that works offline, that needs no account,
and that nobody can shut down.

Everything below follows from that one constraint.

## The layers

Four layers, with dependencies pointing **inward only**. Outer layers know
about inner ones; the reverse never happens.

```
                     ┌───────────────────────────────────┐
                     │            features/              │  React pages,
                     │  Dashboard · Discovery · Goals    │  components,
                     │  Settings · Demo · NotFound       │  query hooks
                     └────────────────┬──────────────────┘
                                      │ calls use-cases through React context
                     ┌────────────────▼──────────────────┐
                     │           application/            │  one function
                     │  createItem · listItems · …       │  per user intent
                     │  seedDemoData · importItems       │  orchestration only
                     └────────────────┬──────────────────┘
                                      │ depends on domain types + ports
                     ┌────────────────▼──────────────────┐
                     │             domain/               │  pure TypeScript
                     │  entities · value objects         │  no React,
                     │  services · repository PORTS      │  no browser APIs,
                     │  category/status/priority sets    │  no I/O
                     └────────────────▲──────────────────┘
                                      │ implements the ports
                     ┌────────────────┴──────────────────┐
                     │          infrastructure/          │  adapters
                     │  LocalStorage repos · in-memory   │  the only code
                     │  repos · serialization · seed     │  that knows about
                     └───────────────────────────────────┘  window.localStorage

           ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
           │   config/    │   │   shared/    │   │     app/     │
           │ environment  │   │ logging, DOM │   │ composition  │
           │ → AppConfig  │   │ helpers      │   │ root, router │
           └──────────────┘   └──────────────┘   └──────────────┘
```

### `domain/` — the rules

Pure TypeScript. Imports nothing but itself. Every file here is testable
by calling a function and comparing the result.

- **entities/** — `Item`, `Settings`, `DailyGoal`. These are not anaemic
  data bags: `createItem`, `applyItemUpdate`, and `logDailyProgress` own
  the actual rules, including validation and the transition that stamps
  `dateStarted` the first time something becomes _currently using_ and
  `dateCompleted` the first time it becomes _completed_.
- **value-objects/** — `ItemId`, a branded string.
- **categories/**, **status/**, **priority/**, **theme/**, **sorting/** —
  closed value sets, each with a runtime type guard. `CategoryId` is
  _derived_ from the registry array (`(typeof CATEGORY_REGISTRY)[number]['id']`),
  so the type and the data cannot drift apart. Adding a category is a
  one-line addition to one array.
- **services/** — pure functions over `Item[]`: `getDashboardSections`,
  `getCompletionStats`, `filterItems` / `sortItems`, `getGoalsStats`,
  `getDailyGoalBoard`, and `item-envelope` (the shared `{ version, items }`
  shape used by both LocalStorage and the export file).
- **repositories/** — `ItemRepository` and `SettingsRepository`. These are
  **interfaces only** — ports. Every method returns a `Promise` even
  though today's adapters are synchronous, which is what lets a network
  or SQLite backend slot in later without touching a single call site.

### `application/` — the intents

One file per thing a user can do: `createItem`, `updateItem`,
`deleteItem`, `listItems`, `getDashboardData`, `getGoalsData`,
`getDailyGoals`, `logDailyProgress`, `exportItems`, `importItems`,
`getSettings`, `updateSettings`, `seedDemoData`, `resetDemoData`.

Each is a **factory that takes its dependencies and returns a function**:

```ts
export function createUpdateItemUseCase(repository: ItemRepository): UpdateItemUseCase {
  return async (id, changes) => {
    const existing = await repository.getById(id)
    if (!existing) throw new ItemNotFoundError(id)
    const updated = applyItemUpdate(existing, changes) // ← the rule lives in domain
    await repository.save(updated)
    return updated
  }
}
```

Use-cases **orchestrate**; they do not decide. Notice that the update rule
itself is `applyItemUpdate`, a pure domain function. The use-case's job is
load → apply → save.

Anything a use-case needs from the outside world is a parameter. The demo
seed is the clearest example: `createSeedDemoDataUseCase(repository,
createDemoItems)` takes the _fixture factory_ as an argument rather than
importing it, because the fixture lives in `infrastructure/` and
application code must never point outward.

### `infrastructure/` — the adapters

The only code in the app that knows `window.localStorage` exists.

- `LocalStorageItemRepository` / `LocalStorageSettingsRepository` — the
  real adapters, taking their storage key and logger as constructor
  options so the demo build can point at a different namespace.
- `InMemoryItemRepository` / `InMemorySettingsRepository` — test doubles.
- `item-repository.contract.ts` / `settings-repository.contract.ts` — a
  shared test suite that runs against **both** implementations. This is
  what makes the in-memory fake trustworthy: it is not "close enough" to
  the real thing, it is proven to satisfy the same contract.
- `seed/demo-backlog.ts` — the demo fixture, a pure
  `(now: Date) => Item[]`.

### `features/` — the screens

Each feature owns its page, its components, and its query hooks.
Components never touch a repository; they call use-cases obtained from
React context via `useUseCases()`, and TanStack Query handles caching and
invalidation.

Local UI state that is genuinely UI state — "is the quick-capture modal
open", "which item is selected" — lives in a small Zustand store
(`use-item-ui-store`), deliberately separate from server-ish state.

### The supporting three

- **`config/`** — `readAppConfig(env)` turns raw environment variables
  into a validated `AppConfig`. Pure and total: any input produces a
  usable config, with problems reported as `warnings` rather than thrown.
  `getStorageKeys(mode)` maps the mode onto LocalStorage namespaces.
- **`shared/logging/`** — a structured `Logger`. Records carry an event
  name and a flat bag of scalars, never item content.
- **`app/`** — the composition root: `di.ts` (the one file that names a
  concrete repository), the React context providers, the router, and the
  error boundary.

## How a request flows

There is no server, so "request" means one user action end to end. Take
**checking off a daily goal on the Goals page**:

```
1.  User clicks "+1" on the Baldur's Gate 3 row
        │
2.  DailyGoalRow calls useLogDailyProgressMutation().mutate({ id })
    features/goals/hooks/use-daily-goals.ts
        │
3.  The hook resolves the use-case from React context
    useUseCases().logDailyProgress   ← injected, never imported
        │
4.  application/use-cases/goals/log-daily-progress.ts
        a. repository.getById(id)          → load
        b. logDailyProgress(item, { })     → apply the RULE (domain)
        c. repository.save(updated)        → persist
        │
5.  domain/entities/item.ts :: logDailyProgress
        - throws DomainValidationError if the item has no goal
        - appends to the progress log via applyProgressDelta, which keeps
          it sorted and sparse (a day drops out when it returns to zero)
        - stamps lastUpdated
        │
6.  infrastructure/storage/local-storage-item-repository.ts
        - serializeItems → { version: 1, items: [...] }
        - storage.setItem('backlogs:items:v1', json)
        - a QuotaExceededError becomes a message the UI can show
        │
7.  onSuccess → queryClient.invalidateQueries for items, dashboard,
    goals, and daily-goals
        │
8.  Every affected query refetches through its use-case; the row, the
    streak count, the "3 of 6 done" header, and the dashboard all update
```

The important property: **step 5 is the only place the rule lives.** The
component does not know what a streak is, and the repository does not know
what a goal is.

## Where things live

| Question                            | Answer                                                        |
| ----------------------------------- | ------------------------------------------------------------- |
| Where is business logic?            | `domain/` — entities and services, all pure functions.        |
| Where is orchestration?             | `application/` — load, apply, save.                           |
| Where does persistence happen?      | `infrastructure/` — the only place that names `localStorage`. |
| How do dependencies flow?           | Inward. `app/di.ts` is the single composition root.           |
| How is auth handled?                | There is none, by design — see below.                         |
| How are errors handled?             | Three tiers — see below.                                      |
| Where does configuration come from? | `config/app-config.ts`, read from `import.meta.env`.          |

## Authentication and authorization

**There is none, and that is the correct design.**

There is no server, no account, and no shared storage. Every user's data
is confined to their own browser origin by the same-origin policy — the
browser is the authorization boundary, and it is a stronger one than most
applications implement themselves. Adding a login would mean adding a
server, which would mean the app stopped working offline and started
requiring trust in someone else's infrastructure. That trade is the exact
opposite of what this app is for.

The public demo needs no credentials for the same reason: there is
nothing to log into. A visitor gets a seeded backlog in their own browser
and can do anything they like to it.

## Error handling

Three tiers, each with a different job:

1. **Domain validation** — `DomainValidationError`, thrown by entity
   functions when a rule is violated ("Title is required", "Unknown
   category: …"). Surfaces as inline form feedback.
2. **Corrupt or hostile input** — `parseItemEnvelope` **never throws**. It
   returns `{ items, warning, droppedCount, envelopeValid }`. The
   `envelopeValid` flag is what lets `importItems` distinguish "this file
   is not a backup" from "this backup is legitimately empty", so a bad
   file can never silently erase a backlog.
3. **Anything unexpected** — the `ErrorBoundary` catches render-time
   failures and shows a recoverable screen with a reload button. It shows
   the error text only outside production, because an error message can
   quote the item that caused it.

Storage write failures (a full quota, Safari private mode) are caught in
the repository, logged as an event, and rethrown as a plain message the UI
can display, with the original attached as `cause`.

## Configuration and secrets

**There are no secrets.** No API key, no token, no connection string —
there is nothing to authenticate to. Anything under a `VITE_` prefix is
compiled into the bundle and therefore public by definition, and
`.env.example` says so explicitly.

Configuration is environment-driven and read once at startup:

| Variable                                                 | Purpose                                   |
| -------------------------------------------------------- | ----------------------------------------- |
| `VITE_APP_MODE`                                          | `personal` (default) or `demo`            |
| `VITE_LOG_LEVEL`                                         | Console verbosity floor                   |
| `VITE_BASE_PATH`                                         | Path the app is served under              |
| `VITE_APP_VERSION` / `VITE_COMMIT_SHA` / `VITE_BUILT_AT` | Build metadata, shown in Settings → About |

`AppConfig` reaches components through `AppConfigContext`, not through a
module import, so a test can render the demo experience by passing a demo
config — no environment stubbing.

## Observability

Proportionate to a static, serverless portfolio app:

- **Structured logging.** Events like `app.start`, `storage.items.corrupted`,
  `ui.render-failed` carry scalar context and never item content, so the
  logger is safe to leave enabled in production (where it is thresholded
  to `warn`).
- **Build identification.** Settings → About shows the version and commit
  the running bundle was built from, so a report about the deployed site
  can be tied to a specific commit.
- **Deploy verification.** The deploy workflow curls the published URL and
  greps for the app shell, so a green deploy means the site answered.
- **Platform logs.** GitHub Actions run logs are the CI/CD observability,
  and they are free.

There is deliberately no error-reporting SaaS, no analytics, and no
metrics pipeline. All three would mean sending someone's private reading
habits to a third party in exchange for information this app does not need.

## Why this architecture

It is more structure than a to-do app usually gets, and the justification
is specific rather than aesthetic:

- **The domain genuinely has rules.** Streaks with a grace day, local
  calendar-day arithmetic that survives daylight saving, priority-then-age
  ranking, per-category backlog picks. Those are worth isolating and
  testing directly — and they are, with no mocks anywhere.
- **The persistence layer is expected to change.** LocalStorage was the
  right first choice and is not the last one. The port/adapter split means
  that change is one file.
- **It makes the UI testable.** Because `di.ts` is the only place naming a
  concrete repository, every page test runs against in-memory storage.
  That is why 355 tests run in under thirty seconds.

What it deliberately is **not**: there is no CQRS, no event sourcing, no
mediator, no repository-per-entity ceremony, and no dependency-injection
container. Use-cases are closures over their dependencies, which is all
the injection this app needs.

## Related reading

- [Domain model](DOMAIN_MODEL.md) — the entities in detail.
- [Security](SECURITY.md) — the threat model this shape produces.
- [Testing](TESTING.md) — what is tested at each layer.
- [Deployment](DEPLOYMENT.md) — how the static bundle reaches the web.
