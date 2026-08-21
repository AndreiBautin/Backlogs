# Backlogs

[![CI](https://github.com/AndreiBautin/Backlogs/actions/workflows/ci.yml/badge.svg)](https://github.com/AndreiBautin/Backlogs/actions/workflows/ci.yml)
[![Deploy](https://github.com/AndreiBautin/Backlogs/actions/workflows/deploy.yml/badge.svg)](https://github.com/AndreiBautin/Backlogs/actions/workflows/deploy.yml)

A backlog manager for everything you've been meaning to get to — games,
TV, movies, anime, books, manga, podcasts, music, YouTube, courses — with
one job: **help you decide what to consume next, and cut the decision
fatigue.**

Not a social network, not a rating site, not a cloud service. No accounts,
no ratings, no feed. Your backlog lives in your browser and goes nowhere
else.

## Live demo

### → **https://andreibautin.github.io/Backlogs/**

**No sign-in — there isn't one.** The app has no accounts and no server,
so there is nothing to log into. The demo opens on a populated backlog of
38 invented items representing about two years of use, so the streaks,
stats, and rankings actually have something to work with.

Everything is editable. Anything you change is saved in _your_ browser and
nobody else's, and **Settings → Demo → Reset demo data** puts it back.
**Settings → About** shows the exact commit the page was built from.

Worth clicking, in this order:

1. **Dashboard** — _Start Next_ picks the strongest backlog candidate in
   each category, so one category can't crowd out the rest.
2. **Goals** — six live daily-goal streaks, deliberately including a
   stalled one and a half-finished day. A demo where everything is green
   demonstrates nothing.
3. **Discovery** — search and five filters over the whole backlog.

The demo data is invented and checked into this repository — see
[docs/DEMO_DATA.md](docs/DEMO_DATA.md) for the three independent barriers
that keep real personal data out of it.

Every push to `master` redeploys automatically, and only after the full
test suite passes — see [Deployment](#deployment).

## Features

- **Dashboard** — Continue, Start Next (the best backlog pick in _each_
  category, so one category can't crowd out the rest), Recently Finished,
  Recently Added, and live stats.
- **Quick capture** — press `N` anywhere. A title and a category is all it
  takes; everything else is optional and can be filled in later.
- **Discovery** — free-text search plus category, status, priority,
  platform, and tag filters, with five sort orders.
- **Daily goals** — attach "1 chapter/day" or "2 episodes/day" to anything
  in progress, check in daily, and build a streak. Streaks have a grace
  day, so they die only when a day is fully missed, not the moment
  midnight passes.
- **Goals page** — completion streak, completions this month and year,
  average completions per month, average backlog age, and the oldest thing
  you never got to.
- **Item details** — a drawer for status, priority, platform, notes, and
  goals. Dates are stamped automatically as things start and finish.
- **Settings** — theme and defaults for sort, category, and status.
- **Backup / restore** — export your whole backlog to JSON, import it back
  on any device. Manual sync, honestly labelled.

## Architecture

Four layers with dependencies pointing inward only:

```
features/        React pages, components, query hooks
    ↓
application/     one use-case per user intent — orchestration only
    ↓
domain/          entities, services, repository PORTS — pure TypeScript
    ↑
infrastructure/  LocalStorage + in-memory ADAPTERS
```

`domain/` imports no React and no browser API, so every business rule is a
pure function tested by calling it. The repository _interfaces_ live in
`domain/` and their _implementations_ in `infrastructure/`, which is what
lets the entire UI test suite run against in-memory storage. `src/app/di.ts`
is the only file in the codebase that names a concrete repository.

**→ [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — the layers, a request
traced end to end, error handling, and why this shape is justified here.

## Tech stack

| Technology                          | Why                                                                                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **React 19 + TypeScript**           | Strict mode with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`. The type system carries real weight here — `CategoryId` is derived from the category registry, so the type and the data cannot drift. |
| **Vite 8**                          | Fast builds, first-class TS, and a config small enough to read in one screen.                                                                                                                                       |
| **React Router 7**                  | Routing, with `basename` driven from the same value as the asset base path so a subpath deploy can't half-work.                                                                                                     |
| **TanStack Query 5**                | Caching and coordinated invalidation. Reads are async even against LocalStorage, and one check-in invalidates four query keys.                                                                                      |
| **Zustand**                         | Only for genuinely ephemeral UI state — "is the modal open". Kept deliberately separate from data.                                                                                                                  |
| **Tailwind v4 + shadcn/ui (Radix)** | Accessible primitives without a component library's opinions.                                                                                                                                                       |
| **Vitest + React Testing Library**  | 355 tests in ~25 seconds.                                                                                                                                                                                           |
| **LocalStorage**                    | Zero setup, works offline, no account. Behind a repository interface whose methods all return Promises — so swapping in IndexedDB or an API is one file.                                                            |

## Security

No server, no account, no session, no data leaving the browser — so most
classic web vulnerabilities are absent by construction rather than
defended against. What's left is small and real, and got the attention:

- **Content-Security-Policy** with `script-src 'self'` (no
  `unsafe-inline`, no `unsafe-eval`), verified on the live site by
  injecting a script tag and watching it fail to run. `connect-src 'self'`
  makes "this app never phones home" browser-enforced.
- **Validation at the trust boundary.** Imported files and LocalStorage
  are both untrusted: closed value sets are checked against their
  registries, prototype-polluting keys are stripped, and there are 5 MB /
  10 000-item resource caps.
- **Logging that can't leak.** Records carry event names and scalars,
  never item content.
- **CI gates.** `pnpm audit` at the `high` threshold plus `gitleaks`, on
  every push and again weekly — an advisory can be published against a
  dependency that hasn't changed. The audit gate caught a real advisory on
  its first run and it was fixed rather than suppressed.
- **Dependencies kept current.** Dependabot batches routine bumps into one
  weekly PR and gives every major its own, so a breaking change can be
  read in isolation. Vulnerability alerts and automated security fixes are
  both on.
- **No secrets anywhere,** because there is nothing to authenticate to.
  Deployment uses the workflow's built-in OIDC token.

**→ [docs/SECURITY.md](docs/SECURITY.md)** — the threat model, every
finding and its fix, and the remaining risks stated plainly.

## Testing

**355 tests across 52 files, ~25 seconds, no mocking library anywhere** —
possible because `domain/` is pure functions and everything else takes its
dependencies as parameters. Priority goes to business rules, the trust
boundary, destructive operations, and whole user workflows. The repository
_contract_ suite runs against both the LocalStorage and in-memory
adapters, which is what makes the in-memory double trustworthy.

**→ [docs/TESTING.md](docs/TESTING.md)** — including what's deliberately
_not_ tested, and why there's no coverage gate.

## Deployment

GitHub Actions → GitHub Pages. Free, no credit card, no new account, and
no secret to rotate — publishing authenticates with the workflow's
built-in OIDC token.

Pushing to `master` runs three jobs in sequence:

| Job                          | What it does                                                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Verify before publishing** | `pnpm verify` — typecheck, lint, format, 355 tests, build. Nothing gets past this.                                                              |
| **Build the demo bundle**    | Builds with the project-page base path and the commit metadata, then asserts `404.html` was emitted — without it every deep link is a dead end. |
| **Publish**                  | Deploys to Pages, then curls the live URL and greps for the app shell. A green deploy means the site actually answered.                         |

`master` is protected: force-pushes and deletion are blocked, and both CI
checks are required before any pull request can merge.

**→ [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — provider choice and the
alternatives rejected, the SPA fallback, base-path handling, and a
troubleshooting table.

## Local development

Requires **Node 22+** and **pnpm 11** (pinned via `packageManager`, so
Corepack will fetch the right version).

```bash
git clone https://github.com/AndreiBautin/Backlogs.git
cd Backlogs
pnpm install        # also installs the pre-push hook — see Quality gates
pnpm dev            # http://localhost:5173 — your own backlog, empty to start
```

That's the whole setup. No database to provision, no services to start, no
environment file to create — the app has no backend, so there is nothing
to configure before it runs.

The two modes use **separate LocalStorage keys**, so you can run both
without either touching the other's data:

```bash
pnpm dev            # personal — your own backlog
pnpm dev:demo       # demo — seeded with the same 38 items the live site uses
```

**Windows:** double-click [`start.bat`](start.bat) — it installs
dependencies on first run, starts the dev server in its own window, and
opens your browser.

Press **`N`** anywhere to quick-capture a new item.

### Commands

| Command                          | What it does                                       |
| -------------------------------- | -------------------------------------------------- |
| `pnpm dev` / `pnpm dev:demo`     | Dev server, personal or demo mode                  |
| `pnpm test` / `pnpm test:run`    | Tests, watch or single run                         |
| `pnpm test:coverage`             | Coverage report                                    |
| `pnpm typecheck`                 | `tsc -b`                                           |
| `pnpm lint` / `pnpm format`      | ESLint / Prettier                                  |
| `pnpm build` / `pnpm build:demo` | Production build                                   |
| `pnpm audit`                     | Dependency vulnerabilities at the `high` threshold |
| **`pnpm verify`**                | **Everything CI runs, in one command**             |

### Quality gates

`pnpm install` wires up a **pre-push hook** that runs `pnpm verify` and
refuses the push if anything fails (`git push --no-verify` to bypass). The
deploy runs the same command before it publishes, so nothing reaches the
live demo that hasn't passed.

Three rules that are usually left to convention are enforced by lint here,
each with a message explaining the reasoning:

- **The layer boundaries.** `domain/` cannot import React or any other
  layer; `application/` cannot import `infrastructure/`.
- **No `console.*`** outside the structured logger, which is built to
  carry event names and scalars rather than anything a user typed.
- **No `localStorage`** outside the storage adapters, so every key keeps
  coming from `config/storage-keys.ts` and the demo and personal
  namespaces cannot collide.

And `src/features/demo/demo-parity.test.tsx` fails if any page renders its
empty state against the demo fixture — the specific way a feature can work
locally and still look broken to someone clicking the live link.

Conventions for extending the app are in [CLAUDE.md](CLAUDE.md).

### Configuration

Copy [`.env.example`](.env.example) to `.env.local` to override anything.
Every value is public by construction — a `VITE_` prefix compiles a
variable into the browser bundle, which is exactly why this project has no
secrets and no place to put one.

## Documentation

| Document                                                             | What's in it                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------- |
| [Architecture](docs/ARCHITECTURE.md)                                 | Layers, request lifecycle, error handling, configuration      |
| [Domain model](docs/DOMAIN_MODEL.md)                                 | `Item`, categories, status, priority, the domain services     |
| [Security](docs/SECURITY.md)                                         | Threat model, findings and fixes, remaining risks             |
| [Testing](docs/TESTING.md)                                           | Strategy per layer, what's untested and why                   |
| [Deployment](docs/DEPLOYMENT.md)                                     | Hosting, CI/CD, troubleshooting, free-tier limits             |
| [Demo data](docs/DEMO_DATA.md)                                       | What's in the demo and how personal data is kept out          |
| [Interview guide](docs/INTERVIEW_GUIDE.md)                           | Plain-English walkthrough of every major decision             |
| [Productionization assessment](docs/PRODUCTIONIZATION_ASSESSMENT.md) | The before-state, the gaps, and the order they were closed in |
| [Test strategy](docs/TEST_STRATEGY.md)                               | The original TDD discipline the app was built with            |
| [Implementation plan](docs/IMPLEMENTATION_PLAN.md)                   | How the four milestones were built                            |

## Reusable workflow

The process that took this app from a private tool to a deployed,
documented portfolio project is packaged as a Claude Code skill:

```
/portfolio-productionize
```

It's technology-agnostic — it inspects whatever stack it finds, assesses
architecture and security, builds safe demo data, adds CI/CD, deploys to
free no-credit-card infrastructure, verifies the result against the live
URL, and writes the interview guide. A final phase leaves the guardrails
behind — enforced architecture rules, a gated deploy, a pre-push hook — so
the repo stays at the bar instead of decaying back to a snapshot. See
[`.claude/skills/portfolio-productionize/SKILL.md`](.claude/skills/portfolio-productionize/SKILL.md).

## License

Personal project, published for portfolio purposes.
