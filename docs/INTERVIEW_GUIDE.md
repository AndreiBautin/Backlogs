# Interview guide

Everything here describes what the code actually does. Nothing is
aspirational, and no technology is claimed that is not in the repository.

---

## The 30-second version

> Backlogs is a personal backlog manager — games, books, shows, podcasts,
> courses, anything you've been meaning to get to. The problem it solves
> isn't storage, it's decision fatigue: you open it and it tells you what
> to start next instead of making you scroll a list.
>
> It's a React and TypeScript single-page app with no backend at all —
> everything lives in the browser's LocalStorage. That's deliberate: no
> account, works offline, and nobody can shut it down or read your data.
>
> The interesting part is that it's built in layers, with the business
> rules — streaks, ranking, date arithmetic — isolated as pure functions
> with no React in them. That's why there are 355 tests that run in
> twenty-five seconds with no mocking library anywhere.

**If they ask "why no backend?"** — because the app's defining feature is
that it works with no account and no network. A server would take that
away and add a thing that can go down. The persistence layer is behind an
interface, so adding one later is one file.

---

## Explaining the architecture

Draw this. It is four boxes and one arrow direction.

```
features/  (React pages, hooks)          ── outermost
    ↓ calls use-cases via React context
application/  (one function per intent)
    ↓ depends on domain types + ports
domain/  (entities, services, PORTS)     ── innermost, pure
    ↑ implemented by
infrastructure/  (LocalStorage + in-memory adapters)
```

Then say the three things that make it real rather than decorative:

**1 · `domain/` imports nothing.** No React, no browser API, no I/O. Every
business rule is a pure function you can test by calling it. That is not
an aspiration — it is checkable in thirty seconds by grepping the imports.

**2 · The repository interfaces live in `domain/`, the implementations in
`infrastructure/`.** That is dependency inversion doing actual work: the
inner layer defines what it needs, the outer layer satisfies it. It is
what lets the entire UI test suite run against in-memory storage.

**3 · There is exactly one composition root.** `src/app/di.ts` is the only
file in the codebase that names a concrete repository. Everything else
receives its dependencies.

### The line worth having ready

> The architecture is more structure than a to-do app usually deserves,
> and I can justify it specifically: the domain has genuinely fiddly rules
> — streaks with a grace day, calendar arithmetic that has to survive
> daylight saving — and the persistence layer is explicitly expected to
> change. Those two facts are what earn the layering. I did _not_ add
> CQRS, an event bus, a DI container, or a repository per entity, because
> nothing here would have paid for them.

---

## Request lifecycle

There is no server, so walk one **user action end to end**. Use the daily
goal check-in — it touches every layer.

**"I click +1 on a book's daily goal."**

| #   | Layer                                                     | What happens                                                                                                                                                                     |
| --- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `features/goals/components/DailyGoalRow.tsx`              | Button click calls `useLogDailyProgressMutation().mutate({ id })`                                                                                                                |
| 2   | `features/goals/hooks/use-daily-goals.ts`                 | The hook resolves the use-case from React context — `useUseCases().logDailyProgress`. It is **injected, never imported**, which is why the test suite can swap storage.          |
| 3   | `application/use-cases/goals/log-daily-progress.ts`       | `getById` → apply → `save`. Pure orchestration; it makes no decisions.                                                                                                           |
| 4   | `domain/entities/item.ts`                                 | `logDailyProgress(item)` — **the rule.** Throws if the item has no goal; appends via `applyProgressDelta`, which keeps the log sorted and sparse; stamps `lastUpdated`.          |
| 5   | `infrastructure/storage/local-storage-item-repository.ts` | Serializes to `{ version: 1, items: [...] }` and writes to `backlogs:items:v1`. A `QuotaExceededError` becomes a message the UI can show, with the original attached as `cause`. |
| 6   | TanStack Query                                            | `onSuccess` invalidates items, dashboard, goals, and daily-goals.                                                                                                                |
| 7   | UI                                                        | The row, the streak count, the "3 of 6 done" header, and the dashboard all update from one write.                                                                                |

**The point to land:** step 4 is the _only_ place that knows what a streak
is. The component doesn't. The repository doesn't. That is what the
layering buys.

---

## Engineering decisions

Each is a decision you made, with what you turned down and what it cost.

### 1 · No backend

- **Alternatives:** Node + Postgres; Supabase or Firebase; a serverless API.
- **Why not:** the app's defining property is that it needs no account and
  works offline. A backend removes that and adds an outage surface, a
  hosting bill, and an authentication system to get wrong.
- **Trade-off:** no sync across devices. Mitigated by JSON export/import
  — deliberately a manual sync, which is honest about what it is.
- **Escape hatch:** `ItemRepository` is an interface whose every method
  returns a `Promise` even though today's adapters are synchronous.
  That was done _specifically_ so a network adapter can slot in without
  touching a single call site.

### 2 · Four layers, not one

- **Alternatives:** components calling `localStorage` directly (typical
  for an app this size); a single service module.
- **Why:** the domain has real rules worth isolating, and 355 tests run
  fast with no mocking precisely because the rules are pure functions and
  storage is swappable.
- **Trade-off:** more files, and one extra hop to trace a feature. Worth
  it here; would be overkill for a CRUD form.

### 3 · A category _registry_ instead of a category enum

```ts
export const CATEGORY_REGISTRY = [
  { id: 'games', label: 'Games', icon: 'Gamepad2', suggestedGoalUnit: 'level', … },
  …
] as const satisfies readonly CategoryDefinition[]

export type CategoryId = (typeof CATEGORY_REGISTRY)[number]['id']
```

- **Why:** the type is _derived from the data_, so they cannot drift.
  Adding a category is a one-line addition to one array — no service, no
  use-case, and no component branches on a specific category.
- **Trade-off:** slightly more indirection than a plain union type, for a
  guarantee that scales.
- **Good follow-up to volunteer:** _"No `switch` on category exists
  anywhere in the codebase, and that's enforced by there being nothing to
  switch on."_

### 4 · TanStack Query for data, Zustand only for UI state

- **Alternatives:** all of it in Zustand or Redux; `useEffect` + `useState`.
- **Why:** even with a local repository, reads are async and need caching
  and invalidation — which is exactly what Query does. Zustand holds only
  things that are genuinely ephemeral UI state ("is the modal open",
  "which item is selected").
- **Trade-off:** two state tools instead of one. The split is by _kind of
  state_, which keeps it easy to explain and easy to place new state
  correctly.

### 5 · A repository _contract_ test suite

```ts
itBehavesLikeAnItemRepository(() => new InMemoryItemRepository())
itBehavesLikeAnItemRepository(() => new LocalStorageItemRepository(window.localStorage))
```

- **Why:** the entire UI test suite runs against the in-memory double. The
  contract is what makes that legitimate — the fake isn't "close enough",
  it's proven to satisfy the same interface.
- **Trade-off:** the contract has to be maintained alongside the
  interface. Cheap, and it pays for itself the first time an adapter
  diverges.

### 6 · Demo mode as a _configuration flag_, not a separate build

- **Alternatives:** a separate demo branch or repository; a build-time
  fork of the app.
- **Why:** one codebase, one set of tests, one thing to keep working.
  `VITE_APP_MODE` decides which LocalStorage namespace is used and whether
  the seed runs.
- **Safety:** three independent barriers stop personal data reaching the
  public demo — the fixture is generated rather than captured, the storage
  namespaces are disjoint, and seeding only ever writes into empty
  storage. All three are tested.
- **Trade-off:** a small amount of mode-awareness in the app. Confined to
  two components and one config file.

### 7 · Relative dates in the demo fixture

- **Alternative:** fixed timestamps, which is what most seed data uses.
- **Why:** a fixture pinned to absolute dates rots. Opened a year later it
  shows a dead streak and an empty "completed this month" — a demo that
  quietly stops demonstrating anything.
- **Cost:** none, since `createDemoItems(now)` is still a pure function.
  A test asserts the demo still shows a live streak when generated more
  than a year into the future.

### 8 · Errors as _values_ at the trust boundary, exceptions inside the domain

- **Why:** `createItem` throws `DomainValidationError` when a user breaks
  a rule — that should surface. `parseItemEnvelope` **never throws**; it
  returns `{ items, warning, droppedCount, envelopeValid }` because
  corrupt storage must not take the app down.
- **The subtle part worth volunteering:** `envelopeValid` exists so
  `importItems` can tell "this file isn't a backup" from "this backup is
  legitimately empty". Without it, opening the wrong file would parse to
  zero items and erase everything. There's a test asserting no rejection
  path ever reports `envelopeValid: true`.

### 9 · Shipping source maps to production

- **Why:** there is no proprietary logic and no secret in the bundle, and
  the repository is public. Withholding them buys obscurity that protects
  nothing while making a stack trace unreadable.
- **When you'd decide differently:** a bundle containing genuine business
  IP, or one where the source isn't public anyway.

---

## Security talking points

**Lead with the threat model** — it is the most interesting thing here,
and it shows you reason about security rather than reciting a checklist.

> The threat model is unusual and worth being explicit about: there's no
> server, no account, no session, and no data that leaves the browser. So
> whole categories of vulnerability are absent by construction rather than
> defended against — no SQL to inject, no CSRF because there's no
> state-changing endpoint, no IDOR because there's no server-side object
> to reference. The browser's same-origin policy is the authorization
> boundary, and it's a stronger one than most apps implement themselves.
>
> That leaves a small, real surface: what enters the app, what it renders,
> and what the deployment exposes.

Then the concrete work:

- **Input validation at the trust boundary.** The import parser used to
  check `typeof category === 'string'` and nothing more, so an item could
  carry `category: "not-a-category"`, satisfy the guard, and then reach
  `getCategoryDefinition`, which throws. Now it validates against the
  registries. That fix is what makes the type-level confidence everywhere
  else honest.
- **Resource limits.** 5 MB checked _before_ parsing — rejecting a hostile
  payload after the expensive step isn't much of a rejection — and a
  10 000-item cap after.
- **Prototype pollution.** `JSON.parse` keeps `__proto__` as an own
  property, so it's inert until something spreads the object — which
  `normalizeItem` did. Those keys are now stripped, with a test asserting
  `Object.prototype` stays clean.
- **CSP.** `script-src 'self'` with no `unsafe-inline`, verified on the
  live site by injecting a script tag and watching it fail to run.
  `connect-src 'self'` turns "this app makes no network calls" into
  something the browser enforces.
- **Logging that can't leak.** Records carry an event name and scalars —
  `{ reason: 'Invalid JSON', dropped: 3 }` — never item content. Two
  tests assert titles never appear in log output.
- **A dependency gate that proved itself.** `pnpm audit --audit-level
high` failed on its first run with a real advisory in `nanoid` (via
  `postcss ← vite`). Fixed by pinning forward rather than by lowering the
  threshold — a gate you relax the first time it fires isn't a gate.

**The honest one to volunteer** — it lands better offered than extracted:

> There's one thing I couldn't fix on this hosting. `frame-ancestors` is
> ignored when it's delivered via a `<meta>` tag, and GitHub Pages can't
> set response headers, so the demo can be framed. I actually shipped it
> as a meta tag first, saw the browser log an error on every page load,
> and took it out — a header that looks like protection and provides none
> is worse than not having it. I documented the gap instead. The real
> impact is near zero, because clickjacking works by making a user act
> with their authority against a session, and there's no session here. If
> it mattered I'd move to Cloudflare Pages, which gives header control.

---

## Database

There is no database. Be precise about this rather than apologetic.

**The store** is `window.localStorage`, under two keys:

| Key                    | Contents                                                 |
| ---------------------- | -------------------------------------------------------- |
| `backlogs:items:v1`    | `{ version: 1, items: Item[] }`                          |
| `backlogs:settings:v1` | `{ theme, defaultSort, defaultCategory, defaultStatus }` |

**The schema** is the `Item` interface — a single denormalized document
per item:

```ts
interface Item {
  id: ItemId // branded string, crypto.randomUUID()
  title: string
  category: CategoryId // closed set, from the registry
  status: Status // backlog | currently-using | completed
  // | paused | dropped | wishlist
  priority: Priority // high | medium | low | someday
  platform?: string
  estimatedLength?: string
  notes?: string
  tags: readonly string[]
  favorite: boolean
  dailyGoal?: { amount: number; unit: string }
  dailyProgress: readonly { date: string; amount: number }[] // local YYYY-MM-DD
  dateAdded: string // ISO
  dateStarted?: string
  dateCompleted?: string
  lastUpdated: string
}
```

**Relationships.** There are none, and that is the right call: an item has
no parent, and its daily progress is embedded because it is only ever read
with the item. Categories are a _registry_, not a table — a lookup by
value, not a foreign key. A relational schema here would be normalization
for its own sake.

**Indexes.** None, and none are needed. Everything is loaded into memory
and filtered with array methods, on a dataset of tens to low hundreds of
items. Anyone who suggests otherwise is optimizing a query that takes
microseconds.

**Migrations.** The `{ version, items }` envelope is the migration hook:
the version field exists so a future shape change can be detected and
upgraded on read. There is already a working example of forward
compatibility — items saved before daily goals existed carry neither
field, and `normalizeItem` fills a missing progress log with an empty
array instead of crashing on `undefined is not iterable`. Same envelope
for storage and for the export file, so a backup taken today is loadable
by a future version.

**Data access.** Through `ItemRepository` — `getAll`, `getById`, `save`,
`delete`, `replaceAll` — implemented by a LocalStorage adapter and an
in-memory one, both verified by a shared contract suite.

### The follow-up you should expect

> **"What breaks at scale?"**
>
> `getAll()` reads and reparses the whole blob on every query, so it's
> O(n) per read and n is bounded by the ~5 MB LocalStorage quota. At a few
> hundred items that's imperceptible. The honest migration is IndexedDB —
> and it's a contained change, because every repository method already
> returns a `Promise`, so no call site has to change. That was the point
> of making them async when the implementation was synchronous.

---

## Deployment

**Hosting:** GitHub Pages, project page at
`https://andreibautin.github.io/Backlogs/`. Free with no credit card,
provided the repository is public — which it is, and which is appropriate
for a portfolio piece.

**CI/CD:** two GitHub Actions workflows.

- `ci.yml` — typecheck, lint, format check, tests, and **both** builds
  (personal and demo, so a failure that only appears under `--mode demo`
  can't first surface at deploy time). A parallel job runs `pnpm audit` at
  the `high` threshold and `gitleaks` over the full history.
- `deploy.yml` — builds the demo bundle with the project-page base path
  and the commit metadata, asserts `404.html` was emitted, publishes to
  Pages, then **curls the live URL and greps for the app shell**. A green
  deploy means the site actually answered.

**Secrets:** none. Publishing uses the workflow's built-in OIDC token —
no deploy key, no PAT, no repository secret to rotate.

**Two details worth mentioning unprompted**, because they show you thought
about static hosting specifically:

> GitHub Pages has no rewrite rules, so `/Backlogs/goals` is a file that
> doesn't exist. The build emits `404.html` as a copy of `index.html` —
> the app boots and the router resolves the path. The response still
> carries HTTP 404, which is a status-code artifact of static hosting
> rather than a broken page, and I documented that rather than pretending
> it's clean.
>
> And a project page serves from a subpath, so Vite's `base` and the
> router's `basename` both have to know about `/Backlogs/`. They derive
> from the same value — the workflow sets `VITE_BASE_PATH`, Vite writes it
> into `BASE_URL`, and the config reads `routerBasename` back out of that.
> If they ever disagreed you'd get working assets and a 404 on every route,
> which is a confusing failure worth designing out.

**Configuration:** entirely environment-driven, and all of it public by
construction. `.env.example` says explicitly that a `VITE_` prefix makes a
value public and must never hold a credential.

---

## Testing

**355 tests, 52 files, ~25 seconds. No mocking library anywhere.**

Say why that last part is possible, because it is the strongest signal:

> There's no mocking because there's nothing to mock. `domain/` is pure
> functions, so tests call them directly. Everything else takes its
> dependencies as parameters — clocks, ID generators, loggers,
> repositories — so a test passes a real one instead of intercepting a
> module.

Four levels:

1. **Domain (16 files)** — the rules. Streaks with a grace day, calendar
   arithmetic across DST and leap days, sparse progress logs, ranking.
2. **Application (14 files)** — orchestration and error paths against
   in-memory repositories.
3. **Infrastructure (6 files)** — the **contract suite**, run against both
   adapters, which is what makes the in-memory fake trustworthy.
4. **Features (10 files)** — React Testing Library, asserting on what a
   user sees or what ended up in the repository. Never on internals.

**What is deliberately untested, and why** — offer this, it reads as
judgement rather than as a gap:

> Presentational components that just render props, Tailwind class
> strings, and third-party behaviour like Radix's focus trapping. And
> there's no coverage gate — coverage is about 97% on the inner layers,
> but nothing enforces a number, because chasing one produces tests
> written to raise it, and those are exactly the tests that don't catch
> bugs.

**The test worth naming specifically:**

> My favourite one scans the demo fixture for anything that looks like an
> email, a phone number, a URL, or a credential, and fails if it finds
> one. It's blunt, but the whole public deployment rests on that fixture
> being invented data, and I wanted that to be a thing CI checks rather
> than a thing I remembered.

---

## Deliberate simplifications

Volunteer these. Knowing where you _didn't_ build something is a stronger
signal than a longer feature list.

| Simplified                                 | What a production system would do       | Why it's fine here                                                                                                                                                           |
| ------------------------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No auth                                    | Sessions, hashing, RBAC                 | One user, one browser. Auth would require a server, which would remove the offline guarantee.                                                                                |
| No backend or database                     | API + Postgres + migrations             | Nothing to sync. The repository port makes it a contained change.                                                                                                            |
| Manual export/import instead of sync       | Real-time sync with conflict resolution | Honest about being manual, and needs no infrastructure.                                                                                                                      |
| No rate limiting, no WAF, no CORS config   | All of them                             | There's no endpoint to protect.                                                                                                                                              |
| No error-reporting SaaS or analytics       | Sentry, OpenTelemetry, dashboards       | All three mean shipping someone's private reading habits to a third party. Structured console logging plus GitHub's run logs are proportionate.                              |
| CI and deploy run in parallel              | Deploy gated on CI passing              | Keeps the loop short on a personal project. It's a one-line change (`needs: verify`) that I chose not to make — and I'd make it the moment anyone else depended on the demo. |
| Everything loaded into memory and filtered | Indexed, paginated queries              | Tens to hundreds of items. Indexing would be optimizing microseconds.                                                                                                        |
| Coverage as a diagnostic, not a gate       | An enforced threshold                   | Gates train people to write tests that raise the number.                                                                                                                     |

---

## Questions you should expect

**"Why not just use `useState` and `localStorage` directly? Isn't this
over-engineered for a to-do app?"**

> It would be over-engineered if the domain were trivial, and I'd push
> back on the layering for a CRUD form. But the rules here aren't trivial
> — streaks with a grace day, calendar arithmetic that survives DST,
> priority-then-age ranking, one backlog pick per category — and those are
> the things you want as pure functions you can test directly. The proof
> is the test suite: 355 tests in 25 seconds with no mocking. You don't
> get that shape from components calling `localStorage`.

**"How would you add multi-device sync?"**

> Write an `ApiItemRepository` implementing the existing interface, change
> the default in `di.ts`, and run the existing contract suite against it.
> The domain and every use-case are untouched — that's precisely why the
> port's methods return Promises even though LocalStorage is synchronous.
> The genuinely hard part isn't the plumbing, it's conflict resolution:
> `lastUpdated` gives you last-write-wins, which is probably right for a
> single-user multi-device app, but I'd want to think about the daily
> progress log specifically, since it's append-ish and would merge better
> than it would overwrite.

**"What happens if LocalStorage fills up?"**

> `setItem` throws `QuotaExceededError`. The repository catches it, logs
> the event, and rethrows a plain sentence the UI can show, with the
> original attached as `cause`. So it's a visible failure rather than
> silent data loss — which is the important part. The real fix is
> IndexedDB, and the port already allows it.

**"How do you know the demo doesn't contain your real data?"**

> Three independent barriers, all of them checkable. The fixture is a
> TypeScript literal in the public repository — generated, never exported
> from a device. Demo mode uses different LocalStorage keys, so the
> datasets can't collide. And seeding only ever writes into empty storage,
> so it can't overwrite anything. Plus a test that scans the fixture for
> anything resembling personal data. I verified the last one on the live
> site: the only key present is `backlogs:demo:items:v1`.

**"Why TanStack Query with no server?"**

> Because reads are still async — the repository returns Promises — and I
> still need caching and coordinated invalidation. One check-in
> invalidates four query keys and the row, the streak, the header, and the
> dashboard all update from one write. Hand-rolling that with `useEffect`
> is how you end up with stale UI.

**"What's the weakest part of this codebase?"**

> `getAll()` reading and reparsing the whole blob on every query. It's
> fine at this size and it's the thing I'd change first if the dataset
> grew. Second would be that the Discovery page filters in memory — same
> reasoning, same fix. Third, and more of a judgement call: demo mode
> leaks a small amount of awareness into two components. I decided one
> codebase with a flag beats two codebases that drift.

**"Walk me through a bug you found and fixed."**

> Two, both during productionization. The import validator only checked
> that `category` was a string, so an item could carry a category that
> isn't in the registry, pass the guard, get cast to `Item`, and then
> reach `getCategoryDefinition`, which throws. The type claimed
> `CategoryId` and the value wasn't one — I fixed it by validating against
> the registries at the boundary, which is what makes the type-level
> confidence everywhere else honest.
>
> The other was live: I'd put `frame-ancestors` in a `<meta>` CSP, and the
> deployed site logged an error on every page load because that directive
> is ignored when delivered that way. I removed it rather than shipping a
> header that looks like protection and provides none.

**"Why is `dailyProgress` stored as `YYYY-MM-DD` instead of timestamps?"**

> Because a daily goal is a human, local-clock concept. If I stored ISO
> timestamps and grouped by UTC day, "today" would roll over at UTC
> midnight for the user, which for anyone west of Greenwich means their
> streak breaks in the evening. So the key is the _local_ calendar day.
> And `shiftDateKey` goes through a real `Date` and `setDate` rather than
> subtracting 86,400,000 ms, because a day isn't always 24 hours long —
> that's tested across DST transitions and leap days.

**"What would you do differently if you started over?"**

> I'd reach for IndexedDB from the start rather than LocalStorage — it's
> barely more work behind a repository and it removes the quota ceiling.
> And I'd add the configuration layer at the beginning instead of
> retrofitting it; almost every productionization change traced back to
> "nothing could differ between environments", which is cheap to design in
> and tedious to add later.

---

## Things to avoid saying

- **"It's fully secure."** Say what the threat model is and what you did
  about it. Name the clickjacking gap before they find it.
- **"100% test coverage."** It is 97.6% on the inner layers and there is
  no gate. Say that, and say why the gate is deliberately absent.
- **"It uses Clean Architecture."** Say what the layers are and why they
  earn their keep. Naming a pattern invites a pattern quiz; describing a
  decision invites a conversation.
- **"It's production-ready."** It is a deployed, tested, documented
  portfolio application with a specific and deliberate scope. That is a
  stronger claim because it is true.
