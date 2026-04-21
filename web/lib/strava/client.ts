import { z } from "zod";
import {
  getStravaTokens,
  saveStravaTokens,
} from "@/lib/storage/strava";
import type { StravaTokens } from "@/lib/storage/schemas";

const TOKEN_URL = "https://www.strava.com/oauth/token";
const API_BASE = "https://www.strava.com/api/v3";
const REFRESH_WINDOW_SECONDS = 60;

const RefreshResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_at: z.number().int(),
});

const ActivitySchema = z.object({
  id: z.number(),
  type: z.string(),
  start_date_local: z.string(),
  distance: z.number(),
  moving_time: z.number().optional(),
  name: z.string().optional(),
});
const ActivitiesSchema = z.array(ActivitySchema);
export type StravaActivity = z.infer<typeof ActivitySchema>;

function isExpired(tokens: StravaTokens): boolean {
  return Date.now() / 1000 >= tokens.expiresAt - REFRESH_WINDOW_SECONDS;
}

async function refresh(tokens: StravaTokens): Promise<StravaTokens> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET not configured");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Strava token refresh failed: ${res.status}`);
  }
  const parsed = RefreshResponseSchema.parse(await res.json());
  return {
    ...tokens,
    accessToken: parsed.access_token,
    refreshToken: parsed.refresh_token,
    expiresAt: parsed.expires_at,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Return a valid access token for the user, refreshing (and persisting) if
 * the stored token is within the refresh window. Returns null if the user
 * never connected Strava.
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const stored = await getStravaTokens(userId);
  if (!stored) return null;

  if (!isExpired(stored)) return stored.accessToken;

  const refreshed = await refresh(stored);
  await saveStravaTokens(userId, refreshed);
  return refreshed.accessToken;
}

/**
 * Fetch all Strava run activities starting on or after `sinceIso`. Pages
 * up to 200 activities (Strava's per_page cap is 200).
 */
export async function fetchRunActivitiesSince(
  userId: string,
  sinceIso: string,
): Promise<StravaActivity[]> {
  const token = await getValidAccessToken(userId);
  if (!token) return [];

  const after = Math.floor(new Date(sinceIso).getTime() / 1000);
  const url = `${API_BASE}/athlete/activities?after=${after}&per_page=200`;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Strava activities fetch failed: ${res.status}`);
  }
  const parsed = ActivitiesSchema.parse(await res.json());
  return parsed.filter((a) => a.type === "Run");
}
