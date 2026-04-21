import { describe, expect, it } from "vitest";
import type { Completions, StoredPlan } from "@/lib/storage/schemas";
import { buildProgressView, focusKeyOf } from "./buildProgressView";

function day(
  dateStr: string,
  dayOfWeek: string,
  focusArea: string,
  totalDistance: number,
  weekNumber: number,
  blockNumber: number,
  isTaper = false,
) {
  return {
    dayCount: 0,
    date: new Date(dateStr),
    dayOfWeek,
    dateStr,
    weekDay: 0,
    focusArea,
    sessionSummary: `${focusArea} session`,
    sessionDescription: "",
    totalDistance,
    warmUp: 0,
    warmDown: 0,
    recoveries: "",
    block: "",
    stimulus: "",
    reps: [],
    paces: "",
    weekNumber,
    blockNumber,
    weeklyMileage: 0,
    isTaper,
    sessionsCount: 0,
  };
}

function mkWeek(weekNumber: number, days: ReturnType<typeof day>[], isTaper = false) {
  return {
    weekNumber,
    days,
    totalMileage: days.reduce((s, d) => s + d.totalDistance, 0),
    blockNumber: days[0]?.blockNumber ?? 1,
    isTaper,
  };
}

function mkPlan(): StoredPlan {
  const wk1 = mkWeek(1, [
    day("2026-01-05", "Monday", "Rest", 0, 1, 1),
    day("2026-01-06", "Tuesday", "Speed", 8, 1, 1),
    day("2026-01-07", "Wednesday", "Base", 6, 1, 1),
    day("2026-01-08", "Thursday", "Tempo", 10, 1, 1),
    day("2026-01-09", "Friday", "Rest", 0, 1, 1),
    day("2026-01-10", "Saturday", "Recovery", 6, 1, 1),
    day("2026-01-11", "Sunday", "Long Run", 20, 1, 1),
  ]);
  const wk2 = mkWeek(2, [
    day("2026-01-12", "Monday", "Rest", 0, 2, 1),
    day("2026-01-13", "Tuesday", "Speed", 8, 2, 1),
    day("2026-01-14", "Wednesday", "Base", 6, 2, 1),
    day("2026-01-15", "Thursday", "Tempo", 10, 2, 1),
    day("2026-01-16", "Friday", "Rest", 0, 2, 1),
    day("2026-01-17", "Saturday", "Recovery", 6, 2, 1),
    day("2026-01-18", "Sunday", "Long Run", 22, 2, 1),
  ]);
  return {
    planId: "p1",
    planMeta: {
      raceDate: "2026-01-18",
      totalDays: 14,
      totalWeeks: 2,
      planBlockCount: 1,
      planBlockLength: 14,
      blocks: [{ blockWeeks: 2, sessionWeeks: 2 }],
      taperStartDayIndex: 14,
      slackDays: 0,
      startingDistance: 40,
      targetDistance: 60,
      style: "Endurance",
      raceDistance: "Marathon",
      startPaceIndex: 0,
      generatedAt: "2026-01-01T00:00:00Z",
    },
    days: [...wk1.days, ...wk2.days],
    weeks: [wk1, wk2],
  };
}

describe("buildProgressView", () => {
  it("marks a completed day as done, not skipped", () => {
    const plan = mkPlan();
    const completions: Completions = {
      planId: "p1",
      completed: { "2026-01-06": "2026-01-06T10:00:00Z" },
    };
    const view = buildProgressView(plan, completions, new Date("2026-01-09"));
    const tues = view.weeks[0].days.find((d) => d.dateStr === "2026-01-06")!;
    expect(tues.done).toBe(true);
    expect(tues.skipped).toBe(false);
    expect(tues.actualKm).toBe(8);
  });

  it("marks a past non-rest day that is not complete as skipped", () => {
    const plan = mkPlan();
    const view = buildProgressView(plan, { planId: "p1", completed: {} }, new Date("2026-01-09"));
    const tues = view.weeks[0].days.find((d) => d.dateStr === "2026-01-06")!;
    expect(tues.skipped).toBe(true);
    expect(tues.done).toBe(false);
  });

  it("never marks a rest day as skipped", () => {
    const plan = mkPlan();
    const view = buildProgressView(plan, { planId: "p1", completed: {} }, new Date("2026-01-13"));
    const restDays = view.weeks
      .flatMap((w) => w.days)
      .filter((d) => d.focusArea === "Rest");
    expect(restDays.every((d) => !d.skipped && !d.done)).toBe(true);
  });

  it("computes ontrack/behind/ahead from past-week actual vs planned ratio", () => {
    const plan = mkPlan();

    const onPlan: Completions = {
      planId: "p1",
      completed: Object.fromEntries(
        plan.weeks[0].days
          .filter((d) => d.focusArea !== "Rest")
          .map((d) => [d.dateStr, "t"]),
      ),
    };
    expect(
      buildProgressView(plan, onPlan, new Date("2026-01-13")).scenario,
    ).toBe("ontrack");

    const behind: Completions = {
      planId: "p1",
      completed: {
        "2026-01-07": "t", // 6km
      },
    };
    expect(
      buildProgressView(plan, behind, new Date("2026-01-13")).scenario,
    ).toBe("behind");
  });

  it("finds the current week by comparing today to each week's last day", () => {
    const plan = mkPlan();
    const v1 = buildProgressView(
      plan,
      { planId: "p1", completed: {} },
      new Date("2026-01-08"),
    );
    expect(v1.nowWeek).toBe(1);
    const v2 = buildProgressView(
      plan,
      { planId: "p1", completed: {} },
      new Date("2026-01-14"),
    );
    expect(v2.nowWeek).toBe(2);
  });

  it("focusKeyOf maps the engine's focus-area strings to style keys", () => {
    expect(focusKeyOf("Long Run")).toBe("longrun");
    expect(focusKeyOf("Speed Endurance")).toBe("se");
    expect(focusKeyOf("Pre-Race Shakeout")).toBe("taper");
    expect(focusKeyOf("Unknown thing")).toBe("rest");
  });
});
