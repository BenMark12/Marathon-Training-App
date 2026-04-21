# Storage

Typed wrappers over `@vercel/blob`. Keys (canonical list in `keys.ts`):

- `users/{userId}/plans/{planId}.json`
- `users/{userId}/plans-index.json`
- `users/{userId}/completions/{planId}.json` (keyed by `dateStr`, not array index)
- `users/{userId}/strava.json`

Zod-validate on read. Blob is written with `addRandomSuffix: false` + `allowOverwrite: true` for stable keys.
