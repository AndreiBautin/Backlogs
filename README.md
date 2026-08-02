# Backlogs

A personal backlog management app with one job: help you decide what to
consume next and cut decision fatigue. Games, TV, movies, anime, books,
manga, podcasts, music, YouTube, courses — one place, no social features,
no ratings, no accounts, no cloud.

## Stack

React + TypeScript (strict) + Vite, React Router, TanStack Query, Zustand,
Tailwind v4 + shadcn/ui, Vitest + React Testing Library. Storage is
LocalStorage today, abstracted behind a repository interface so swapping
in SQLite or a real API later touches one file.

## Getting started

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
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md) — what's shipped
  (Milestone 1) and the roadmap for Discovery, Goals, and Settings.
