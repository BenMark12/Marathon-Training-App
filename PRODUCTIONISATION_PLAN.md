# Productionisation plan

Migrating the Marathon Training App from a vanilla-JS, localStorage-only browser app to a multi-user web app on Next.js + Clerk + Vercel Blob.

## Assumptions challenged up front

1. **Vercel Blob vs Postgres** — Blob is fine for this scale (plans are document-shaped, low write volume) but has no queries, no transactions, no secondary indexes. If the product ever needs "list all users on plan week 8" or leaderboards, a relational store is the right call. Sticking with Blob *on the assumption that the product stays single-user-per-account*.
2. **Folio vs raw `@vercel/blob`** — Folio (markdown-with-frontmatter over Blob) is overkill: we have ~3 JSON blobs per user (plan, completions, strava-tokens), not a CMS. Raw `@vercel/blob` + a thin typed wrapper is simpler.

## Target architecture

```
/app                        Next.js App Router
  /(marketing)/page.tsx     landing
  /dashboard/page.tsx       plan list
  /plans/[id]/page.tsx      plan view
  /plans/[id]/day/[date]    day modal
  /api/strava/callback      OAuth callback
  /api/strava/sync          token refresh + activity pull
/lib
  /engine/                  ported pure JS → TS (dateScaffold, blockOptimizer, …)
  /data/                    plan/*.json (read at build time, not runtime)
  /storage/                 blob wrappers (getPlan, savePlan, getCompletions…)
  /strava/                  server-only OAuth + sync
/components                 React + SCSS modules
/tests                      Vitest (engine) + Playwright (e2e)
```

Blob key scheme:

- `users/{userId}/plans/{planId}.json` — full generated plan
- `users/{userId}/plans-index.json` — list/metadata only
- `users/{userId}/completions/{planId}.json`
- `users/{userId}/strava.json` — tokens (server-only reads)

## Phased plan

### Phase 0 — Decide, scaffold (0.5 day)

- Create a GitHub issue per phase.
- `create-next-app --ts --app --no-tailwind`; add `sass`, `vitest`, `@clerk/nextjs`, `@vercel/blob`, `zod`.
- Wire Clerk middleware + `<ClerkProvider>` in `app/layout.tsx`. Protect everything under `/dashboard` and `/plans`.
- Vercel project + Blob store provisioned; `BLOB_READ_WRITE_TOKEN` + Clerk keys in env.

### Phase 1 — Port the engine (1–2 days)

- Copy `engine/*.js` → `lib/engine/*.ts`. The engine is already pure, no DOM, no `localStorage` — the three-layer split pays off here.
- Add types for the JSON shapes. **Keep the exact property names** (`Session Distance`, `Upper`, `Lower`, `UppeDif`, `LowerDif`, `Rep 1`…`Rep N`, etc.); do not rename. This contract is load-bearing per `CLAUDE.md`.
- Move `data/*.json` under `lib/data/` and import directly; do not `fetch()` at runtime.
- Port the inlined browser tests from `tests/index.html` into Vitest specs alongside each engine module. Highest-leverage TDD moment — lock behaviour before the UI rewrite.
- Convert `tools/validate-sessionTemplates.js` into a Vitest test so CI runs it.

### Phase 2 — Storage layer (1 day)

- `lib/storage/blob.ts`: typed `getJson<T>(key)` / `putJson(key, value)` over `@vercel/blob`. Use `addRandomSuffix: false` + `allowOverwrite: true` so keys are stable.
- `lib/storage/plans.ts`: `listPlans(userId)`, `getPlan(userId, planId)`, `savePlan`, `deletePlan`. Zod-validate on read (guards against schema drift).
- Optimistic concurrency: Blob does not support If-Match natively; for a single-user app, accept last-write-wins. Document this.

### Phase 3 — Server actions + routes (2 days)

- `app/actions/plans.ts` (`'use server'`): `generatePlan(input)` calls the ported engine, persists via storage layer, `revalidatePath('/dashboard')`.
- `app/actions/completions.ts`: `toggleDayComplete(planId, date)`.
- All reads happen in Server Components. Clerk's `auth()` gives `userId` directly — no prop drilling.

### Phase 4 — UI rewrite (3–5 days, the biggest chunk)

- This is a real rewrite: `src/ui/renderers.js` currently builds HTML strings with inline `window.*` onclick handlers. That pattern does not survive the move to React.
- Break renderers into components: `PlanGrid`, `WeekRow`, `DayCell`, `DayDetailModal` (intercepting route `/plans/[id]/@modal/(.)day/[date]`).
- Port `styles/tokens.css` → global SCSS; convert `components.css` / `app.css` to `*.module.scss` per component. Keep hardcoded gradients verbatim.
- Client components only where needed (form inputs, completion toggles, modal). Everything else stays server.

### Phase 5 — Strava (1–2 days, security-sensitive)

- Currently tokens live in `localStorage` under `marathon-strava`. That is a finding: OAuth tokens must not live in the browser.
- New flow: `/api/strava/callback` exchanges code → stores tokens in Blob under `users/{userId}/strava.json`. Browser never sees the token.
- `app/actions/strava.ts`: `syncRecentActivities()` runs server-side, refreshes tokens, pulls activities, reconciles with completions.

### Phase 6 — Migration path for existing data (0.5 day)

- A one-shot `/migrate` client page that reads the legacy `localStorage` keys (`marathon-plans-index`, `marathon-plan::*`, `marathon-comp::*`) and POSTs them to a server action that writes Blob under the signed-in user. Then clears `localStorage`.
- Ship it, run once on each browser that has legacy data, remove in the next release.

### Phase 7 — CI + ship (0.5 day)

- GitHub Actions: `vitest run` + `tsc --noEmit` on PR.
- Vercel preview deployments per PR (default).
- Playwright smoke test: sign in → generate plan → tick a day → reload → still ticked.

## Total: ~9–13 focused working days

## Biggest risks

- **UI rewrite is the long pole**, not the backend. Budget accordingly.
- **Blob prefix listing is all you get** — fine for "list my plans," bad for any cross-user query. Revisit if product direction changes.
- **Clerk free tier is 10k MAU** — fine unless this goes viral.
- **Do not rename JSON property names** during the TS port. The engine reads them as exact strings. Type them, do not rename them.
