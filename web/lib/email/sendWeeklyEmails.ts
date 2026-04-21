import { buildWeeklyEmail, findUpcomingWeek } from "@/lib/email/weeklyPlan";
import { sendEmail } from "@/lib/email/resend";
import { siteUrl } from "@/lib/site";
import { listUnderPrefix } from "@/lib/storage/blob";
import { USERS_PREFIX } from "@/lib/storage/keys";
import { getPreferences } from "@/lib/storage/preferences";
import { getPlan, listPlans } from "@/lib/storage/plans";

export type WeeklyEmailSendSummary = {
  sent: number;
  skipped: number;
  failed: number;
  errors: { userId: string; error: string }[];
};

/**
 * Walk the blob store for preference files. We can't enumerate users any other
 * way, so the presence of `users/{id}/preferences.json` is the signal. Users
 * who never saved a preference aren't opted in and don't get mail.
 */
async function listUsersWithPreferences(): Promise<string[]> {
  const keys = await listUnderPrefix(USERS_PREFIX);
  const ids = new Set<string>();
  for (const key of keys) {
    const match = key.match(/^users\/([^/]+)\/preferences\.json$/);
    if (match) ids.add(match[1]);
  }
  return [...ids];
}

function activePlanId(
  plans: { planId: string; raceDate: string }[],
  ref: Date,
): string | null {
  const refDay = ref.toISOString().slice(0, 10);
  const upcoming = plans
    .filter((p) => p.raceDate >= refDay)
    .sort((a, b) => a.raceDate.localeCompare(b.raceDate));
  return upcoming[0]?.planId ?? null;
}

export async function sendWeeklyEmailsForAllUsers(
  ref: Date = new Date(),
): Promise<WeeklyEmailSendSummary> {
  const summary: WeeklyEmailSendSummary = {
    sent: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const userIds = await listUsersWithPreferences();

  for (const userId of userIds) {
    try {
      const prefs = await getPreferences(userId);
      if (!prefs?.weeklyEmailOptIn || !prefs.email) {
        summary.skipped++;
        continue;
      }

      const plans = await listPlans(userId);
      const planId = activePlanId(plans, ref);
      if (!planId) {
        summary.skipped++;
        continue;
      }

      const plan = await getPlan(userId, planId);
      if (!plan) {
        summary.skipped++;
        continue;
      }

      const week = findUpcomingWeek(plan, ref);
      if (!week) {
        summary.skipped++;
        continue;
      }

      const email = buildWeeklyEmail({
        plan,
        week,
        ref,
        planUrl: `${siteUrl}/plans/${plan.planId}`,
      });

      await sendEmail({
        to: prefs.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      summary.sent++;
    } catch (err) {
      summary.failed++;
      summary.errors.push({
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return summary;
}

export const __test = { activePlanId, listUsersWithPreferences };
