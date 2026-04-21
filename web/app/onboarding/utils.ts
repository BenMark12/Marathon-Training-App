export type Experience = "never" | "some" | "lots";

export type RecentDist = "1mile" | "5k" | "10k" | "half" | "long";

export type RecentRun = {
  dist: RecentDist;
  mm: number;
  ss: number;
};

export type GoalChoice =
  | { type: "finish" }
  | { type: "sub4" }
  | { type: "sub330" }
  | { type: "sub3" }
  | { type: "custom"; hh: number; mm: number };

export type OnboardingAnswers = {
  experience?: Experience;
  motivation?: string;
  race?: { name: string; emoji: string };
  raceDate?: string;
  volume?: number;
  recent?: RecentRun;
  goal?: GoalChoice;
  days?: 3 | 4 | 5;
};

const DIST_KM: Record<RecentDist, number> = {
  "1mile": 1.609,
  "5k": 5,
  "10k": 10,
  half: 21.097,
  long: 16,
};

export function recentToMarathonSeconds(r: RecentRun): number | null {
  const totalSec = r.mm * 60 + r.ss;
  if (!totalSec) return null;
  return totalSec * Math.pow(42.195 / DIST_KM[r.dist], 1.06);
}

export function formatHMS(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round(totalSec % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatHoursRough(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.round((totalSec % 3600) / 60);
  return m === 60 ? `${h + 1}h` : m ? `${h}h ${m}m` : `${h}h`;
}

export function goalToTargetSeconds(goal: GoalChoice, currentSec: number): number {
  const preset = {
    finish: currentSec,
    sub4: 3 * 3600 + 59 * 60,
    sub330: 3 * 3600 + 29 * 60,
    sub3: 2 * 3600 + 59 * 60,
  } as const;
  if (goal.type === "custom") return goal.hh * 3600 + goal.mm * 60;
  const target = preset[goal.type];
  // Cap ambition: target cannot be faster than 75% of current (too aggressive otherwise).
  const floor = currentSec * 0.75;
  return Math.max(target, floor);
}

export function weeksUntil(raceDate: string, now = new Date()): number {
  const race = new Date(`${raceDate}T00:00:00`);
  const ms = race.getTime() - now.getTime();
  return Math.max(0, Math.round(ms / (7 * 86_400_000)));
}

export function estimateTargetVolume(
  currentVolume: number,
  days: 3 | 4 | 5,
): number {
  const mult = { 3: 1.4, 4: 1.6, 5: 1.8 }[days];
  return Math.min(120, Math.round(currentVolume * mult));
}

export const RACE_OPTIONS = [
  { name: "London Marathon", emoji: "🇬🇧" },
  { name: "Berlin Marathon", emoji: "🇩🇪" },
  { name: "New York Marathon", emoji: "🗽" },
  { name: "My own race", emoji: "🏁" },
];

export const MOTIVATION_OPTIONS = [
  { id: "bucket", label: "Bucket list", emoji: "✨" },
  { id: "charity", label: "For a cause", emoji: "💚" },
  { id: "friend", label: "A friend is doing it", emoji: "🤝" },
  { id: "pb", label: "Chase a time", emoji: "⚡" },
  { id: "health", label: "Get fitter", emoji: "🌱" },
  { id: "other", label: "Something else", emoji: "🌀" },
];
