import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const saveCalls: unknown[][] = [];
const saveCompletionsCalls: unknown[][] = [];

vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/storage/plans", () => ({
  savePlan: vi.fn(async (...args: unknown[]) => {
    saveCalls.push(args);
  }),
}));

vi.mock("@/lib/storage/completions", () => ({
  saveCompletions: vi.fn(async (...args: unknown[]) => {
    saveCompletionsCalls.push(args);
  }),
}));

import { importLegacyPlanAction } from "./migrate";

function validPlan(dateStrs: string[]) {
  const days = dateStrs.map((d, i) => ({
    dayCount: i + 1,
    date: d,
    dayOfWeek: "Monday",
    dateStr: d,
    weekDay: 1,
    focusArea: "Base",
    sessionSummary: "Easy",
    sessionDescription: "",
    totalDistance: 5,
    warmUp: 0,
    warmDown: 0,
    recoveries: "",
    block: "",
    stimulus: "",
    reps: [],
    paces: "",
    weekNumber: 1,
    blockNumber: 1,
    weeklyMileage: 20,
    isTaper: false,
    sessionsCount: 4,
  }));
  return {
    planMeta: {
      raceDate: "2026-06-01",
      totalDays: days.length,
      totalWeeks: 1,
      planBlockCount: 1,
      planBlockLength: 8,
      blocks: [{ blockWeeks: 8, sessionWeeks: 6 }],
      taperStartDayIndex: 0,
      slackDays: 0,
      startingDistance: 40,
      targetDistance: 80,
      style: "Endurance" as const,
      raceDistance: "Marathon",
      startPaceIndex: 8,
      generatedAt: "2026-04-20T00:00:00.000Z",
    },
    days,
    weeks: [],
  };
}

describe("importLegacyPlanAction", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    saveCalls.length = 0;
    saveCompletionsCalls.length = 0;
  });

  it("throws when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(
      importLegacyPlanAction(validPlan(["2026-05-01"]), {}),
    ).rejects.toThrow(/Unauthorized/);
  });

  it("rejects a payload that isn't a plan", async () => {
    mockAuth.mockResolvedValue({ user: { athleteId: "u1" } });
    const r = await importLegacyPlanAction({ notAPlan: true }, {});
    expect(r.ok).toBe(false);
  });

  it("imports a valid plan with no completions", async () => {
    mockAuth.mockResolvedValue({ user: { athleteId: "u1" } });
    const r = await importLegacyPlanAction(validPlan(["2026-05-01"]), {});
    expect(r.ok).toBe(true);
    expect(saveCalls).toHaveLength(1);
    expect(saveCompletionsCalls).toHaveLength(0);
  });

  it("rekeys day-index completions to dateStr", async () => {
    mockAuth.mockResolvedValue({ user: { athleteId: "u1" } });
    const plan = validPlan(["2026-05-01", "2026-05-02", "2026-05-03"]);
    const legacyCompletions = {
      "0": "2026-05-01T12:00:00.000Z",
      "2": "2026-05-03T12:00:00.000Z",
    };
    const r = await importLegacyPlanAction(plan, legacyCompletions);
    expect(r.ok).toBe(true);
    expect(saveCompletionsCalls).toHaveLength(1);
    const [, saved] = saveCompletionsCalls[0] as [
      string,
      { completed: Record<string, string> },
    ];
    expect(Object.keys(saved.completed).sort()).toEqual([
      "2026-05-01",
      "2026-05-03",
    ]);
  });

  it("ignores out-of-range indices", async () => {
    mockAuth.mockResolvedValue({ user: { athleteId: "u1" } });
    const r = await importLegacyPlanAction(validPlan(["2026-05-01"]), {
      "99": "t",
    });
    expect(r.ok).toBe(true);
    expect(saveCompletionsCalls).toHaveLength(0);
  });
});
