# Flow — web app (Next.js port)

This directory is the Next.js + Vercel port of the marathon training app. The vanilla-JS app in the repo root keeps working until Phase 4 lands (see `/PRODUCTIONISATION_PLAN.md`).

## Stack

- Next.js 16 (App Router) + React 19
- Auth.js v5 (`next-auth`) with Strava as the sole OAuth provider (`web/auth.ts`)
- Vercel Blob for plan storage (`@vercel/blob`) — wired in Phase 2
- SCSS modules for styling
- Vitest for tests

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in STRAVA_CLIENT_ID/SECRET + AUTH_SECRET
pnpm dev
pnpm test
pnpm typecheck
pnpm build
```

`AUTH_SECRET`: `openssl rand -base64 32`.
Strava redirect URI in the Strava app settings: `http://localhost:3000/api/auth/callback/strava` locally, `https://<vercel-domain>/api/auth/callback/strava` in production.

## Layout

```
app/
├── layout.tsx           Root layout + metadata
├── page.tsx             Landing (connect-Strava CTA)
├── dashboard/page.tsx   Protected placeholder (Phase 3/4 will replace)
└── api/auth/[...nextauth]/route.ts   Auth.js handlers
auth.ts                  NextAuth config (Strava provider + session shape)
middleware.ts            Auth guard for /dashboard and /plans
types/next-auth.d.ts     Session.user.athleteId + JWT token shape
lib/
├── engine/              Phase 1 — TS port of ../engine/*.js
├── storage/             Phase 2 — Vercel Blob wrappers
└── strava/              Phase 5 — Server-side sync
tests/                   Vitest specs
```

## Do-not-break contracts (carry forward from root `CLAUDE.md`)

When Phase 1 lands, the ported TS engine must preserve the same load-bearing JSON property names as the legacy engine: `Session Distance`, `Total Distance`, `Upper`, `Lower`, `UppeDif`, `LowerDif`, `Rep 1`…`Rep N`, the 14 session table names, and the `{Type}_Paces_{Style}_{MarathonTime}` pace-table naming convention. Type them, do not rename them.
