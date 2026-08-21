---
name: portfolio-productionize
description: Take an existing personal application from "a private app I built for myself" to "a small production application I can show an employer and explain in an interview" — assess, harden, seed safe demo data, add CI/CD, deploy to genuinely free no-credit-card hosting, verify against the live URL, and write the docs and interview guide. Use when the user asks to productionize, ship, deploy, publish, or portfolio-ify an existing app, or to make a personal project presentable to employers. Technology-agnostic; adapts to whatever stack the repository actually uses.
---

# Portfolio productionization

Turn an existing, already-useful personal application into something
deployable, defensible, and explainable — **without rewriting it.**

The app already works. The job is to close the gap between "works on my
machine" and "an employer can click a link, read the source, and hear you
explain it." That gap is almost never architectural. It is usually:
nothing deployed, no CI, no demo data, no configuration layer, no error
boundary, and documentation that assumes the reader is you.

## Operating rules

**Do the work. Do not stop at a plan.** Produce the assessment, then keep
going. Only stop for: deleting functionality, changing important
user-facing behaviour, exposing private information, incurring cost, or a
blocker only the user can clear (an account, a credential, a visibility
change).

**Verify, never assume.** Run the command. Read the output. A green
config proves nothing. If something can't be verified, say so explicitly
in the final report rather than implying it passed.

**Preserve what exists.** The app is already useful. Do not remove a
feature to make the architecture tidier, and do not rewrite a working
subsystem because a different pattern is more fashionable.

**Prefer boring.** Monolith over microservices. Managed over
self-hosted. A flag over a fork. Something the user can explain
confidently beats something more elegant that they cannot.

**Free means free.** No credit card, at any point, for any component. A
"free trial" that asks for a card is not free. Verify current provider
terms with web access rather than from memory — providers change.

---

## Phase 0 — Understand before touching anything

Do not edit a file until you can answer these.

1. Read the repository: entry points, config, `package.json`/`pyproject`/
   `go.mod`/`Cargo.toml`/`*.csproj`, existing docs, `.env*`.
2. Identify: frontend, backend, database, auth, API shape, external
   services, deployment config, test setup, build tooling.
3. `git status`, `git log --oneline -30`, current branch. **Never discard
   uncommitted work you did not create.**
4. **Establish a baseline.** Run the build, the tests, the linter, the
   typechecker. Record exact numbers ("257 tests, 42 files, all passing").
   You need these to prove later that nothing regressed.
5. Run the app. Click through the main workflows. Understand what it
   actually does before deciding what it needs.
6. Identify, specifically:
   - technical debt that matters (not every imperfection)
   - security risks appropriate to _this_ stack
   - anything blocking free deployment
   - **anything that would expose the user's personal data if published**

Then write **`docs/PRODUCTIONIZATION_ASSESSMENT.md`**: current
architecture, honest strengths, weaknesses in a numbered table with
impact, security findings with severity, deployment concerns, data/privacy
concerns, recommended architecture, recommended deployment, major risks,
and the implementation order.

**Be honest in both directions.** If the code is good, say so and say
why — an assessment that manufactures problems to justify a rewrite is
worthless. If it is a mess, say that plainly too.

**Then keep going. Do not wait for approval on the assessment.**

---

## Phase 1 — Architecture, pragmatically

Read the existing structure and improve it _incrementally_. If it is
already reasonable, say so and leave it alone.

**Do not impose** Clean Architecture, CQRS, event sourcing,
microservices, a DI container, or repositories-everywhere on an app that
does not need them.

**Do look for**, in rough priority order:

- Business logic tangled into controllers, components, or route handlers
- No seam between the app and its persistence (blocks testing _and_
  blocks the demo/personal data split)
- Configuration hardcoded rather than read from the environment
- Error handling that is absent or inconsistent
- No composition root — dependencies constructed wherever they are used

The bar to clear: the user must be able to explain **what the layers
are, what each is responsible for, how a request flows through, where
business logic lives, where persistence happens, how dependencies flow,
how auth works, how errors are handled, how config and secrets are
handled, and why this shape suits this app.**

Write **`docs/ARCHITECTURE.md`**: concise and interview-shaped, not a
textbook. Include an ASCII diagram and **one concrete request traced end
to end, naming real files**. That trace is the single most useful thing in
the document.

---

## Phase 2 — Security audit

**Start by writing down the threat model**, because it determines which
of the standard list even applies. An app with no server has no CSRF; an
internal tool behind SSO has different exposure than a public API. Naming
what is _structurally absent_ is stronger than a checklist of items marked
N/A.

Then look for what is real for this stack:

- Hardcoded secrets, API keys, tokens, connection strings — **and check
  the full git history**, not just the working tree
- Authn/authz weaknesses, IDOR, missing ownership checks
- Injection (SQL, command, template), XSS, unsafe deserialization
- Missing input validation **at trust boundaries** — every point where
  data enters from outside
- Insecure CORS, overly permissive endpoints, verbose production errors
- Path traversal, unrestricted file upload
- Insecure cookies, weak password handling
- Dependency vulnerabilities
- **Personal data in logs**, and personal data reaching a public demo

For each real finding: explain it, fix it, explain the fix. Document what
cannot be fixed and why, with an honest impact assessment.

**No security theater.** A header that the platform ignores, a check that
cannot fail, a sanitizer on data that is never rendered — these are worse
than nothing, because they look like protection. If you catch yourself
adding one, remove it and document the gap instead.

**Secrets in git history:** assess exposure carefully. Rotation comes
first — a removed-but-already-leaked credential is still leaked. Do **not**
rewrite history unilaterally; document the options and let the user
decide.

Add to CI: dependency audit (gated at `high`, so low-severity noise in
build-time transitive deps does not train people to ignore it) and a
secret scanner over the full history.

Write **`docs/SECURITY.md`**: threat model, findings and fixes, authn,
authz, input validation, data protection, secrets management, API
security, production config, CI scanning, and **remaining risks stated
plainly**.

---

## Phase 3 — Safe demo data

**The deployed app must never contain the user's personal data.** This is
the highest-consequence part of the whole workflow.

Build the guarantee **structurally**, not carefully. Three barriers:

1. **Generate, never capture.** The fixture is code checked into the
   repository, readable by anyone. There is no export step from a personal
   device anywhere in the pipeline.
2. **Separate the namespaces.** Different database, schema, storage key
   prefix, or table — whatever the stack's equivalent is. The demo and the
   real data must be unable to collide.
3. **Seed only into empty storage.** Never overwrite. Make this a tested
   property, not a convention.

Make the demo data _good_, because an empty app demonstrates nothing:

- Realistic and immediately legible — a reviewer should understand the app
  in ten seconds
- Covers every category / status / type, so no UI state goes undemonstrated
- Exercises deliberate edge cases: a minimal record with only required
  fields, a very long value, an item at a boundary, an empty state
- **Uses relative dates, not fixed timestamps.** A fixture pinned to
  absolute dates rots — opened a year later it shows dead streaks and
  empty "this month" stats. Offsets from seed time keep it alive while
  staying deterministic for a given `now`.
- Contains nothing that looks like real personal data. **Add a test that
  scans the fixture** for emails, phone numbers, URLs, and credential
  patterns.

Provide a deterministic seed _and_ a separate reset. Keep "fill if empty"
and "wipe and replace" as **two named operations**, never one function
with a flag — so a call site cannot ask for one and get the other.

If the app requires auth, create demo credentials **specifically for the
demo**, with no privileges beyond the demo data. Never reuse a real one.
If it has no auth, say so plainly in the README rather than inventing a
login.

Write **`docs/DEMO_DATA.md`**: the strategy, what is in the dataset and
why, how seeding works, how to reset, the barriers protecting personal
data, and any demo credentials.

---

## Phase 4 — Production configuration

Separate development, test, production, and demo. Everything that differs
between them must be **configuration, not code**.

- `.env.example`, committed, **documenting every variable** — including
  which prefix makes a value public in this stack, and stating that such a
  prefix must never hold a credential
- Never commit real secrets; ensure `.gitignore` covers local overrides
- Make config parsing **pure and total**: bad input degrades to a
  documented default and reports a warning rather than crashing at
  startup. Unit-test it — a typo in an env var must never silently enable
  the wrong mode.
- Production-appropriate error handling: detail for developers, a
  recoverable screen and no internals for users
- Structured logging with a configurable level. **Log event names and
  scalars, never user content** — that is what makes it safe to leave on.
- A health check if the stack has a server; if it does not, say so in the
  docs rather than inventing one
- Database migrations if there is a database

Add a **cross-platform line-ending guard** (`.gitattributes` with
`* text=auto eol=lf`) if the user is on Windows and CI is on Linux.
Otherwise a formatting gate passes in CI and fails locally, which is
worse than having no gate.

---

## Phase 5 — Free public deployment

**Verify current terms with web access. Do not rely on memory.**

Requirements, in order: genuinely free for this workload; **no credit card
to sign up**; appropriate for a portfolio; reasonably reliable; easy to
maintain.

Choose by what the app actually is:

| App shape                       | Typical fit                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------ |
| Static site / SPA               | GitHub Pages, Cloudflare Pages, Netlify                                        |
| SSR / full-stack JS             | Cloudflare Pages/Workers, Netlify, Vercel (check current commercial-use terms) |
| Container / long-running server | Fly.io, Render, Railway — **verify card requirements, these change**           |
| Postgres                        | Neon, Supabase                                                                 |
| Redis / KV                      | Upstash, Cloudflare KV                                                         |

Prefer the option that adds **no new account and no new secret**. If the
repo is already on GitHub and the artifact is static, Pages wins on that
alone — deployment authenticates with the workflow's built-in token.

Handle the details that actually break static deploys:

- **Base path.** A project page serves from `/<repo>/`. Both the bundler's
  base and the router's basename must derive from **one** value, or you
  get working assets and a 404 on every route.
- **SPA fallback.** Static hosts 404 on client-side routes. Emit a
  fallback document (`404.html` on Pages) or configure a rewrite. Note
  honestly if the status code stays 404.
- **Build metadata.** Inject version and commit so a deployed page can be
  tied back to a commit.

**Actually deploy it.** Stop only at a step that genuinely requires the
user — creating an account, granting a scope, making a repository public —
and tell them exactly what to do.

Write **`docs/DEPLOYMENT.md`**: provider and **why, including which
alternatives were rejected and on what grounds**; required accounts;
environment variables; database setup; migrations; seeding; how deploys
trigger; how to update; how to reset demo data; a troubleshooting table of
real failures with real fixes; and free-tier limits with actual headroom.

---

## Phase 6 — CI/CD

Lightweight and proportionate. Not an enterprise pipeline.

Minimum: install with a **frozen lockfile** (so drift fails rather than
silently resolving something else), build, test, lint/static analysis,
dependency audit, secret scan.

Two things worth doing that are usually skipped:

- **Build every configuration that ships.** If the demo build differs from
  the default, build both — a failure that only appears under the demo
  config must not first surface at deploy time.
- **Smoke-test the deployment.** After publishing, fetch the live URL and
  assert on the response body. A green deploy step means an upload
  succeeded; a green smoke test means the site answered.

Verify locally first (`act`, or just running the same commands). A
pipeline that has never run is not a pipeline.

If CI and deploy run in parallel rather than gated, **say so in the docs
and give the one-line change to gate them** — an acknowledged trade-off
reads as judgement; an unmentioned one reads as an oversight.

---

## Phase 7 — Tests

Review what exists. **Do not chase a coverage number** — chasing one
produces tests written to raise it, which are exactly the tests that do
not catch bugs.

Prioritize: core business logic; important user workflows; authn/authz;
**validation at trust boundaries**; destructive operations, tested from
the "must not destroy" side; security-sensitive behaviour; genuine edge
cases.

Test the properties the productionization now depends on:

- The demo fixture contains nothing personal
- Seeding cannot overwrite existing data
- Config parsing cannot crash and cannot enable the wrong mode by typo
- Logs never contain user content
- A rejected input is never mistaken for valid-but-empty

Run the full suite. Report real numbers before and after.

Write **`docs/TESTING.md`**: the strategy per layer, what is prioritized,
**what is deliberately not tested and why**, and the test helpers. The
"deliberately not tested" section is what makes it read as judgement
rather than as a gap.

---

## Phase 8 — Observability

Proportionate. A portfolio app does not need a metrics pipeline.

- Structured logging, scalars only, level configurable
- Error messages that help without leaking
- Health endpoint if there is a server
- Clear dev/prod error distinction
- Build identification visible in the app, so a deployed page ties to a
  commit
- Use the platform's free logs; add no paid monitoring

Explicitly note what you did _not_ add and why — for many personal apps,
third-party error reporting means shipping user data to a vendor for
information the app does not need.

---

## Phase 9 — README

The README is the first thing an employer reads. It has about fifteen
seconds.

- **What it is and why it exists** — one short paragraph, no buzzwords
- **The live link, prominent and near the top.** Explain demo access; if
  there is no login, say so rather than leaving them hunting
- **Features** — concise, concrete
- **Architecture** — a short diagram and the one insight that makes it
  click, linking to the full doc
- **Tech stack with reasons.** A bare list is a résumé; a list with "why"
  is engineering
- **Security, testing, deployment** — a few lines each, linking out
- **Local development** — enough to clone, configure, seed, and run
- Keep it short. Detail belongs in `docs/`.

---

## Phase 10 — Interview guide

**`docs/INTERVIEW_GUIDE.md`** — the highest-value document, because it is
the one the user actually uses.

- **30-second explanation** in plain English, written as speakable prose
- **How to explain the architecture** — including which three points to
  lead with
- **Request lifecycle**, end to end, naming real files
- **Engineering decisions**: decision → alternatives considered → why this
  one → **trade-off**. The trade-off is what makes it credible.
- **Security talking points**, leading with the threat model
- **Database**: schema, relationships, indexes, migrations, access
  approach — and what breaks at scale
- **Deployment**: hosting, CI/CD, config, secrets, lifecycle
- **Testing**: what is tested, why, and what is not
- **Deliberate simplifications** — an explicit table. Knowing where you
  did not build something is a stronger signal than a longer feature list.
- **Likely questions with concise answers**, including the uncomfortable
  ones: _"isn't this over-engineered?"_, _"what's the weakest part?"_,
  _"what would you do differently?"_
- **Things not to say** — overclaims that invite a bad follow-up

Write it in the user's voice, as sentences they can say out loud. **Never
invent a feature or a technology that is not in the repository.** The
document is worthless the moment one claim in it turns out to be false in
an interview.

---

## Phase 11 — Final verification

Verify, do not assume. Then report exactly what you verified and how.

- [ ] Build succeeds — every configuration that ships
- [ ] Full test suite passes; report the number
- [ ] Lint / typecheck / format clean
- [ ] Migrations and seeding run from a clean state
- [ ] App starts from a fresh clone
- [ ] No secrets committed — full history scanned
- [ ] Demo data contains nothing personal
- [ ] Auth and authorization work, if present
- [ ] Important workflows work
- [ ] **Deployment succeeded and the live URL is reachable**
- [ ] **The deployed app shows the seeded demo data**
- [ ] **A real workflow tested against the deployed site**, not just locally
- [ ] Deep links / client routes work in production
- [ ] Browser console clean on the live site — a stray error reads as sloppy
- [ ] README links resolve
- [ ] Docs match the implementation

**Anything unverified must be named as unverified in the final report.**

---

## Final report

- What changed
- Architecture before → after
- Security findings and fixes
- Demo data strategy
- Deployment architecture and **the live URL**
- CI/CD setup
- Tests added — real before/after numbers
- Documentation created
- **Remaining risks and limitations**
- **Anything the user must configure manually**
- **Anything that could not be verified**

The last three matter most. A report that claims everything is perfect is
less trustworthy than one that names three things it could not confirm.

---

## Anti-patterns

| Don't                                         | Do                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------- |
| Rewrite a working app in your preferred stack | Improve incrementally; justify every structural change              |
| Add patterns because they're impressive       | Add structure the domain actually earns                             |
| Stop after the assessment                     | Assess, then implement, then deploy, then verify                    |
| Claim "deployed" from a green config          | Fetch the live URL and check the response                           |
| Ship a header the platform ignores            | Remove it and document the real gap                                 |
| Lower a gate the first time it fires          | Fix the finding; a relaxed gate is not a gate                       |
| Copy the user's real data into the demo       | Generate a fixture, in a separate namespace, seeded only when empty |
| Recommend a "free" tier that wants a card     | Verify current terms with web access                                |
| Write docs describing an idealized version    | Describe what the code does, exactly                                |
| Pad the test count                            | Test the properties the deployment depends on                       |
| Say "production-ready"                        | Say what is deployed, tested, and documented — and what is not      |
