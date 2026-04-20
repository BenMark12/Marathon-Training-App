/**
 * Helpers for reading the legacy vanilla-JS app's localStorage shape.
 * Browser-only — don't import from server code.
 */

export const PLAN_INDEX_KEY = "marathon-plans-index";
export const PLAN_PREFIX = "marathon-plan::";
export const COMPLETION_PREFIX = "marathon-comp::";
export const OLD_PLAN_KEY = "marathon-training-plan";
export const OLD_COMP_KEY = "marathon-completions";
export const STRAVA_KEY = "marathon-strava";

export interface LegacyPlanEntry {
  planId: string;
  raceName?: string;
  raceDate?: string;
  distance?: string;
  createdAt?: string;
}

export interface LegacyPayload {
  entry: LegacyPlanEntry;
  plan: unknown;
  completions: unknown;
}

function safeParse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Returns all legacy plan payloads found in localStorage, including any very-old single-plan entry. */
export function readLegacyPayloads(): LegacyPayload[] {
  if (typeof window === "undefined") return [];
  const out: LegacyPayload[] = [];

  const index = safeParse(localStorage.getItem(PLAN_INDEX_KEY));
  if (Array.isArray(index)) {
    for (const entry of index as LegacyPlanEntry[]) {
      if (!entry?.planId) continue;
      const plan = safeParse(localStorage.getItem(PLAN_PREFIX + entry.planId));
      const comp = safeParse(localStorage.getItem(COMPLETION_PREFIX + entry.planId));
      if (plan) out.push({ entry, plan, completions: comp ?? {} });
    }
  }

  // Legacy single-plan shape (pre-multi-plan).
  const singlePlan = safeParse(localStorage.getItem(OLD_PLAN_KEY));
  if (singlePlan) {
    const comp = safeParse(localStorage.getItem(OLD_COMP_KEY));
    out.push({
      entry: { planId: "legacy-single" },
      plan: singlePlan,
      completions: comp ?? {},
    });
  }

  return out;
}

export function clearLegacyStorage(): void {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (
      k === PLAN_INDEX_KEY ||
      k === OLD_PLAN_KEY ||
      k === OLD_COMP_KEY ||
      k === STRAVA_KEY ||
      k.startsWith(PLAN_PREFIX) ||
      k.startsWith(COMPLETION_PREFIX)
    ) {
      keys.push(k);
    }
  }
  for (const k of keys) localStorage.removeItem(k);
}

export function hasLegacyData(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(PLAN_INDEX_KEY)) return true;
  if (localStorage.getItem(OLD_PLAN_KEY)) return true;
  return false;
}
