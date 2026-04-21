import { describe, expect, it } from "vitest";
import type { z } from "zod";
import type { StoredPlanSchema } from "@/lib/storage/schemas";
import { buildWeeklyEmail, findUpcomingWeek } from "./weeklyPlan";

type StoredPlan = z.infer<typeof StoredPlanSchema>;

function day(dateStr: string, weekNumber: number, overrides: Partial<StoredPlan["days"][number]> = {}) {
  const d = new Date(dateStr);
  const days: Record<number, string> = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
    0: "Sunday",
  };
  return {
    dayCount: 1,
    date: d,
    dayOfWeek: days[d.getUTCDay()],
    dateStr,
    weekDay: d.getUTCDay(),
    focusArea: "Base",
    sessionSummary: "Easy run",
    sessionDescription: "",
    totalDistance: 8,
    warmUp: 0,
    warmDown: 0,
    recoveries: "N/A",
    block: "",
    stimulus: "",
    reps: [],
    paces: "",
    weekNumber,
    blockNumber: 1,
    weeklyMileage: 40,
    isTaper: false,
    sessionsCount: 4,
    ...overrides,
  };
}

function fakePlan(): StoredPlan {
  // Week 1: Mon 2026-04-13 → Sun 2026-04-19
  // Week 2: Mon 2026-04-20 → Sun 2026-04-26
  const week1Dates = [
    "2026-04-13",
    "2026-04-14",
    "2026-04-15",
    "2026-04-16",
    "2026-04-17",
    "2026-04-18",
    "2026-04-19",
  ];
  const week2Dates = [
    "2026-04-20",
    "2026-04-21",
    "2026-04-22",
    "2026-04-23",
    "2026-04-24",
    "2026-04-25",
    "2026-04-26",
  ];
  const days1 = week1Dates.map((d) => day(d, 1));
  const days2 = week2Dates.map((d) => day(d, 2));

  return {
    planId: "plan-1",
    planMeta: {
      raceDate: "2026-06-07",
      totalDays: 140,
      totalWeeks: 20,
      planBlockCount: 2,
      planBlockLength: 10,
      blocks: [{ blockWeeks: 10, sessionWeeks: 8 }],
      taperStartDayIndex: 123,
      slackDays: 7,
      startingDistance: 40,
      targetDistance: 80,
      style: "Endurance",
      raceDistance: "Marathon",
      startPaceIndex: 8,
      generatedAt: "2026-04-01T00:00:00.000Z",
    },
    days: [...days1, ...days2],
    weeks: [
      {
        weekNumber: 1,
        days: days1,
        totalMileage: 40,
        blockNumber: 1,
        isTaper: false,
      },
      {
        weekNumber: 2,
        days: days2,
        totalMileage: 44,
        blockNumber: 1,
        isTaper: false,
      },
    ],
  };
}

describe("findUpcomingWeek", () => {
  it("picks the week starting the day after the reference (Sunday-evening case)", () => {
    const plan = fakePlan();
    const sundayEvening = new Date("2026-04-19T18:00:00Z");
    const week = findUpcomingWeek(plan, sundayEvening);
    expect(week?.weekNumber).toBe(2);
  });

  it("falls back to the week containing the reference date", () => {
    const plan = fakePlan();
    const midweek = new Date("2026-04-15T10:00:00Z");
    const week = findUpcomingWeek(plan, midweek);
    expect(week?.weekNumber).toBe(1);
  });

  it("returns null for a plan with no weeks", () => {
    const plan = { ...fakePlan(), weeks: [] };
    expect(findUpcomingWeek(plan, new Date())).toBeNull();
  });
});

describe("buildWeeklyEmail", () => {
  it("produces subject, html and text that reference the week number and mileage", () => {
    const plan = fakePlan();
    const week = plan.weeks[1];
    const email = buildWeeklyEmail({
      plan,
      week,
      ref: new Date("2026-04-19T18:00:00Z"),
      planUrl: "https://example.com/plans/plan-1",
    });

    expect(email.subject).toContain("Week 2");
    expect(email.subject).toContain("44 km");

    expect(email.html).toContain("Week 2");
    expect(email.html).toContain("44 km total");
    expect(email.html).toContain("https://example.com/plans/plan-1");

    expect(email.text).toContain("Week 2");
    expect(email.text).toContain("Open plan: https://example.com/plans/plan-1");
  });

  it("marks taper weeks in the subject", () => {
    const plan = fakePlan();
    const week = { ...plan.weeks[1], isTaper: true };
    const email = buildWeeklyEmail({ plan, week, ref: new Date("2026-04-19") });
    expect(email.subject).toContain("taper");
    expect(email.html).toContain("taper");
  });

  it("escapes HTML in session text", () => {
    const plan = fakePlan();
    const week = {
      ...plan.weeks[1],
      days: plan.weeks[1].days.map((d, i) =>
        i === 0 ? { ...d, sessionSummary: "<script>x</script>" } : d,
      ),
    };
    const email = buildWeeklyEmail({ plan, week, ref: new Date("2026-04-19") });
    expect(email.html).not.toContain("<script>x</script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});
