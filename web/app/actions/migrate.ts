"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/session";
import { saveCompletions } from "@/lib/storage/completions";
import { savePlan } from "@/lib/storage/plans";
import { StoredPlanSchema, type StoredPlan } from "@/lib/storage/schemas";

/**
 * Accepts a legacy plan shape (no planId — it was keyed by localStorage key)
 * plus day-index-keyed completions, rekeys completions by dateStr, mints a
 * new planId, and persists via the storage layer.
 */

const LegacyPlanPayloadSchema = z.object({
  planMeta: z.object({}).passthrough(),
  days: z.array(z.object({ dateStr: z.string() }).passthrough()),
  weeks: z.array(z.object({}).passthrough()),
});

const LegacyCompletionsPayloadSchema = z.record(z.string(), z.string());

export type ImportLegacyResult =
  | { ok: true; planId: string }
  | { ok: false; error: string };

export async function importLegacyPlanAction(
  rawPlan: unknown,
  rawCompletions: unknown,
): Promise<ImportLegacyResult> {
  const userId = await requireUserId();

  const planParsed = LegacyPlanPayloadSchema.safeParse(rawPlan);
  if (!planParsed.success) {
    return { ok: false, error: "Legacy plan payload is not the expected shape." };
  }

  const compParsed = LegacyCompletionsPayloadSchema.safeParse(rawCompletions ?? {});
  if (!compParsed.success) {
    return { ok: false, error: "Legacy completions payload is malformed." };
  }

  const planId = crypto.randomUUID();

  const fullPlanRaw = { planId, ...planParsed.data };
  let plan: StoredPlan;
  try {
    plan = StoredPlanSchema.parse(fullPlanRaw);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Plan validation failed",
    };
  }

  // Rekey day-index-based completions to dateStr-based.
  const days = planParsed.data.days;
  const rekeyed: Record<string, string> = {};
  for (const [indexStr, ts] of Object.entries(compParsed.data)) {
    const idx = Number(indexStr);
    if (!Number.isInteger(idx)) continue;
    const day = days[idx];
    if (!day) continue;
    rekeyed[day.dateStr] = ts;
  }

  await savePlan(userId, plan);
  if (Object.keys(rekeyed).length > 0) {
    await saveCompletions(userId, { planId, completed: rekeyed });
  }

  revalidatePath("/dashboard");
  return { ok: true, planId };
}
