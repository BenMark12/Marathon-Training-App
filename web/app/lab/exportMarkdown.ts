import type {
  GeneratePlanInput,
  GeneratedPlan,
  TuningParams,
} from "@/lib/engine";
import { DEFAULT_TUNING } from "@/lib/engine";

const TUNING_LABELS: Partial<Record<keyof TuningParams, string>> = {
  minTrainingDays: "Min training days",
  longRunFraction: "Long-run fraction",
  longRunCapKm: "Long-run cap (km)",
  intensityFraction: "Intensity fraction",
  sessionsMin: "Sessions min",
  sessionsMax: "Sessions max",
  sessionsLowMileageThreshold: "Low mileage → 3",
  sessionsHighMileageThreshold: "High mileage → 5",
  sessionsBumpMileageThreshold: "Bump-to-4 threshold",
  sessionsClampHighPeakMileage: "Clamp: high peak",
  sessionsClampDownMileage: "Clamp: down-shift",
  sessionsClampUpMileage: "Clamp: up-shift",
  weeklyGrowthCap: "Weekly growth cap",
  perWeekGrowthCeiling: "Per-week ceiling",
  deload1Factor: "Deload week 1 factor",
  deload2Factor: "Deload week 2 factor",
  peakWeeksPerBlock: "Peak weeks / block",
  deloadWeeks: "Deload weeks",
  taperDays: "Taper window (days)",
  slackTargetMin: "Slack target min",
  slackTargetMax: "Slack target max",
  pyramidalBonus: "Pyramidal bonus",
  uniformBonus: "Uniform bonus",
  paceUpliftSeconds: "Pace uplift (s)",
  paceIndexMax: "Pace index max",
};

function formatValue(v: unknown): string {
  if (Array.isArray(v)) return `[${v.join(", ")}]`;
  if (typeof v === "object" && v !== null) {
    return Object.entries(v)
      .map(([k, val]) => `${k}: ${val}`)
      .join(", ");
  }
  if (typeof v === "number") {
    return Number.isInteger(v) ? String(v) : v.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  }
  return String(v);
}

function tuningDiff(tuning: TuningParams): Array<[string, string, string]> {
  const rows: Array<[string, string, string]> = [];
  (Object.keys(DEFAULT_TUNING) as Array<keyof TuningParams>).forEach((key) => {
    const current = tuning[key];
    const def = DEFAULT_TUNING[key];
    if (formatValue(current) !== formatValue(def)) {
      rows.push([
        TUNING_LABELS[key] ?? String(key),
        formatValue(current),
        formatValue(def),
      ]);
    }
  });
  return rows;
}

function mdEscape(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function buildMarkdownExport(
  plan: GeneratedPlan,
  input: GeneratePlanInput,
  tuning: TuningParams,
): string {
  const lines: string[] = [];

  lines.push(`# Watto training plan export`);
  lines.push("");
  lines.push(`_Generated ${new Date().toISOString()}_`);
  lines.push("");

  lines.push(`## Athlete inputs`);
  lines.push("");
  lines.push(`| Parameter | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Race date | ${input.raceDate} |`);
  lines.push(`| Race distance | ${input.raceDistance ?? "Marathon"} |`);
  lines.push(`| Current km / week | ${input.currentMileage} |`);
  lines.push(`| Target km / week | ${input.targetMileage} |`);
  lines.push(`| Sessions / week | ${input.sessionsPerWeek} |`);
  lines.push(`| Current time | ${input.currentPace} |`);
  lines.push(`| Target time | ${input.targetPace} |`);
  lines.push(`| Style | ${input.style ?? "Endurance"} |`);
  lines.push("");

  const diffs = tuningDiff(tuning);
  lines.push(`## Tuning`);
  lines.push("");
  if (diffs.length === 0) {
    lines.push(`_All defaults — no tuning changes applied._`);
  } else {
    lines.push(`| Knob | Current | Default |`);
    lines.push(`| --- | --- | --- |`);
    for (const [label, cur, def] of diffs) {
      lines.push(`| ${label} | \`${cur}\` | \`${def}\` |`);
    }
  }
  lines.push("");

  const totalKm = plan.days.reduce((s, d) => s + (d.totalDistance || 0), 0);
  const peakWeek = plan.weeks.reduce(
    (m, w) => (w.totalMileage > m.totalMileage ? w : m),
    plan.weeks[0],
  );
  const sessionCount = plan.days.filter(
    (d) => !d.isRest && (d.totalDistance ?? 0) > 0,
  ).length;
  const restDays = plan.days.filter((d) => d.isRest).length;

  lines.push(`## Summary`);
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Total days | ${plan.planMeta.totalDays} |`);
  lines.push(`| Total weeks | ${plan.planMeta.totalWeeks} |`);
  lines.push(`| Blocks | ${plan.planMeta.planBlockCount} |`);
  lines.push(
    `| Block shape | ${plan.planMeta.blocks.map((b) => `${b.blockWeeks}w (${b.sessionWeeks}s)`).join(" · ")} |`,
  );
  lines.push(`| Peak week | #${peakWeek.weekNumber} — ${Math.round(peakWeek.totalMileage)} km |`);
  lines.push(`| Total km | ${Math.round(totalKm)} |`);
  lines.push(`| Sessions | ${sessionCount} |`);
  lines.push(`| Rest days | ${restDays} |`);
  lines.push(`| Taper starts | day ${plan.planMeta.taperStartDayIndex + 1} |`);
  lines.push(`| Slack days | ${plan.planMeta.slackDays} |`);
  lines.push(`| Start pace index | ${plan.planMeta.startPaceIndex} |`);
  lines.push("");

  lines.push(`## Weekly overview`);
  lines.push("");
  lines.push(`| Week | Block | Km | Taper |`);
  lines.push(`| ---: | ---: | ---: | :---: |`);
  for (const w of plan.weeks) {
    lines.push(
      `| ${w.weekNumber} | ${w.blockNumber} | ${Math.round(w.totalMileage)} | ${w.isTaper ? "✓" : ""} |`,
    );
  }
  lines.push("");

  lines.push(`## Full plan`);
  lines.push("");
  lines.push(`| Date | Day | Wk | Blk | Focus | Summary | Km | Week km |`);
  lines.push(`| --- | --- | ---: | ---: | --- | --- | ---: | ---: |`);
  for (const d of plan.days) {
    const km = d.totalDistance ? d.totalDistance.toFixed(1) : "—";
    lines.push(
      `| ${d.dateStr} | ${d.dayOfWeek.slice(0, 3)} | ${d.weekNumber} | ${d.blockNumber} | ${mdEscape(d.focusArea)} | ${mdEscape(d.sessionSummary || "—")} | ${km} | ${d.weeklyMileage} |`,
    );
  }
  lines.push("");

  return lines.join("\n");
}

export function downloadMarkdown(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportFilename(input: GeneratePlanInput): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `watto-plan-${input.raceDate}-${ts}.md`;
}
