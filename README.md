# Backlogs

A personal backlog management app with one job: help you decide what to
consume next and cut decision fatigue. Games, TV, movies, anime, books,
manga, podcasts, music, YouTube, courses — one place, no social features,
no ratings, no accounts, no cloud.

## Features

- **Dashboard** — Continue, Start Next, Recently Finished, Recently Added,
  and quick stats, all computed the moment you open the app.
- **Quick Capture** — press `N` anywhere, title + category is all it takes.
- **Discovery** — free-text search plus category/status/priority/
  platform/tag filters and five sort orders.
- **Item Details** — a drawer to edit status, priority, platform, and
  notes; dates are tracked automatically.
- **Goals** — completion streak, completions this month/year, average
  completions per month, average backlog age, and your oldest unfinished
  item.
- **Settings** — theme, and defaults for sort/category/status.
- **Backup / Restore** — export your whole backlog to a JSON file, import
  it back (or on a different device) at any time.

## Stack

React + TypeScript (strict) + Vite, React Router, TanStack Query, Zustand,
Tailwind v4 + shadcn/ui, Vitest + React Testing Library. Storage is
LocalStorage today, abstracted behind a repository interface so swapping
in SQLite or a real API later touches one file.

## Getting started

**Windows:** double-click [`start.bat`](start.bat) — it installs
dependencies on first run, starts the dev server in its own window, and
opens the app in your browser.

**Manual / other platforms:**

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # watch mode
pnpm test:run   # single run
pnpm typecheck
pnpm lint
pnpm build
```

Press **N** anywhere in the app to quick-capture a new item.

## Docs

- [Architecture](docs/ARCHITECTURE.md) — the four layers, dependency
  direction, and why it's shaped this way.
- [Domain model](docs/DOMAIN_MODEL.md) — `Item`, categories, status,
  priority, the domain services.
- [Test strategy](docs/TEST_STRATEGY.md) — what's tested at each layer,
  the TDD discipline, and the test helpers.
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md) — how the four
  milestones were built, one vertical slice at a time.
