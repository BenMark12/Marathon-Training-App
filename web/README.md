# Watto — web app

The production Next.js app for the Marathon Training Plan generator. See [`CLAUDE.md`](./CLAUDE.md) for the authoritative guide to the stack, layout, and do-not-break contracts; see the repo root [`README.md`](../README.md) for project context and the engine's workbook provenance.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, AUTH_SECRET
pnpm dev                     # http://localhost:3000
```

Generate `AUTH_SECRET` with `openssl rand -base64 32`. Strava OAuth callback: `http://localhost:3000/api/auth/callback/strava` (local) or `https://<vercel-domain>/api/auth/callback/strava` (prod).

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (engine + storage unit tests) |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:e2e` | Playwright smoke suite |

## Stack

Next.js 16 (App Router) · React 19 · Auth.js v5 (Strava OAuth) · Vercel Blob · SCSS modules · Vitest · Playwright · Zod.
