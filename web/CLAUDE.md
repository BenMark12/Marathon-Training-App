# Watto — web app (Next.js production build)

This directory is the production Next.js app. The legacy vanilla-JS reference implementation that previously lived at the repo root has been deleted — the engine is fully ported to TypeScript under `lib/engine/`. See the `legacy-reference-snapshot` git tag if you ever need the original sources.

## Stack

- Next.js 16 (App Router) + React 19
- Auth.js v5 (`next-auth`), Strava as the sole OAuth provider (see `web/auth.ts`)
- Vercel Blob for plan / completions / strava-token storage (`@vercel/blob`)
- SCSS modules for styling
- Vitest for unit tests, Playwright for e2e smoke
- Zod for storage-layer schema validation

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in STRAVA_CLIENT_ID/SECRET + AUTH_SECRET
pnpm dev
pnpm test
pnpm typecheck
pnpm test:e2e
pnpm build
```

`AUTH_SECRET`: `openssl rand -base64 32`.
Strava redirect URI in the Strava app settings: `http://localhost:3000/api/auth/callback/strava` locally, `https://<vercel-domain>/api/auth/callback/strava` in production.

## Layout

```
app/
├── layout.tsx                         Root layout + metadata + parallel-route `modal` slot
├── page.tsx                           Landing (Watto hero + connect-Strava CTA)
├── onboarding/                        Guided race/pace/mileage setup → creates first plan
├── (app)/                             Authed routes group (AppShell w/ BottomNav + MigrationBanner)
│   ├── dashboard/                     Active-plan summary / plan picker
│   ├── plans/new/                     PlanForm (manual create)
│   ├── plans/[id]/                    Plan grid (week-by-week calendar)
│   │   ├── progress/                  Block timeline, focus donut, mileage chart, key sessions
│   │   ├── activities/                Synced Strava activities list
│   │   ├── day/[date]/                Full-page day detail (deep link)
│   │   └── @modal/(.)day/[date]/      Intercepting route — same day detail as a modal overlay
│   ├── account/                       Strava connection + account actions
│   └── migrate/                       One-shot legacy-localStorage import
├── actions/                           'use server' mutations (auth, plans, completions, strava, migrate)
├── api/auth/[...nextauth]/route.ts    Auth.js handlers
└── globals.scss + _tokens.scss        Global styles + design tokens
auth.ts                                NextAuth config (Strava provider + session shape)
proxy.ts                               Auth guard (Next.js renamed middleware → proxy)
types/next-auth.d.ts                   Session.user.athleteId + JWT token shape
components/
├── plan/                              Plan grid, week row, day cell, day detail modal, plan actions
├── progress/                          Progress view widgets (timeline, donut, charts, status)
├── activities/                        Strava activities list
└── shell/                             AppShell, BottomNav, AccountSection, MigrationBanner
lib/
├── auth/                              Session helpers (requires auth() userId)
├── engine/                            TS port of the training engine (pure, no IO)
├── data/                              sessionTemplates.json / paceTables.json / config.json / races.json
├── storage/                           Vercel Blob wrappers (typed + Zod-validated)
├── strava/                            Server-side token refresh + activity sync
├── progress/                          buildProgressView — derives progress widgets from plan + completions
└── migrate/                           One-shot legacy-localStorage import helpers
e2e/                                   Playwright specs
```

## Blob key scheme

- `users/{userId}/plans/{planId}.json` — full generated plan
- `users/{userId}/plans-index.json` — list/metadata only
- `users/{userId}/completions/{planId}.json`
- `users/{userId}/strava.json` — tokens (server-only reads; browser never sees them)
- `users/{userId}/preferences.json` — email address + weekly-email opt-in

Uses `addRandomSuffix: false` + `allowOverwrite: true` for stable keys. No optimistic concurrency — single-user-per-account means last-write-wins is acceptable.

## Do-not-break contracts

The engine preserves load-bearing JSON property names that come straight from the source workbook: `Session Distance`, `Total Distance`, `Upper`, `Lower`, `UppeDif`, `LowerDif`, `Rep 1`…`Rep N`, the 14 session table names (see `lib/engine/sessionSelector.ts`), and the `{Type}_Paces_{Style}_{MarathonTime}` pace-table naming convention. Type them — do not rename them. Distances are in **metres**, paces in **seconds**; the UI divides by 1000 for km display.

## Architectural rules

- **Engine stays pure.** `lib/engine/*` must not import from `app/`, `components/`, or any storage/auth module. Data in → data out. Tests live alongside as `*.spec.ts`.
- **Reads in Server Components, writes via server actions.** Use `auth()` in server code for `userId`; never pass it as a prop.
- **Tokens never touch the browser.** Strava access + refresh tokens are stored in Blob and read only by `lib/strava/*` and `app/actions/strava.ts`.
- **Zod-validate on read.** Any `getJson<T>(key)` path goes through a schema; this guards against Blob drift.
