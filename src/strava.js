/**
 * strava.js — legacy stub.
 *
 * The pre-migration Strava integration went through Firebase Cloud Functions
 * to exchange the OAuth code server-side (client secret can't live in the
 * browser). With Firebase decommissioned, Strava in the legacy browser app
 * is disabled. Users who want Strava sync should use the Next.js app in
 * /web, which has a proper server-side OAuth flow.
 *
 * All functions here remain exported so the rest of the legacy app can keep
 * importing them without errors; they no-op or return "not connected".
 */

const STRAVA_KEY = "marathon-strava";

export function stravaConnect() {
  alert(
    "Strava sync has moved to the new Flow web app. Open /web to sign in and sync activities.",
  );
}

export async function handleStravaCallback() {
  return null;
}

export async function getValidToken() {
  return null;
}

export function isStravaConnected() {
  return false;
}

export function getStravaAthlete() {
  return null;
}

export function disconnectStrava() {
  try {
    localStorage.removeItem(STRAVA_KEY);
  } catch {
    /* noop */
  }
}

export async function fetchRecentActivities() {
  return [];
}

export async function syncActivitiesToPlan() {
  return 0;
}
