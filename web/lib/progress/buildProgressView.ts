import type { StoredPlan, Completions } from "@/lib/storage/schemas";

export type Scenario = "ontrack" | "behind" | "ahead";

export type FocusKey =
  | "rest"
  | "recovery"
  | "base"
  | "longrun"
  | "speed"
  | "se"
  | "tempo"
  | "taper"
  | "race";

const FOCUS_KEY_MAP: Record<string, FocusKey> = {
  Rest: "rest",
  Recovery: "recovery",
  Base: "base",
  "Long Run": "longrun",
  Speed: "speed",
  "Speed Endurance": "se",
  SE: "se",
  Tempo: "tempo",
  "Pre-Race Shakeout": "taper",
  "Race Day": "race",
};

export function focusKeyOf(focusArea: string): FocusKey {
  return FOCUS_KEY_MAP[focusArea] ?? "rest";
}

export interface ProgressDay {
  dateStr: string;
  dayOfWeek: string;
  focusArea: string;
  sessionSummary: string;
  plannedKm: number;
  actualKm: number;
  done: boolean;
  skipped: boolean;
  isPast: boolean;
  isToday: boolean;
}

export interface ProgressWeek {
  weekNumber: number;
  blockNumber: number;
  isTaper: boolean;
  isDeload: boolean;
  isPeak: boolean;
  plannedKm: number;
  actualKm: number | null;
  days: ProgressDay[];
}

export interface ProgressView {
  planMeta: {
    raceDate: string;
    raceDistance: string;
    totalWeeks: number;
  };
  today: string;
  nowWeek: number;
  scenario: Scenario;
  weeks: ProgressWeek[];
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function findNowWeek(plan: StoredPlan, today: string): number {
  for (const wk of plan.weeks) {
    const last = wk.days[wk.days.length - 1]?.dateStr;
    if (last && today <= last) return wk.weekNumber;
  }
  return plan.planMeta.totalWeeks;
}

function computeScenario(weeks: ProgressWeek[], nowWeek: number): Scenario {
  const past = weeks.filter((w) => w.weekNumber < nowWeek);
  const planned = past.reduce((s, w) => s + w.plannedKm, 0);
  const actual = past.reduce((s, w) => s + (w.actualKm ?? 0), 0);
  if (planned <= 0) return "ontrack";
  const ratio = actual / planned;
  if (ratio >= 1.02) return "ahead";
  if (ratio >= 0.9) return "ontrack";
  return "behind";
}

export function buildProgressView(
  plan: StoredPlan,
  completions: Completions,
  now: Date = new Date(),
): ProgressView {
  const today = now.toISOString().slice(0, 10);
  const nowWeek = findNowWeek(plan, today);

  // Identify peak week (max planned mileage among non-taper weeks).
  const nonTaperMax = Math.max(
    0,
    ...plan.weeks.filter((w) => !w.isTaper).map((w) => w.totalMileage),
  );

  const weeks: ProgressWeek[] = plan.weeks.map((wk) => {
    const days: ProgressDay[] = wk.days.map((d) => {
      const isPast = d.dateStr < today;
      const isToday = d.dateStr === today;
      const isRest = d.focusArea === "Rest";
      const done = !isRest && !!completions.completed[d.dateStr];
      const skipped = isPast && !isRest && !done;
      const actualKm = done ? d.totalDistance : 0;
      return {
        dateStr: d.dateStr,
        dayOfWeek: d.dayOfWeek,
        focusArea: d.focusArea,
        sessionSummary: d.sessionSummary || d.focusArea,
        plannedKm: d.totalDistance,
        actualKm,
        done,
        skipped,
        isPast,
        isToday,
      };
    });

    const anyPastOrDone = days.some((d) => d.isPast || d.done);
    const actualKm = anyPastOrDone
      ? Math.round(days.reduce((s, d) => s + d.actualKm, 0) * 10) / 10
      : null;

    const isPeak = !wk.isTaper && wk.totalMileage === nonTaperMax && nonTaperMax > 0;
    const prev = plan.weeks.find((p) => p.weekNumber === wk.weekNumber - 1);
    const isDeload =
      !wk.isTaper && !!prev && wk.totalMileage < prev.totalMileage * 0.85;

    return {
      weekNumber: wk.weekNumber,
      blockNumber: wk.blockNumber,
      isTaper: wk.isTaper,
      isDeload,
      isPeak,
      plannedKm: wk.totalMileage,
      actualKm,
      days,
    };
  });

  const scenario = computeScenario(weeks, nowWeek);

  return {
    planMeta: {
      raceDate: plan.planMeta.raceDate,
      raceDistance: plan.planMeta.raceDistance,
      totalWeeks: plan.planMeta.totalWeeks,
    },
    today,
    nowWeek,
    scenario,
    weeks,
  };
}

export const FOCUS_COLORS: Record<FocusKey, string> = {
  rest: "#8a9c80",
  recovery: "#4a9a8a",
  base: "#3a8a4a",
  longrun: "#3a6a8a",
  speed: "#c44040",
  se: "#7a5aaa",
  tempo: "#c47a20",
  taper: "#6a5aaa",
  race: "#b8960a",
};

export function todayOverride(): string {
  return todayIso();
}
