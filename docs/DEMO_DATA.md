# Demo data

The public demo at **https://andreibautin.github.io/Backlogs/** is
populated with an invented backlog. This document explains what that data
is, how it gets there, and — the part that actually matters — why the
owner's real backlog cannot reach it.

## The strategy in one paragraph

Demo data is **generated from a fixture checked into the repository**, not
captured from a running app. It is seeded into the browser on first visit,
under storage keys that belong to demo mode alone, and only ever into
empty storage. There is no export step, no snapshot, and no personal
device anywhere in the pipeline.

## Why the demo needs data at all

An empty backlog manager is indistinguishable from a broken one. Every
interesting thing this app does — ranking what to start next, computing a
streak, aging the backlog, surfacing the oldest thing you never got to —
is a function of accumulated history. A visitor who lands on an empty
dashboard learns nothing about whether any of it works.

So the demo ships with 38 items representing roughly two years of use.

## What is in it

38 items spanning all 10 categories and all 6 statuses.

| Group                        | Count | What it demonstrates                                  |
| ---------------------------- | ----- | ----------------------------------------------------- |
| In progress with daily goals | 6     | The Goals board: streaks, partial days, targets       |
| In progress without a goal   | 1     | The board correctly skipping it                       |
| Completed                    | 11    | Recently Finished, completion stats, monthly averages |
| Backlog                      | 12    | Start Next — one pick per category                    |
| Paused / dropped / wishlist  | 5     | The statuses a backlog app actually needs             |
| Deliberate edge cases        | 3     | See below                                             |

**Everything in it is invented.** The titles are well-known public works —
games, books, shows — chosen because a backlog of recognizable things is
immediately legible in a way that fictional placeholder titles are not. A
title is a public fact, not personal information, and the notes attached
to them are written for the demo.

### The streaks are the point

Six items carry a daily goal, and their progress logs are shaped to show
different states at once:

| Item                                  | Goal           | Today       | Streak | Why it is there                                                       |
| ------------------------------------- | -------------- | ----------- | ------ | --------------------------------------------------------------------- |
| Baldur's Gate 3                       | 1 quest/day    | met         | 9 days | A healthy, unbroken run                                               |
| The Eye of the World                  | 2 chapters/day | 1 of 2      | 6 days | A partly-done day, and the grace day keeping the streak alive         |
| Severance                             | 1 episode/day  | met         | 3 days | A gap three days back — current streak and best streak differ         |
| Vinland Saga                          | 2 episodes/day | not started | 4 days | Nothing logged today; the streak survives until a day is fully missed |
| Chainsaw Man                          | 3 chapters/day | 0 of 3      | 0      | A goal with no progress at all                                        |
| Designing Data-Intensive Applications | 1 chapter/day  | met         | 1 day  | What a real long-running goal actually looks like: sparse             |

That last one matters. A demo where every streak is perfect looks
synthetic. This one has a stalled goal, a half-finished day, and a book
someone has been picking at for three months.

### Deliberate edge cases

- **`Blindsight`** — title and category only, every optional field unset.
  Exercises the sparse-item rendering path in cards, the drawer, and
  search results.
- **`Shin Megami Tensei III: Nocturne HD Remaster — Maniax Chronicle Edition`** —
  a long title with punctuation and an em dash, so truncation and wrapping
  get demonstrated rather than assumed.
- **`Look Back`** — added and completed on the same day. Appears in both
  Recently Added and Recently Finished, and makes the same-day date
  arithmetic visible.
- **`Blame!`** — added nearly two years ago and never opened. This is what
  the Goals page's _oldest unfinished item_ stat lands on, and it is what
  makes the average-backlog-age figure honest.

## Why the dates are relative

Every date in the fixture is an **offset from the moment of seeding**, not
a fixed timestamp:

```ts
{ id: 'demo-008', title: 'Outer Wilds', status: 'completed',
  addedDaysAgo: 512, startedDaysAgo: 104, completedDaysAgo: 3 }
```

A fixture pinned to absolute dates rots. Opened a year after it was
written it shows a dead streak, an empty "completed this month", and
nothing recently finished — a demo that quietly stops demonstrating
anything. Offsets mean the demo reads as a live backlog whenever someone
opens it.

This costs nothing in determinism: `createDemoItems(now)` is a pure
function, so the same `now` always produces byte-identical items. A test
asserts that, and another asserts the demo still shows a live streak when
generated more than a year in the future.

## How seeding works

```
Browser loads the demo build (VITE_APP_MODE=demo)
        │
DemoBootstrap  (features/demo/DemoBootstrap.tsx)
        │  blocks the first paint — a dashboard that renders empty and
        │  then repopulates makes a working demo look broken
        ▼
seedDemoData()  (application/use-cases/seed/seed-demo-data.ts)
        │
        ├─ repository.getAll()
        │       └─ non-empty?  →  return { seeded: false }   ← nothing is written
        │
        └─ empty?
                ├─ createDemoItems(new Date())    ← infrastructure/seed/demo-backlog.ts
                └─ repository.replaceAll(items)   → backlogs:demo:items:v1
```

The fixture is **injected**, not imported: `createSeedDemoDataUseCase`
takes `(repository, createDemoItems)`. The concrete fixture lives in
`infrastructure/`, and application code is not allowed to point outward —
so the composition root wires it in, exactly the way a repository is.

## The three barriers between personal data and the demo

This is the part worth being able to explain out loud.

**1 · The data is generated, not captured.** There is no export step
anywhere in the pipeline. The demo's contents are a TypeScript literal in
`src/infrastructure/seed/demo-backlog.ts` that anyone reading the public
repository can inspect line by line.

**2 · The storage namespaces are disjoint.**

| Mode       | Items key                | Settings key                |
| ---------- | ------------------------ | --------------------------- |
| `personal` | `backlogs:items:v1`      | `backlogs:settings:v1`      |
| `demo`     | `backlogs:demo:items:v1` | `backlogs:demo:settings:v1` |

The personal keys are frozen at their original values — renaming them
would orphan every backlog already saved in someone's browser — and a test
pins them for that reason. The demo build reads and writes only its own
namespace, so even running both builds on `localhost:5173` on consecutive
days cannot let one see the other. On the deployed site the point is
moot anyway: `andreibautin.github.io` is a different origin entirely and
could not read a local backlog under any circumstances.

**3 · Seeding is empty-storage-only.** `seedDemoData` returns early
without calling the fixture factory at all when anything is stored. This
is the safety property, not an optimization, and it is tested from three
angles: existing data survives, the factory is never even invoked, and
running the seed twice seeds once.

A fourth, belt-and-braces check: an automated test scans the serialized
fixture for anything resembling an email address, a phone number, a URL,
or a credential, and fails if it finds one.

## Demo credentials

**There are none, because there is no login.** The app has no accounts,
no sessions, and no server. A visitor lands on a fully populated backlog
and can immediately edit it. Nothing is gated.

Anything a visitor changes is saved in _their own_ browser's
LocalStorage. It is not shared with other visitors and not visible to
anyone else.

## Resetting the demo

**As a visitor:** Settings → Demo → _Reset demo data_. It asks for
confirmation, then regenerates the fixture as of now. The section only
renders in demo mode — the destructive control does not exist in the build
pointed at real data, rather than merely being hidden.

**As a developer:**

```bash
pnpm dev:demo
```

then clear the site's LocalStorage, or use the same Settings control. To
start completely fresh, run this in the browser console and reload:

```js
localStorage.removeItem('backlogs:demo:items:v1')
localStorage.removeItem('backlogs:demo:settings:v1')
```

**On the deployed site:** there is no server-side state to reset. Every
visitor gets their own copy on first load.

`resetDemoData` is a _separate use-case_ from `seedDemoData` rather than a
flag on it, so that "unconditionally replace everything" and "fill only if
empty" cannot be confused for one another at a call site.

## Editing the fixture

Everything lives in one array in
[`src/infrastructure/seed/demo-backlog.ts`](../src/infrastructure/seed/demo-backlog.ts).
Add an entry, and the tests will tell you if you broke something:

- every generated item must pass `isPlausibleItem` — the same gate an
  imported backup file has to clear;
- all 10 categories and all 6 statuses must still be represented;
- the dashboard must still fill all four sections;
- the goals board must still show a live streak and still not be entirely
  green;
- nothing may look like personal data.

Bump `DEMO_ITEM_COUNT`'s expectation only by adding items — the count is
asserted so the fixture cannot silently shrink.
