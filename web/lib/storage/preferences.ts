import { getJson, putJson } from "./blob";
import { preferencesKey } from "./keys";
import { UserPreferencesSchema, type UserPreferences } from "./schemas";

export async function getPreferences(
  userId: string,
): Promise<UserPreferences | null> {
  return getJson(preferencesKey(userId), UserPreferencesSchema);
}

export async function savePreferences(
  userId: string,
  prefs: Omit<UserPreferences, "updatedAt">,
): Promise<UserPreferences> {
  const next: UserPreferences = {
    ...prefs,
    updatedAt: new Date().toISOString(),
  };
  await putJson(preferencesKey(userId), next);
  return next;
}
