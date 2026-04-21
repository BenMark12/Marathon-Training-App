import { beforeEach, describe, expect, it, vi } from "vitest";

const blobStore = new Map<string, unknown>();
const sentEmails: { to: string; subject: string }[] = [];

vi.mock("@/lib/storage/blob", () => ({
  getJson: vi.fn(
    async (pathname: string, schema: { parse: (v: unknown) => unknown }) => {
      const raw = blobStore.get(pathname);
      if (raw === undefined) return null;
      return schema.parse(raw);
    },
  ),
  putJson: vi.fn(async (pathname: string, value: unknown) => {
    blobStore.set(pathname, value);
  }),
  deleteByKey: vi.fn(async (pathname: string) => {
    blobStore.delete(pathname);
  }),
  listUnderPrefix: vi.fn(async (prefix: string) => {
    return [...blobStore.keys()].filter((k) => k.startsWith(prefix));
  }),
}));

vi.mock("./resend", () => ({
  sendEmail: vi.fn(async (input: { to: string; subject: string }) => {
    sentEmails.push({ to: input.to, subject: input.subject });
    return { id: `fake-${sentEmails.length}` };
  }),
}));

import { sendWeeklyEmailsForAllUsers } from "./sendWeeklyEmails";
import type { StoredPlan, UserPreferences, PlanIndex } from "@/lib/storage/schemas";
import {
  planIndexKey,
  planKey,
  preferencesKey,
} from "@/lib/storage/keys";

function weekDays(weekNumber: number, start: Date) {
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start.getTime() + i * 86_400_000);
    const dateStr = d.toISOString().slice(0, 10);
    return {
      dayCount: i,
      date: d,
      dayOfWeek: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ][d.getUTCDay()],
      dateStr,
      weekDay: d.getUTCDay(),
      focusArea: "Base",
      sessionSummary: "Easy",
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
    };
  });
}

function makePlan(planId: string, raceDate: string): StoredPlan {
  const days = weekDays(1, new Date("2026-04-20T00:00:00Z"));
  return {
    planId,
    planMeta: {
      raceDate,
      totalDays: 7,
      totalWeeks: 1,
      planBlockCount: 1,
      planBlockLength: 1,
      blocks: [{ blockWeeks: 1, sessionWeeks: 1 }],
      taperStartDayIndex: 0,
      slackDays: 0,
      startingDistance: 40,
      targetDistance: 50,
      style: "Endurance",
      raceDistance: "Marathon",
      startPaceIndex: 8,
      generatedAt: "2026-04-01T00:00:00.000Z",
    },
    days,
    weeks: [
      {
        weekNumber: 1,
        days,
        totalMileage: 40,
        blockNumber: 1,
        isTaper: false,
      },
    ],
  };
}

function seedUser(
  userId: string,
  prefs: UserPreferences,
  plan: StoredPlan | null,
) {
  blobStore.set(preferencesKey(userId), prefs);
  if (plan) {
    blobStore.set(planKey(userId, plan.planId), plan);
    const index: PlanIndex = {
      plans: [
        {
          planId: plan.planId,
          raceDate: plan.planMeta.raceDate,
          raceDistance: plan.planMeta.raceDistance,
          totalWeeks: plan.planMeta.totalWeeks,
          generatedAt: plan.planMeta.generatedAt,
        },
      ],
    };
    blobStore.set(planIndexKey(userId), index);
  }
}

describe("sendWeeklyEmailsForAllUsers", () => {
  beforeEach(() => {
    blobStore.clear();
    sentEmails.length = 0;
  });

  it("sends only to opted-in users with an email and an active plan", async () => {
    seedUser(
      "u1",
      {
        email: "a@example.com",
        weeklyEmailOptIn: true,
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
      makePlan("p1", "2026-06-07"),
    );
    seedUser(
      "u2",
      {
        email: "b@example.com",
        weeklyEmailOptIn: false,
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
      makePlan("p2", "2026-06-07"),
    );
    seedUser(
      "u3",
      {
        weeklyEmailOptIn: true,
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
      makePlan("p3", "2026-06-07"),
    );
    seedUser(
      "u4",
      {
        email: "d@example.com",
        weeklyEmailOptIn: true,
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
      null,
    );

    const summary = await sendWeeklyEmailsForAllUsers(
      new Date("2026-04-19T18:00:00Z"),
    );

    expect(sentEmails).toEqual([
      expect.objectContaining({ to: "a@example.com" }),
    ]);
    expect(summary.sent).toBe(1);
    expect(summary.skipped).toBe(3);
    expect(summary.failed).toBe(0);
  });

  it("skips plans whose race has already happened", async () => {
    seedUser(
      "u1",
      {
        email: "a@example.com",
        weeklyEmailOptIn: true,
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
      makePlan("p1", "2025-01-01"),
    );
    const summary = await sendWeeklyEmailsForAllUsers(
      new Date("2026-04-19T18:00:00Z"),
    );
    expect(sentEmails).toHaveLength(0);
    expect(summary.skipped).toBe(1);
    expect(summary.sent).toBe(0);
  });
});
