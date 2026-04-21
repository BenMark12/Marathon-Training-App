# Strava

Server-only token refresh and activity sync. Token exchange lives in the NextAuth config (`web/auth.ts`); refresh + activity fetch live in `client.ts`. Tokens are persisted in Blob via `lib/storage/strava.ts` and never reach the browser.
