import type { z } from "zod";
import type {
  PlanDaySchema,
  PlanWeekSchema,
  StoredPlanSchema,
} from "@/lib/storage/schemas";

type StoredPlan = z.infer<typeof StoredPlanSchema>;
type PlanWeek = z.infer<typeof PlanWeekSchema>;
type PlanDay = z.infer<typeof PlanDaySchema>;

export type WeeklyEmail = {
  subject: string;
  html: string;
  text: string;
};

/**
 * Pick the week that contains the reference date. When the send runs on Sunday
 * evening it's meant to tee up the week starting Monday, so we also look at
 * `ref + 1 day` and prefer a week that starts on that Monday. Falls back to
 * the first week whose last day is on/after `ref`.
 */
export function findUpcomingWeek(
  plan: StoredPlan,
  ref: Date,
): PlanWeek | null {
  if (plan.weeks.length === 0) return null;

  const refDay = toYmd(ref);
  const tomorrow = new Date(ref.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDay = toYmd(tomorrow);

  const weekStartingTomorrow = plan.weeks.find(
    (w) => w.days[0]?.dateStr === tomorrowDay,
  );
  if (weekStartingTomorrow) return weekStartingTomorrow;

  const containing = plan.weeks.find((w) =>
    w.days.some((d) => d.dateStr === refDay),
  );
  if (containing) return containing;

  return plan.weeks.find((w) => (w.days.at(-1)?.dateStr ?? "") >= refDay) ?? null;
}

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function fmtRange(week: PlanWeek): string {
  const first = week.days[0]?.dateStr;
  const last = week.days.at(-1)?.dateStr;
  if (!first || !last) return "";
  const f = new Date(first).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  const l = new Date(last).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  return `${f} – ${l}`;
}

function daysUntilRace(raceDate: string, ref: Date): number {
  const race = new Date(raceDate).getTime();
  const refMid = new Date(toYmd(ref)).getTime();
  return Math.max(0, Math.round((race - refMid) / (24 * 60 * 60 * 1000)));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function dayLine(day: PlanDay): { title: string; detail: string } {
  const title = day.sessionSummary || day.focusArea;
  const parts: string[] = [];
  if (day.totalDistance > 0) parts.push(`${day.totalDistance} km`);
  if (day.sessionDescription) parts.push(day.sessionDescription);
  return { title, detail: parts.join(" — ") };
}

function renderHtml(
  plan: StoredPlan,
  week: PlanWeek,
  ref: Date,
  planUrl: string | null,
): string {
  const rows = week.days
    .map((d) => {
      const { title, detail } = dayLine(d);
      return `
        <tr>
          <td style="padding:8px 12px 8px 0; font-size:13px; color:#666; white-space:nowrap; vertical-align:top;">${escapeHtml(
            fmtDate(d.dateStr),
          )}</td>
          <td style="padding:8px 0; font-size:14px; color:#111; vertical-align:top;">
            <div style="font-weight:600;">${escapeHtml(title)}</div>
            ${
              detail
                ? `<div style="font-size:13px; color:#444; margin-top:2px;">${escapeHtml(detail)}</div>`
                : ""
            }
          </td>
        </tr>`;
    })
    .join("");

  const cta = planUrl
    ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(planUrl)}" style="background:#1f6feb; color:#fff; text-decoration:none; padding:10px 16px; border-radius:6px; display:inline-block; font-size:14px;">Open plan</a></p>`
    : "";

  const daysToRace = daysUntilRace(plan.planMeta.raceDate, ref);

  return `<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#f7f7f8; margin:0; padding:24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; margin:0 auto; background:#fff; border-radius:10px; padding:24px;">
      <tr><td>
        <p style="margin:0 0 4px; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:#777;">Week ${week.weekNumber} · ${escapeHtml(fmtRange(week))}</p>
        <h1 style="margin:0 0 16px; font-size:20px; color:#111;">This week's plan</h1>
        <p style="margin:0 0 16px; font-size:14px; color:#444;">
          ${week.totalMileage} km total${week.isTaper ? " · taper" : ""} · ${daysToRace} days to ${escapeHtml(plan.planMeta.raceDistance)}
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${rows}
        </table>
        ${cta}
        <p style="margin:24px 0 0; font-size:12px; color:#888;">You're getting this because you opted in to the weekly email. Update your preferences on the account page.</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

function renderText(
  plan: StoredPlan,
  week: PlanWeek,
  ref: Date,
  planUrl: string | null,
): string {
  const daysToRace = daysUntilRace(plan.planMeta.raceDate, ref);
  const header = `Week ${week.weekNumber} · ${fmtRange(week)}
${week.totalMileage} km total${week.isTaper ? " · taper" : ""} · ${daysToRace} days to ${plan.planMeta.raceDistance}`;

  const lines = week.days.map((d) => {
    const { title, detail } = dayLine(d);
    return `${fmtDate(d.dateStr)} — ${title}${detail ? `\n  ${detail}` : ""}`;
  });

  const footer = planUrl ? `\n\nOpen plan: ${planUrl}` : "";
  return `${header}\n\n${lines.join("\n\n")}${footer}\n\nYou're getting this because you opted in to the weekly email.`;
}

export function buildWeeklyEmail(args: {
  plan: StoredPlan;
  week: PlanWeek;
  ref: Date;
  planUrl?: string | null;
}): WeeklyEmail {
  const { plan, week, ref, planUrl = null } = args;
  const subject = `Week ${week.weekNumber} · ${week.totalMileage} km${week.isTaper ? " · taper" : ""}`;
  return {
    subject,
    html: renderHtml(plan, week, ref, planUrl),
    text: renderText(plan, week, ref, planUrl),
  };
}
