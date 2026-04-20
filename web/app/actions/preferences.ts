"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/session";
import { getPreferences, savePreferences } from "@/lib/storage/preferences";

const UpdatePreferencesSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  weeklyEmailOptIn: z.boolean(),
});

export type UpdatePreferencesResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updatePreferencesAction(
  rawInput: unknown,
): Promise<UpdatePreferencesResult> {
  const userId = await requireUserId();
  const parsed = UpdatePreferencesSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { email, weeklyEmailOptIn } = parsed.data;
  if (weeklyEmailOptIn && !email) {
    return {
      ok: false,
      error: "Add an email address before opting in to weekly emails.",
    };
  }

  await savePreferences(userId, { email, weeklyEmailOptIn });
  revalidatePath("/account");
  return { ok: true };
}

export async function getPreferencesAction() {
  const userId = await requireUserId();
  return getPreferences(userId);
}
