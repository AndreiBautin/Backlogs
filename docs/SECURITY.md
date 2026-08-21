# Security

## The threat model

Start here, because it determines everything else: **Backlogs has no
server, no account, no session, and no data that leaves the browser.**

That is not a gap to be apologised for — it removes whole categories of
vulnerability by construction rather than by defence:

| Classic risk                      | Why it does not apply here                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| SQL injection                     | There is no database and no query. Persistence is `JSON.stringify` into LocalStorage.            |
| CSRF                              | There is no state-changing endpoint. Nothing on any origin can cause a write.                    |
| IDOR / broken object-level auth   | There is no server-side object to reference. An item id only means something inside one browser. |
| Broken authentication             | There is no authentication. Nothing to bypass, no password to leak, no session to fixate.        |
| Privilege escalation              | There is one user and no roles.                                                                  |
| Insecure deserialization          | Only `JSON.parse` runs, and its output is validated field by field before use.                   |
| Path traversal                    | No filesystem, no server routes.                                                                 |
| Secrets in transit or at rest     | There are none — see [Secrets management](#secrets-management).                                  |
| SSRF, unsafe redirects, open CORS | The app issues no outbound requests at all. `connect-src 'self'` enforces it.                    |

What is left is a genuinely small surface: what enters the app (an
imported backup file, and LocalStorage itself), what the app renders, and
what the deployment exposes.

## Findings and fixes

Every finding below was identified in the audit and, where it could be
fixed, fixed. Where it could not, that is stated plainly rather than
papered over.

### S1 · No Content-Security-Policy — _fixed_

**Problem.** The app shipped with no CSP, so any script-injection bug
would have had free rein.

**Fix.** A policy declared in `index.html`, since GitHub Pages serves
static files and cannot set response headers:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; font-src 'self'; connect-src 'self';
object-src 'none'; base-uri 'self'; form-action 'none'
```

`script-src 'self'` with no `unsafe-inline` and no `unsafe-eval` means an
injected `<script>` tag does not execute — **verified in the deployed
build** by injecting one and observing it fail to run.

`style-src` keeps `'unsafe-inline'` because Vite emits a critical style
tag and Radix sets inline styles for popover positioning. With no script
vector, inline style is a low-value target.

`connect-src 'self'` is the interesting one: it turns "this app makes no
network calls" from a claim into something the browser enforces. If a
future dependency tried to phone home, it would fail.

### S2 · Unbounded import input — _fixed_

**Problem.** `parseItemEnvelope` accepted any string of any length and any
item count. A large file — accidental or deliberate — would freeze the
tab, and a browser tab has no other backstop.

**Fix.** A 5 MB size cap checked **before** parsing (rejecting a hostile
payload after the expensive step is not much of a rejection), and a
10 000-item cap after. Both surface as a warning; neither throws.

### S3 · Closed value sets were not validated at the boundary — _fixed_

**Problem.** `isPlausibleItem` checked `typeof candidate.category === 'string'`
and nothing more. An imported item could carry `category: "not-a-category"`,
satisfy the guard, get cast to `Item` — and then reach
`getCategoryDefinition`, which throws. The type said `CategoryId`; the
value was not one.

**Fix.** `category`, `status`, and `priority` are now checked against
their registries, and `tags` is checked to be an array of strings.
Offending items are **dropped rather than repaired**, because silently
rewriting someone's data is worse than declining to load one row.

This is the fix that makes the rest of the codebase's type-level
confidence honest: every layer above the boundary can treat `CategoryId`
as a guarantee because exactly one place enforces it.

### S4 · Prototype-polluting keys survived import — _fixed_

**Problem.** `JSON.parse` keeps `__proto__` as an own property rather than
acting on it, so it is inert — until something copies the object onward.
`normalizeItem` did exactly that with a spread.

**Fix.** `__proto__`, `constructor`, and `prototype` are stripped during
normalization. Tested by feeding a crafted payload through and asserting
`Object.prototype` is untouched.

### S5 · Storage contents could reach the console — _fixed_

**Problem.** Corruption warnings were raw `console.warn` calls, and the
production build had no way to quiet them. On a shared or recorded screen
that is somebody's private reading list in a console.

**Fix.** A structured logger whose records carry an **event name and a bag
of scalars** — `{ reason: 'Invalid JSON', dropped: 3 }` — never the
content. Production is thresholded to `warn`. Two tests assert
specifically that item titles never appear in log output.

### S6 · No dependency scanning — _fixed_

**Fix.** CI runs `pnpm audit --audit-level high` plus `gitleaks` on every
push and pull request, and again on a weekly schedule — an advisory can be
published against a dependency that has not changed, and without the
schedule it would only surface the next time someone happened to push.

On a push, gitleaks scans the pushed commits; on the weekly run and on
manual dispatch it scans the entire history. The checkout uses
`fetch-depth: 0`, because the default shallow clone leaves gitleaks with a
commit range it cannot resolve — which fails the step without having
scanned anything, a false alarm worse than no scan.

This gate immediately proved its worth: the first run failed on
[GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8)
in `nanoid`, reaching the tree transitively through `postcss ← vite`. It
was resolved by pinning forward with a pnpm override rather than by
lowering the threshold — a gate relaxed the first time it fires is not a
gate.

The threshold is `high` rather than `low` deliberately: a portfolio app
blocked indefinitely by a moderate advisory in a build-time transitive
dependency teaches nothing and trains people to ignore the alert.

### S7 · Personal data reaching the public demo — _prevented by design_

The highest-consequence risk in the whole exercise, and the one handled
structurally rather than by care. See [DEMO_DATA.md](DEMO_DATA.md); the
short version is three independent barriers:

1. Demo data is **generated from a checked-in fixture**, never exported
   from a personal device. Anyone can read it.
2. Demo mode uses **separate LocalStorage keys**, so the datasets cannot
   collide even on one origin.
3. Seeding **only ever writes into empty storage**, so it cannot overwrite
   anything.

Verified on the live site: after loading, the only key present is
`backlogs:demo:items:v1`, and `backlogs:items:v1` does not exist.

### S8 · XSS — _not exploitable, and now constrained_

Item titles, notes, tags, and platforms are free text and are rendered
throughout the app. React escapes every interpolation, and the codebase
contains **no `dangerouslySetInnerHTML`, no `innerHTML`, no `eval`, and no
`new Function`** — verified by grep across `src/`. CSP now backs that up
at runtime.

### S9 · Storage write failures — _fixed_

**Problem.** `localStorage.setItem` throws on a full quota, and in
Safari's private mode it can throw on every write. That surfaced as an
unhandled promise rejection inside a mutation with nothing shown to the
user.

**Fix.** Caught in the repository, logged as an event, and rethrown as a
plain sentence the UI can display, with the original error attached as
`cause` for debugging.

## Authentication

There is none, deliberately. See
[Architecture → Authentication and authorization](ARCHITECTURE.md#authentication-and-authorization).

The consequence worth stating: **the browser's same-origin policy is the
authorization boundary.** One user's data is inaccessible to any other
origin, enforced by the browser rather than by application code. The
public demo needs no credentials because there is nothing to log into.

## Input validation

Validation happens in two distinct places, for two distinct reasons.

**At the domain boundary** — `createItem`, `applyItemUpdate`,
`applySettingsChanges`, `requireDailyGoal`. These enforce _business rules_
and throw `DomainValidationError` on violation: a title cannot be blank, a
goal amount must be a whole number between 1 and 99, a unit must be
non-empty and at most 24 characters.

**At the trust boundary** — `parseItemEnvelope`. This handles _hostile or
corrupt input_ and **never throws**. It returns a result object, drops
what it cannot use, and reports how much it dropped.

The distinction matters. A user typing an empty title should get an
error. A corrupt storage blob should not take the app down — and a
malformed backup file must not be mistaken for an empty one. That is
exactly what the `envelopeValid` flag is for:

```ts
const { items, warning, envelopeValid } = parseItemEnvelope(raw)
if (envelopeValid) {
  await repository.replaceAll(items) // only ever on a recognizable envelope
}
```

Without that flag, opening a JPEG in the import dialog would parse to zero
items and erase the backlog. A test asserts that no rejection path ever
reports `envelopeValid: true`.

## Data protection

- **At rest.** LocalStorage under the user's own origin. Not encrypted —
  and encrypting it would be theatre, since the key would have to live in
  the same place as the data. Anyone who can read the LocalStorage of your
  browser profile can already read anything else you have stored.
- **In transit.** Nothing is ever in transit. There is no network call.
- **Exports.** `Export backup` produces a JSON file the user downloads to
  their own machine. It is never uploaded.
- **Telemetry.** There is none. No analytics, no error-reporting SaaS, no
  third-party script of any kind — which is also why `default-src 'self'`
  can be as strict as it is.

## Secrets management

**There are no secrets in this project, and there is no place to put
one.** No API key, no token, no connection string, because there is
nothing to authenticate to.

Two things enforce that:

- `.env.example` states explicitly that a `VITE_`-prefixed variable is
  compiled into the bundle and is therefore **public by definition** — the
  prefix is what makes a value public, and it must never be used for a
  credential in any project.
- Deployment authenticates with the GitHub Actions workflow's **built-in
  OIDC token**. There is no deploy key, no personal access token, and no
  repository secret involved in publishing this app.

**Full history scan:** all 23 pre-existing commits plus every commit added
here were scanned for credential patterns (`sk-`, `ghp_`, `gho_`,
`github_pat_`, `AKIA…`, `xox…`, PEM private-key blocks) and for email
addresses. Nothing was found. The only `.env` files ever committed are
`.env.example` and `.env.demo`, both containing public configuration only.
**No git history rewriting was necessary**, and none was performed.
`gitleaks` now runs the same scan on every push.

## API security

There is no API. The nearest equivalents are the two boundaries where
data enters the app — the import file and LocalStorage — and both go
through `parseItemEnvelope`, covered above.

## Production configuration

| Concern                          | Development             | Production                             |
| -------------------------------- | ----------------------- | -------------------------------------- |
| Log level                        | `debug`                 | `warn`                                 |
| Error detail on the error screen | Message and stack shown | Hidden                                 |
| Source maps                      | On                      | On — deliberate; see below             |
| Storage namespace                | `backlogs:*`            | `backlogs:demo:*` on the deployed demo |

**Source maps are shipped on purpose.** There is no proprietary logic and
no secret in this bundle, so withholding them would buy obscurity that
protects nothing while making a real stack trace unreadable. For a
portfolio app whose source is public anyway, that trade is backwards.

## Dependency and security scanning in CI

| Check                 | Tool                                                                             | Threshold                                 |
| --------------------- | -------------------------------------------------------------------------------- | ----------------------------------------- |
| Known vulnerabilities | `pnpm audit`                                                                     | Fails on `high` and above                 |
| Committed secrets     | `gitleaks-action@v2`                                                             | Fails on any finding; full history weekly |
| Lockfile drift        | `pnpm install --frozen-lockfile`                                                 | Fails on any drift                        |
| Type safety           | `tsc -b` with `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` | Fails on any error                        |
| Lint                  | `typescript-eslint` `strictTypeChecked`                                          | Fails on any error                        |

`gitleaks-action` requires no licence key for repositories under a
personal account, which is the case here.

## Remaining risks

Stated honestly, including the ones that cannot be fixed on this hosting.

| Risk                                                                                                                                                                           | Assessment                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No clickjacking protection.** `frame-ancestors` is ignored when delivered via `<meta>`, and GitHub Pages cannot set response headers, so the demo can be framed by any site. | Accepted. Clickjacking works by tricking a user into acting with _their_ authority against a session. There is no session, no authenticated action, and no data in a frame that the framing site did not already have to seed itself. Moving to a host with header control (Cloudflare Pages, Netlify) would close it. |
| **No `X-Content-Type-Options: nosniff`.** Same reason.                                                                                                                         | Low. GitHub Pages already serves correct `Content-Type` headers for every asset the build emits.                                                                                                                                                                                                                       |
| **LocalStorage is readable by any script on the origin.**                                                                                                                      | Inherent to the storage choice, and mitigated by the CSP: with `script-src 'self'` there is no injection path for a foreign script.                                                                                                                                                                                    |
| **A user with many thousands of items could hit the LocalStorage quota.**                                                                                                      | Handled rather than prevented — the write failure becomes a visible message instead of a silent loss. A real fix means IndexedDB, which the repository port already permits.                                                                                                                                           |
| **`style-src 'unsafe-inline'`.**                                                                                                                                               | Required by Vite and Radix. Low value to an attacker with no script vector.                                                                                                                                                                                                                                            |
| **Demo data persists in a visitor's browser.**                                                                                                                                 | By design, so their edits survive a reload. Disclosed in the banner, and Settings offers a reset.                                                                                                                                                                                                                      |
| **Dependency supply chain.**                                                                                                                                                   | The residual risk of any npm project. Bounded by `--frozen-lockfile`, the audit gate, and a small direct dependency list.                                                                                                                                                                                              |

## Reporting

This is a personal portfolio project with no user data to breach. If you
find something anyway, open an issue on the repository.
