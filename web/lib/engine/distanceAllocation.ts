import type { DistanceAllocation } from "./types";
import { DEFAULT_TUNING, type TuningParams } from "./tuning";

export function calculateDistances(
  totalWeeklyKm: number,
  sessionsCount: number = 3,
  tuning: TuningParams = DEFAULT_TUNING,
): DistanceAllocation {
  const total = Math.max(0, totalWeeklyKm);

  const longRunKm = Math.round(
    Math.min(tuning.longRunCapKm, total * tuning.longRunFraction),
  );
  const intensityWeeklyKm = Math.round(total * tuning.intensityFraction);
  const baseWeeklyKm = Math.round(total - longRunKm - intensityWeeklyKm);

  const intensityPerSessionMeters = Math.round((intensityWeeklyKm * 1000) / 2);

  let baseRunCount = 1;
  if (sessionsCount >= 4) baseRunCount = 2;
  if (sessionsCount >= 5) baseRunCount = 3;

  const basePerRunKm =
    baseRunCount > 0 ? Math.max(1, Math.round(baseWeeklyKm / baseRunCount)) : 0;

  return {
    longRunKm,
    intensityWeeklyKm,
    baseWeeklyKm,
    intensityPerSessionMeters,
    basePerRunKm,
    longRunMileage: longRunKm,
    intensityMileage: intensityPerSessionMeters,
    baseMileage: basePerRunKm,
    wednesdayBaseMileage: sessionsCount >= 5 ? basePerRunKm : 0,
  };
}
