"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { saveCompletions, getCompletions } from "@/lib/storage/completions";
import { getPlan } from "@/lib/storage/plans";
import { getStravaTokens } from "@/lib/storage/strava";
import { fetchRunActivitiesSince } from "@/lib/strava/client";

export type SyncResult =
  | { ok: true; newMatches: number }
  | { ok: false; error: string };

export async function syncActivitiesAction(planId: string): Promise<SyncResult> {
  const userId = await requireUserId();

  const [tokens, plan, completions] = await Promise.all([
    getStravaTokens(userId),
    getPlan(userId, planId),
    getCompletions(userId, planId),
  ]);

  if (!tokens) return { ok: false, error: "Reconnect Strava to sync activities." };
  if (!plan) return { ok: false, error: "Plan not found." };
  if (plan.days.length === 0) return { ok: true, newMatches: 0 };

  const planStart = plan.days[0].dateStr;

  let runs;
  try {
    runs = await fetchRunActivitiesSince(userId, planStart);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to fetch Strava.",
    };
  }

  const runDateSet = new Set(
    runs.map((a) => a.start_date_local.split("T")[0]),
  );

  const next = { ...completions.completed };
  const now = new Date().toISOString();
  let newMatches = 0;

  for (const day of plan.days) {
    if (day.focusArea === "Rest") continue;
    if (next[day.dateStr]) continue;
    if (runDateSet.has(day.dateStr)) {
      next[day.dateStr] = now;
      newMatches++;
    }
  }

  if (newMatches > 0) {
    await saveCompletions(userId, { planId, completed: next });
    revalidatePath(`/plans/${planId}`);
  }

  return { ok: true, newMatches };
}
