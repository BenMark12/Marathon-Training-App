# Storage (Phase 2)

Typed wrappers over `@vercel/blob`. Keys:

- `users/{userId}/plans/{planId}.json`
- `users/{userId}/plans-index.json`
- `users/{userId}/completions/{planId}.json` (keyed by `dateStr`, not array index)
- `users/{userId}/strava.json`

Zod-validate on read.

See issue #4.
