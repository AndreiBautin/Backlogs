# Productionization Assessment

A snapshot of Backlogs as it stood before the productionization pass, the
gaps that stood between it and something publicly demonstrable, and the
order the work was done in.

Baseline measured at commit `c3aee30`: **257 tests passing across 42 files,
`tsc -b` clean, `eslint .` clean, `vite build` succeeding** (493 kB JS /
154 kB gzipped). This was not a broken app being rescued — it was a
well-built private app that had never been asked to face the public.

## Current architecture (before)

A **client-only React SPA**. There is no server, no database, and no
network I/O of any kind. The entire app is static assets plus the
browser's LocalStorage.

```
React 19 + TypeScript (strict) + Vite 8
React Router 7 (BrowserRouter)  ·  TanStack Query 5  ·  Zustand
Tailwind v4 + shadcn/ui (Radix primitives)
Vitest + React Testing Library + jsdom
Persistence: window.localStorage, behind a repository interface
```

Four layers with inward-pointing dependencies:

| Layer                | Contents                                                   | Depends on       |
| -------------------- | ---------------------------------------------------------- | ---------------- |
| `domain/`            | Entities, value objects, pure services, repository _ports_ | nothing          |
| `application/`       | Use-cases, one per user intent                             | domain           |
| `infrastructure/`    | LocalStorage + in-memory repository _adapters_             | domain           |
| `features/` + `app/` | Pages, components, hooks, DI composition root              | all of the above |

### Strengths

- **The layering is real, not aspirational.** `domain/` imports no React
  and no browser API; every business rule (validation, the
  auto-stamp-`dateStarted`/`dateCompleted` transitions, streak
  computation, sorting, filtering) is a pure function that tests exercise
  directly with no mocks.
- **Ports and adapters are honest.** `ItemRepository` and
  `SettingsRepository` are interfaces in `domain/`; both a LocalStorage
  and an in-memory adapter implement them, and a shared `*.contract.ts`
  test suite runs against _both_ — so the fake used in tests is provably
  interchangeable with the real one.
- **One composition root.** `src/app/di.ts` is the only file that names a
  concrete repository. Everything above it receives use-cases through
  React context, which is exactly what makes the whole UI testable
  against in-memory storage.
- **Strict TypeScript, and it means it.** `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`, `erasableSyntaxOnly`, plus
  `tseslint.configs.strictTypeChecked`. Very few codebases run this hot.
- **The category registry is a genuine extension point.** `CategoryId` is
  _derived_ from the registry array, so the type and the data cannot
  drift. No service anywhere branches on a specific category.
- **Corruption tolerance was already designed in.** `parseItemEnvelope`
  never throws, distinguishes "not an envelope at all" from "a
  legitimately empty envelope", and drops individual malformed items
  rather than failing the whole load.

### Weaknesses

| #   | Weakness                                                                                                                        | Impact                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| W1  | **No error boundary.** A render-time throw unmounts the tree.                                                                   | Any bug becomes a white screen with no recovery path.                                                                 |
| W2  | **No 404 route.** The router had four paths and no catch-all.                                                                   | An unknown URL rendered an empty `<main>` inside a working shell.                                                     |
| W3  | **No configuration layer.** Nothing read from the environment; `di.ts` hardcoded `window.localStorage`.                         | Nothing could differ between dev, test, prod, and demo.                                                               |
| W4  | **Router assumed a root-path deploy.** `createBrowserRouter` with no `basename`.                                                | Every route would 404 under a project-page subpath.                                                                   |
| W5  | **Logging was two raw `console.warn` calls.**                                                                                   | No severity, no structure, and storage-corruption warnings printed to a production console.                           |
| W6  | **Import had no resource limits.** Any size file, any item count.                                                               | A large or hostile file could hang the tab.                                                                           |
| W7  | **`normalizeItem` trusted `category`/`status`/`priority` as any string.** `isPlausibleItem` only checked `typeof === 'string'`. | An imported item could carry `category: "not-a-category"` past the gate and reach UI code that does registry lookups. |
| W8  | **Single 493 kB bundle.**                                                                                                       | Fine at this size, but no vendor split and no bundle-size awareness.                                                  |
| W9  | **No CI.** All quality gates existed as scripts nobody was forced to run.                                                       | Green tests were a matter of discipline, not of policy.                                                               |
| W10 | **No deployment of any kind.**                                                                                                  | Nothing to show anyone.                                                                                               |

## Security concerns

The threat model is unusual and worth stating plainly, because it is the
single most important thing to understand about this app: **there is no
server, no account, no session, and no data that leaves the browser.**
Whole categories of vulnerability are structurally absent rather than
defended against — there is no SQL to inject, no session to fixate, no
CSRF because there is no state-changing endpoint, no IDOR because there
is no server-side object to reference, and no authorization boundary
because every user's data is confined to their own browser origin.

What _is_ real:

| ID  | Finding                                                                             | Severity                 | Status                                                                                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1  | No Content-Security-Policy.                                                         | Medium                   | Fixed — CSP plus `X-Content-Type-Options` / `Referrer-Policy` / frame-ancestors equivalents.                                                                                                                 |
| S2  | Import accepted unbounded input.                                                    | Medium                   | Fixed — 5 MB / 10 000-item caps, surfaced as a warning.                                                                                                                                                      |
| S3  | Import's plausibility check did not validate closed value sets (W7).                | Medium                   | Fixed — `category` / `status` / `priority` now checked against the registries.                                                                                                                               |
| S4  | `__proto__` / `constructor` / `prototype` keys survived import into spread objects. | Low                      | Fixed — polluting keys stripped during normalization.                                                                                                                                                        |
| S5  | Storage-corruption details logged to the console verbatim.                          | Low                      | Fixed — the logger suppresses `debug`/`info` in production and never logs item content.                                                                                                                      |
| S6  | No dependency vulnerability scanning.                                               | Medium                   | Fixed — `pnpm audit` gate in CI.                                                                                                                                                                             |
| S7  | Personal backlog data reaching a public demo.                                       | **High, if it happened** | Prevented by design — see below.                                                                                                                                                                             |
| S8  | XSS via user-entered titles/notes.                                                  | Low                      | Not exploitable — React escapes all interpolation and the codebase contains no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `new Function`. Verified by grep, and now enforced by CSP and a lint rule. |

No secrets, credentials, tokens, or `.env` files appear anywhere in the
working tree or in any of the 23 commits of history — verified by
`git log --diff-filter=A --name-only` over all refs plus a full-history
content grep. No history rewriting was needed.

## Deployment concerns

- The repository was **private**, and GitHub Pages on GitHub Free
  requires a public repository. Resolved by making the repository public
  (owner's decision) — appropriate anyway for a portfolio piece whose
  whole purpose is being read.
- A **project page** serves from `/<repo>/`, so both Vite's `base` and
  the router's `basename` must come from the same source of truth.
- **BrowserRouter needs an SPA fallback.** Static hosts return 404 for
  `/goals` because no such file exists. GitHub Pages has no rewrite
  rules, so the build emits `404.html` as a copy of `index.html`.

## Data / privacy concerns

The owner's real backlog lives in `localStorage` under the origin the app
runs on. It is **never** in the repository, never in a build artifact,
and never transmitted. The public demo is a different origin entirely, so
it cannot read it even in principle.

The one real risk was accidentally _seeding_ the deployed site from a
personal export. That is prevented structurally rather than by care:

- Demo data is **generated, not captured** — a checked-in fixture of
  invented titles that anyone can read in `src/infrastructure/seed/`.
- Demo mode uses **separate storage keys** (`backlogs:demo:*`), so the
  two datasets cannot collide even on one origin.
- Seeding **only ever runs into empty storage**, so it cannot overwrite
  anything a visitor has entered.

## Recommended architecture

**Keep the architecture.** It is already appropriate for what this app
is, and rebuilding it would destroy the strongest thing the project has
going for it. The recommendation is additive rather than structural:
introduce a **configuration layer** (`src/config/`) that the composition
root reads, so dev/test/prod/demo differ by environment instead of by
code, and add the two cross-cutting concerns a public app needs that a
private one does not — an **error boundary** and a **structured logger**.

Specifically _not_ recommended, and deliberately not done:

- Adding a backend or a database. The app's defining property is that it
  works offline with no account; a server would remove the feature.
- A state-management rewrite, CQRS, or an event bus.
- Replacing TanStack Query, Zustand, or Radix.
- Splitting into packages or a monorepo.

## Recommended deployment strategy

**GitHub Actions → GitHub Pages.** Verified against GitHub's current
documentation rather than from memory:

- Pages is free on GitHub Free provided the repository is public ("If the
  account that owns the repository uses GitHub Free … the repository must
  be public").
- Actions minutes are free for public repositories on standard runners.
- No credit card is required at any point.
- Limits: 1 GB site, 100 GB/month soft bandwidth — the built site is
  well under 1 MB.

The repo already lives on GitHub, so this adds zero new accounts and zero
new secrets: deployment authenticates with the workflow's built-in OIDC
token.

## Major risks

| Risk                                                                 | Mitigation                                                                                    |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Making the repo public exposes something unnoticed.                  | Full-history secret scan performed and clean; the app has never had a server or a credential. |
| A visitor mistakes the demo for a product with a backend.            | A persistent demo banner states that data is local-only and resettable.                       |
| GitHub Pages returns HTTP 404 (with correct content) for deep links. | Accepted and documented; a status-code artifact of the fallback, not a broken page.           |
| Demo seeding wipes a visitor's own experiments.                      | Seeding is empty-storage-only, and the reset control is explicit and confirmed.               |
| `pnpm audit` fails CI on an unfixable transitive advisory.           | Gate set at `--audit-level high`, so low/moderate noise does not block.                       |

## Proposed implementation order

Each stage ends green (typecheck + lint + tests + build) before the next
begins.

1. **Configuration and app-shell hardening** — `src/config/`, structured
   logger, error boundary, 404 route, `basename` / `base` wiring.
2. **Demo data** — deterministic generator, seed use-case, bootstrap,
   demo banner, reset control.
3. **Security hardening** — CSP and security headers, import resource
   limits, closed-value-set validation, prototype-pollution guard.
4. **CI** — typecheck, lint, format, test, build, audit.
5. **CD** — Pages deploy workflow.
6. **Tests** for everything added above.
7. **Documentation** — architecture, security, demo data, deployment,
   testing, interview guide; README rewritten for a first-time reader.
8. **Reusable skill** — `.claude/skills/portfolio-productionize/`.
9. **Deploy, then verify against the live URL.**
