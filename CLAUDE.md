# Working on Backlogs

A client-only React + TypeScript SPA. **No server, no database, no network
calls.** Persistence is LocalStorage behind a repository interface. That
constraint is the product, not a limitation — see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Before you finish anything

```bash
pnpm verify    # typecheck + lint + format:check + test:run + build
```

A pre-push hook runs this automatically and refuses the push if it fails.
The same command gates the deploy. If `pnpm verify` is green, the feature
is shippable; if it is not, it is not — there is no third state.

## The layer rule

Dependencies point **inward only**. This is enforced by ESLint
(`no-restricted-imports` in `eslint.config.js`), not by convention, so
breaking it fails the build with an explanatory message.

```
features/  →  application/  →  domain/  ←  infrastructure/
```

| Layer               | May import         | Never imports                                     |
| ------------------- | ------------------ | ------------------------------------------------- |
| `domain/`           | nothing but itself | React, browser APIs, any library, any other layer |
| `application/`      | `domain/`          | `infrastructure/`, `features/`, React             |
| `infrastructure/`   | `domain/`          | `features/`, `app/`, React                        |
| `features/`, `app/` | anything           | —                                                 |

If a use-case needs something concrete — a repository, a fixture, a clock —
**take it as a parameter** and wire it in `src/app/di.ts`. That file is the
only place in the codebase allowed to name a concrete implementation.

## Where new code goes

Adding a feature usually means a slice through all four layers, inner
first:

1. **`domain/`** — the rule, as a pure function. Add `x.test.ts` beside it.
2. **`application/use-cases/<area>/`** — a factory taking dependencies and
   returning a function. Load → apply the domain rule → save.
3. **`app/di.ts`** — register it on `AppUseCases`.
4. **`features/<area>/hooks/`** — a TanStack Query hook resolving the
   use-case via `useUseCases()`.
5. **`features/<area>/`** — the component.
6. **`src/infrastructure/seed/demo-backlog.ts`** — data that exercises it,
   if the feature is data-driven. See "Demo parity" below.

Adding a **content category** is a one-line addition to `CATEGORY_REGISTRY`
and nothing else. `CategoryId` is derived from that array, so the type and
the data cannot drift. Never `switch` on a specific category.

## Non-negotiables

These are each enforced by a lint rule or a test. They are listed here so
you know _why_, not to remind you to check — the pipeline checks.

- **No `console.*`.** Use the injected `Logger`. Records carry an event
  name and a flat bag of **scalars** — never a title, a note, or anything
  a user typed. That is what makes logging safe to leave on in production.
  `src/shared/logging/logger.ts` is the one exempt file.
- **No `localStorage` outside `src/infrastructure/storage/`.** Keys come
  from `config/storage-keys.ts`, namespaced by mode. The `personal` keys
  are **frozen** — renaming one orphans every backlog already saved in
  someone's browser, and a test pins them for that reason.
- **Inject the clock.** Domain functions take `now` as a parameter; never
  call `new Date()` inside one. Tests that reach for the real clock are
  the ones that fail at midnight, at month boundaries, or in another
  timezone.
- **Validate at the trust boundary.** Anything entering from outside — an
  imported file, LocalStorage — goes through `parseItemEnvelope`, which
  **never throws** and returns `envelopeValid` so a bad file is not
  mistaken for an empty one. Closed value sets are checked against their
  registries, not just `typeof === 'string'`.
- **No secrets, ever.** A `VITE_` prefix compiles a value into the browser
  bundle — the prefix is what makes it _public_. There is nothing to
  authenticate to, so there is no reason to add one.

## Demo parity — the deployed version and yours

The app runs in two modes off one codebase, switched by `VITE_APP_MODE`:

|               | `personal` (default) | `demo` (deployed)             |
| ------------- | -------------------- | ----------------------------- |
| Storage keys  | `backlogs:items:v1`  | `backlogs:demo:items:v1`      |
| Seeded?       | never                | on first visit, only if empty |
| Reset control | hidden               | Settings → Demo               |

**A feature that works locally can still be broken on the live demo** — if
the fixture has no data that exercises it, a stranger sees an empty box.
`src/features/demo/demo-parity.test.tsx` guards this: every page must show
real content in demo mode, and every headline stat must be non-zero.

So: **if a new feature displays data, add data for it to
`src/infrastructure/seed/demo-backlog.ts`** and assert it in that file.

Two rules about the fixture itself:

- **Generated, never captured.** Never paste in a personal export. A test
  scans it for anything resembling an email, phone number, URL, or
  credential.
- **Relative dates only** (`addedDaysAgo: 46`), never fixed timestamps. A
  fixture pinned to absolute dates shows a dead streak and an empty "this
  month" a year from now.

Check both modes when the change is data-driven:

```bash
pnpm dev        # personal — your real backlog
pnpm dev:demo   # demo — separate keys, your data untouched
```

## Testing

355 tests, ~25s, **no mocking library anywhere** — possible because
`domain/` is pure and everything else takes its dependencies as
parameters. Keep it that way: if you find yourself wanting to mock a
module, the dependency should have been a parameter.

- Domain rules → call the function directly.
- Use-cases → run against `InMemoryItemRepository`.
- Repositories → add cases to the shared `*.contract.ts` suite so **both**
  adapters are held to them.
- Components → `renderWithProviders`, asserting on what a user sees or
  what landed in the repository. Never on internals.

Use `buildItem(overrides)` for fixtures, `createTestLogger()` to assert on
log events, and `DEMO_TEST_CONFIG` / `PERSONAL_TEST_CONFIG` to pick a mode.

Don't chase coverage. There is no gate, deliberately —
[docs/TESTING.md](docs/TESTING.md) explains what is left untested and why.

## Deploying

Push to `master`. The deploy workflow runs `pnpm verify`, builds the demo
bundle with the project-page base path, asserts `404.html` was emitted,
publishes to GitHub Pages, then curls the live URL to confirm it answered.

Live: https://andreibautin.github.io/Backlogs/

If you touch routing or asset paths, remember the app is served from
`/Backlogs/`, and that Vite's `base` and the router's `basename` both
derive from `VITE_BASE_PATH`. They must never be set independently.

## Keeping docs honest

The docs describe what the code does. If a change makes one of them wrong,
fix it in the same commit:

- Layer or dependency change → [ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Entity, validation, or envelope change → [DOMAIN_MODEL.md](docs/DOMAIN_MODEL.md)
- Anything touching input handling or the CSP → [SECURITY.md](docs/SECURITY.md)
- Fixture change → [DEMO_DATA.md](docs/DEMO_DATA.md)
- New decision worth explaining aloud → [INTERVIEW_GUIDE.md](docs/INTERVIEW_GUIDE.md)

`TEST_STRATEGY.md` and `IMPLEMENTATION_PLAN.md` are historical records.
Leave them alone.

## Style

Match the surrounding code. It has a distinct voice worth preserving:
comments explain **why**, not what, and the tricky ones (the streak grace
day, `shiftDateKey` going through a real `Date`, the `envelopeValid` flag)
say what breaks if you get it wrong. Prettier settings are non-negotiable
and automatic — no semicolons, single quotes, 90 columns.
