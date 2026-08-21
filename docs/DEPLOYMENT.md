# Deployment

**Live demo: https://andreibautin.github.io/Backlogs/**

## What is deployed, and where

| Piece                 | Where                                          | Cost |
| --------------------- | ---------------------------------------------- | ---- |
| The whole application | GitHub Pages (project page)                    | Free |
| Build and deploy      | GitHub Actions                                 | Free |
| Database              | None — the browser's LocalStorage is the store | Free |
| Secrets / tokens      | None — the workflow's built-in OIDC token      | —    |

There is no backend to host and no database to provision, because the app
does not have either. That is the entire reason deployment is this simple.

## Why GitHub Pages

Checked against GitHub's current documentation rather than from memory:

- **Genuinely free, with no credit card at any point.** Pages is free on
  GitHub Free provided the repository is public — _"If the account that
  owns the repository uses GitHub Free … the repository must be public."_
  Actions minutes are free for public repositories on standard runners.
- **No new account and no new secret.** The repository already lives on
  GitHub. Deployment authenticates with the workflow's built-in OIDC
  token, so nothing has to be created, stored, or rotated.
- **Right shape for the artifact.** The build output is ~600 kB of static
  files. A static host is exactly what that wants.
- **Limits are irrelevant at this size.** 1 GB site limit, 100 GB/month
  soft bandwidth limit. The site is well under 1 MB.

**Alternatives considered.** Cloudflare Pages and Netlify both have free
tiers that do not require a card, and both offer something Pages does not:
control over response headers, which would allow `frame-ancestors` and
`nosniff` (see [SECURITY.md](SECURITY.md#remaining-risks)). Neither was
chosen, because each would add an account, an API token stored as a
repository secret, and a second place to look when something breaks — real
cost, for a header that protects against an attack this app has no session
to lose. Vercel was ruled out for a portfolio demo on its free-tier
commercial-use restrictions. Anything requiring a card was excluded
outright.

**The repository had to be made public** for Pages to work on the free
plan. That is appropriate for a portfolio project whose purpose is being
read, and it was done only after a full-history secret scan came back
clean.

## Prerequisites

Already done for this repository; listed for anyone reproducing it.

1. A GitHub account (free tier is sufficient).
2. The repository must be **public**.
3. Pages enabled with **GitHub Actions** as the source:

   ```bash
   gh api --method POST repos/<owner>/<repo>/pages -f build_type=workflow
   ```

   Or: _Settings → Pages → Build and deployment → Source → GitHub Actions_.

No other setup. No environment variables to configure in the GitHub UI, no
secrets to add.

## Environment variables

All configuration is build-time and public. Nothing here is a secret —
`VITE_`-prefixed variables are compiled into the bundle by definition.

| Variable           | Set by       | Value in the deploy         |
| ------------------ | ------------ | --------------------------- |
| `VITE_APP_MODE`    | `.env.demo`  | `demo`                      |
| `VITE_LOG_LEVEL`   | `.env.demo`  | `warn`                      |
| `VITE_BASE_PATH`   | The workflow | `/Backlogs/`                |
| `VITE_APP_VERSION` | The workflow | `master-<run number>`       |
| `VITE_COMMIT_SHA`  | The workflow | `${{ github.sha }}`         |
| `VITE_BUILT_AT`    | The workflow | Repository update timestamp |

The last three surface in **Settings → About**, so a page someone is
looking at can be tied back to the commit that produced it.

## The base path, and why it matters

A GitHub _project_ page is served from `https://<user>.github.io/<repo>/`,
not from the root. Two things have to agree about that:

- **Vite's `base`**, which rewrites every asset URL in `index.html`.
- **React Router's `basename`**, which strips the prefix before matching.

They agree because there is one source of truth: the workflow sets
`VITE_BASE_PATH`, Vite writes it into `import.meta.env.BASE_URL`, and
`readAppConfig` derives `routerBasename` from that same value. If they
disagreed, every route would 404 while the assets loaded fine — a
confusing failure worth designing out.

## The SPA fallback

GitHub Pages has no rewrite rules. A request for `/Backlogs/goals` looks
for a file that does not exist.

The standard fix, and the one used here: the build emits **`404.html` as a
byte-identical copy of `index.html`** (see `spaFallbackPlugin` in
`vite.config.ts`). Pages serves it for any unmatched path, the app boots,
and React Router resolves the route client-side.

**The response still carries HTTP 404.** That is a status-code artifact of
static hosting, not a broken page — the content is correct and the app
works. Verified on the live site: `curl -sI .../Backlogs/goals` returns
404 while the body contains the full app shell, and a browser deep-linked
to that URL renders the Goals page. A host with rewrite support would
return 200 instead.

The deploy workflow asserts `dist/404.html` exists before uploading, so a
regression here fails the build rather than shipping a demo where every
deep link is a dead end.

## The pipeline

```
push to master
      │
      ├──────────────────────────┬───────────────────────────
      ▼                          ▼
  ci.yml                    deploy.yml
      │                          │
  ┌───┴────────────┐         ┌───┴──────────────────────┐
  │ verify         │         │ build                    │
  │  typecheck     │         │  install --frozen-lockfile│
  │  lint          │         │  configure-pages         │
  │  format:check  │         │  pnpm build:demo         │
  │  test:run      │         │   with base path + build │
  │  build         │         │   metadata               │
  │  build:demo    │         │  assert 404.html exists  │
  ├────────────────┤         │  upload-pages-artifact   │
  │ security       │         ├──────────────────────────┤
  │  pnpm audit    │         │ deploy                   │
  │   (high+)      │         │  deploy-pages (OIDC)     │
  │  gitleaks      │         │  curl the live URL and   │
  └────────────────┘         │   grep for the app shell │
                             └──────────────────────────┘
```

CI and deploy run **in parallel**, not in sequence. That is a deliberate
trade for a personal project: it keeps the feedback loop short, at the
cost of being able to publish a commit whose tests later fail. For an app
with users you would gate the deploy on CI by adding `needs: verify`; the
one-line change is noted here so the omission reads as a decision rather
than an oversight.

The deploy job's last step **curls the published URL and greps for the app
shell**, so a green deploy means the site actually answered — not merely
that an upload succeeded.

## Deploying

**Automatically:** push to `master`. That is the whole process.

**Manually:** Actions → _Deploy demo to GitHub Pages_ → _Run workflow_.
Useful for confirming the site still builds after a dependency bump,
without an empty commit.

**Locally, to see exactly what will ship:**

```bash
VITE_BASE_PATH=/Backlogs/ pnpm build:demo
npx serve dist
```

On Windows Git Bash, prefix with `MSYS_NO_PATHCONV=1` — otherwise MSYS
rewrites `/Backlogs/` into a Windows path and the assets end up under a
nonsense prefix. (This affects local builds only; the Linux runner in CI
is unaffected.)

## Resetting demo data

There is **no server-side state**, so there is nothing central to reset.
Every visitor is seeded independently in their own browser on first load.

A visitor resets their own copy from Settings → Demo → _Reset demo data_.
See [DEMO_DATA.md](DEMO_DATA.md#resetting-the-demo).

To change what everyone gets, edit
`src/infrastructure/seed/demo-backlog.ts` and push. Returning visitors
keep their existing copy — seeding only fills empty storage — and get the
new fixture after a reset.

## Troubleshooting

| Symptom                                                | Cause                                            | Fix                                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| **`No pnpm version is specified`** in CI               | `pnpm/action-setup` has no version to read       | Already fixed: `packageManager` is declared in `package.json`. Keep it in sync with your local pnpm.  |
| **Blank page, 404s on `/assets/…`**                    | Base path wrong — assets requested from the root | Confirm `VITE_BASE_PATH` matches `/<repo>/` exactly, including both slashes.                          |
| **App shell loads but every route shows the 404 page** | Router `basename` disagrees with the base path   | Both derive from `BASE_URL`; check the workflow's `VITE_BASE_PATH`.                                   |
| **Deep links 404 entirely (no app shell)**             | `404.html` missing from the artifact             | The build asserts it exists — check the _Verify the SPA fallback_ step.                               |
| **CI fails on `pnpm audit`**                           | A real advisory at `high` or above               | Fix it: `pnpm update <pkg>`, or add an override in `pnpm-workspace.yaml`. Do not lower the threshold. |
| **CI fails only on formatting**                        | CRLF line endings from a Windows checkout        | `.gitattributes` forces LF. If it predates that, run `git add --renormalize .`.                       |
| **`gitleaks` fails**                                   | A credential was committed                       | Rotate it first, then remove it. Never just delete the line.                                          |
| **Deploy succeeds, site shows the old version**        | Browser or CDN cache                             | Hard-reload. Asset filenames are content-hashed, so `index.html` is the only cacheable-stale file.    |
| **Pages 404s at the root after enabling**              | First deploy has not finished                    | Check Actions; the first publish takes a minute or two.                                               |

## Free-tier limits

| Limit                        | Value                                          | Headroom                                                        |
| ---------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| Published site size          | 1 GB                                           | Site is well under 1 MB                                         |
| Bandwidth (soft)             | 100 GB/month                                   | Would need ~170 000 cold loads/month                            |
| Builds via a custom workflow | Unlimited                                      | The 10/hour soft limit applies only to the classic Jekyll build |
| Actions minutes              | Unlimited for public repos on standard runners | —                                                               |
| Availability                 | No SLA on Pages                                | Acceptable for a demo                                           |

## Migrating off GitHub Pages

If header control or a 200 status on deep links ever matters, the move is
small because nothing is coupled to the host:

1. Point Cloudflare Pages or Netlify at the repository.
2. Build command `pnpm build:demo`, output directory `dist`.
3. Set `VITE_BASE_PATH=/` (both serve from a root domain).
4. Add an SPA rewrite (`/* → /index.html 200`), which makes the
   `404.html` fallback redundant.
5. Add the response headers GitHub Pages cannot set.

No application code changes.
