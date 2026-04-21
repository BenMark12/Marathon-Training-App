/**
 * Tuning knobs extracted from planGenerator / mileageProgression / blockOptimizer
 * / distanceAllocation / taperProtocol / paceEngine. Defaults MUST match the
 * values that were previously hard-coded — existing tests pin this behaviour.
 */

export interface TuningParams {
  minTrainingDays: number;

  longRunFraction: number;
  longRunCapKm: number;
  intensityFraction: number;

  sessionsMin: number;
  sessionsMax: number;
  sessionsLowMileageThreshold: number;
  sessionsHighMileageThreshold: number;
  sessionsBumpMileageThreshold: number;
  sessionsClampHighPeakMileage: number;
  sessionsClampDownMileage: number;
  sessionsClampUpMileage: number;

  weeklyGrowthCap: number;
  perWeekGrowthCeiling: number;
  deload1Factor: number;
  deload2Factor: number;
  peakWeeksPerBlock: number;

  blockSizes: readonly number[];
  sessionWeeksByBlockSize: Readonly<Record<number, number>>;
  deloadWeeks: number;
  taperDays: number;

  slackTargetMin: number;
  slackTargetMax: number;
  pyramidalBonus: number;
  uniformBonus: number;
  blockCountBonus: Readonly<Record<number, number>>;

  paceUpliftSeconds: number;
  paceIndexMax: number;
}

export const DEFAULT_TUNING: TuningParams = {
  minTrainingDays: 56,

  longRunFraction: 0.4,
  longRunCapKm: 38,
  intensityFraction: 0.2,

  sessionsMin: 3,
  sessionsMax: 5,
  sessionsLowMileageThreshold: 40,
  sessionsHighMileageThreshold: 90,
  sessionsBumpMileageThreshold: 50,
  sessionsClampHighPeakMileage: 90,
  sessionsClampDownMileage: 60,
  sessionsClampUpMileage: 60,

  weeklyGrowthCap: 0.1,
  perWeekGrowthCeiling: 1.1,
  deload1Factor: 0.8,
  deload2Factor: 0.7,
  peakWeeksPerBlock: 2,

  blockSizes: [8, 10, 12],
  sessionWeeksByBlockSize: { 8: 6, 10: 8, 12: 10 },
  deloadWeeks: 2,
  taperDays: 17,

  slackTargetMin: 5,
  slackTargetMax: 10,
  pyramidalBonus: 40,
  uniformBonus: 15,
  blockCountBonus: { 1: 15, 2: 30, 3: 50, 4: 25, 5: 10 },

  paceUpliftSeconds: 600,
  paceIndexMax: 13,
};

export function mergeTuning(partial?: Partial<TuningParams>): TuningParams {
  if (!partial) return DEFAULT_TUNING;
  return { ...DEFAULT_TUNING, ...partial };
}
