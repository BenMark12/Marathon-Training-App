# Marathon training plan generator

Browser-based marathon training plan generator, ported from an Excel/VBA workbook ("Training Block Template V9"). The production app is a Next.js + Auth.js + Vercel Blob app in [`/web`](./web) — multi-user accounts, server-side Strava OAuth + activity sync, and persistent plan storage.

## Run it

```bash
cd web
pnpm install
cp .env.example .env.local    # STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET / AUTH_SECRET
pnpm dev
```

See [`web/README.md`](./web/README.md) for the full setup guide and [`web/CLAUDE.md`](./web/CLAUDE.md) for architecture.

## Repo layout

- `web/` — the app (Next.js 16, React 19, TypeScript, SCSS modules, Vitest, Playwright)
- `.github/workflows/` — CI (typecheck, lint, test, build, e2e smoke)

There is no root-level `package.json`. All dependencies are managed under `web/`.

## History

A vanilla-JS reference implementation previously lived at the repo root and was ported to TypeScript under `web/lib/engine/` during phases 1–8 of the Next.js migration. The snapshot is preserved as the `legacy-reference-snapshot` git tag.
