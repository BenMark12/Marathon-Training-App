# CLAUDE.md

The app is the Next.js project in [`/web`](./web). Start with [`web/CLAUDE.md`](./web/CLAUDE.md) — it covers the stack, layout, architectural rules, and the do-not-break JSON contracts that the training engine depends on.

There is no root-level `package.json`; if you see a stray one, delete it. Everything runs from `web/`:

| Task | Command |
| --- | --- |
| Dev server | `pnpm dev` |
| Unit tests | `pnpm test` (Vitest) |
| Type check | `pnpm typecheck` |
| Lint | `pnpm lint` |
| E2E smoke | `pnpm test:e2e` (Playwright) |
| Build | `pnpm build` |

## Project context

The generator is a port of an Excel/VBA "Training Block Template V9" workbook. Data JSON in `web/lib/data/` was extracted from that workbook. Expect minor numeric divergence from the VBA because random session picks use `Math.random()` instead of VBA's `Rnd`, and pace arithmetic uses seconds instead of Excel date serials.

The legacy vanilla-JS implementation that previously lived at the repo root was removed once the TypeScript port in `web/lib/engine/` reached parity. The snapshot is preserved as the `legacy-reference-snapshot` git tag if you need to diff against the original.
