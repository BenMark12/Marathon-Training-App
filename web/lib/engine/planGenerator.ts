import { createDateScaffold } from "./dateScaffold";
import { optimizeBlocks } from "./blockOptimizer";
import { progressWeeklyMileageByBlocks } from "./mileageProgression";
import { calculateDistances } from "./distanceAllocation";
import {
  getSessionTableName,
  getFinalSessionTableName,
  selectSession,
} from "./sessionSelector";
import { getDayAssignment, getWarmUpDown } from "./weeklySchedule";
import { isTaperDay, getTaperSession } from "./taperProtocol";
import {
  findPaceIndex,
  calculatePaceUplift,
  getPaceTableNames,
  loadPaceTable,
  buildPaceGuidance,
} from "./paceEngine";
import type {
  DataStore,
  FocusArea,
  GeneratePlanInput,
  GeneratedPlan,
  PaceRow,
  PlanDay,
  PlanWeek,
} from "./types";
import { DEFAULT_TUNING, type TuningParams } from "./tuning";

function adjustSessionsCount(
  sessionsPerWeek: number,
  startingDistance: number,
  tuning: TuningParams,
): number {
  let sc = Math.max(tuning.sessionsMin, sessionsPerWeek);
  if (startingDistance < tuning.sessionsLowMileageThreshold) sc = tuning.sessionsMin;
  if (startingDistance > tuning.sessionsHighMileageThreshold) sc = tuning.sessionsMax;
  if ((sc === 3 || sc === 4) && startingDistance > tuning.sessionsBumpMileageThreshold) sc = 4;
  if (sc === tuning.sessionsMax && startingDistance < tuning.sessionsBumpMileageThreshold) sc = 4;
  return sc;
}

function clampSessionCount(
  sc: number,
  totalWeeklyMileage: number,
  tuning: TuningParams,
): number {
  if (totalWeeklyMileage > tuning.sessionsClampHighPeakMileage) return tuning.sessionsMax;
  if (sc >= tuning.sessionsMax && totalWeeklyMileage < tuning.sessionsClampDownMileage) return 4;
  if ((sc === 3 || sc === 4) && totalWeeklyMileage > tuning.sessionsClampUpMileage) return 4;
  return Math.min(tuning.sessionsMax, Math.max(tuning.sessionsMin, sc));
}

export function generateTrainingPlan(
  input: GeneratePlanInput,
  dataStore: DataStore,
  tuning: TuningParams = DEFAULT_TUNING,
): GeneratedPlan {
  const {
    raceDate,
    sessionsPerWeek,
    currentMileage,
    targetMileage,
    raceDistance = "Marathon",
    currentPace,
    targetPace,
    style = "Endurance",
  } = input;

  const { sessionTemplates, paceTables, config } = dataStore;

  const today = new Date();
  const scaffold = createDateScaffold(today, new Date(raceDate));
  const maxDayCount = scaffold.length;

  if (maxDayCount < tuning.minTrainingDays) {
    throw new Error(
      `Race date too close. Need at least ${Math.ceil(tuning.minTrainingDays / 7)} weeks.`,
    );
  }

  const blockInfo = optimizeBlocks(maxDayCount, tuning);
  const { blocks, planBlockCount, taperStartDayIndex, planBlockLength } =
    blockInfo;

  const startingDistance = currentMileage;
  const targetTotalDistance = targetMileage;

  const weeklyMileageData = progressWeeklyMileageByBlocks(
    startingDistance,
    targetTotalDistance,
    blocks,
    tuning,
  );

  const { paceIndex: startPaceIndex, headerValue } = findPaceIndex(
    config,
    raceDistance,
    currentPace,
  );
  const daysUntilPaceUplift = calculatePaceUplift(
    headerValue,
    targetPace,
    maxDayCount,
    tuning,
  );

  let currentPaceIndex = startPaceIndex;
  let speedPaces: PaceRow[] | null;
  let sePaces: PaceRow[] | null;
  let tempoPaces: PaceRow[] | null;

  const initialNames = getPaceTableNames(config, currentPaceIndex, style);
  speedPaces = initialNames.speed ? loadPaceTable(paceTables, initialNames.speed) : null;
  sePaces = initialNames.se ? loadPaceTable(paceTables, initialNames.se) : null;
  tempoPaces = initialNames.tempo ? loadPaceTable(paceTables, initialNames.tempo) : null;

  function refreshPaces(): void {
    const names = getPaceTableNames(config, currentPaceIndex, style);
    speedPaces = names.speed ? loadPaceTable(paceTables, names.speed) : null;
    sePaces = names.se ? loadPaceTable(paceTables, names.se) : null;
    tempoPaces = names.tempo ? loadPaceTable(paceTables, names.tempo) : null;
  }

  const days: PlanDay[] = [];

  let globalDayIndex = 0;
  let globalWeekIndex = 0;
  let paceDay = 0;
  let sessionsCount = adjustSessionsCount(sessionsPerWeek, startingDistance, tuning);

  let totalWeeklyMileage = startingDistance;

  function processDay(
    blockCount1: number,
    weekInBlock: number,
    blockWeeks: number,
    weekMileage: number,
  ): void {
    const dayData = scaffold[globalDayIndex];
    if (!dayData) return;

    paceDay++;
    if (daysUntilPaceUplift > 0 && paceDay >= daysUntilPaceUplift) {
      currentPaceIndex = Math.max(1, currentPaceIndex - 1);
      refreshPaces();
      paceDay = 0;
    }

    if (isTaperDay(globalDayIndex + 1, maxDayCount, tuning)) {
      const prevFocus =
        globalDayIndex > 0 && days[globalDayIndex - 1]
          ? days[globalDayIndex - 1].focusArea
          : "";
      const taperSess = getTaperSession(
        globalDayIndex + 1,
        maxDayCount,
        prevFocus,
      );

      if (taperSess) {
        if (taperSess.useFinalSelection && sessionTemplates && taperSess.sessionType) {
          const tbl = getFinalSessionTableName(taperSess.sessionType);
          const selected = selectSession(
            sessionTemplates,
            tbl,
            taperSess.intensityMileage ?? 0,
          );
          if (selected) {
            taperSess.sessionSummary = selected.summary;
            taperSess.sessionDescription = selected.description;
            taperSess.totalDistance = selected.totalDistance;
            taperSess.recoveries = selected.recoveries;
            taperSess.block = selected.block;
            taperSess.stimulus = selected.stimulus;
            taperSess.reps = selected.reps;
          }
        }

        const paces = buildPaceGuidance(
          taperSess.focusArea,
          taperSess.sessionDescription,
          { speedPaces, sePaces, tempoPaces },
          paceDay,
          daysUntilPaceUplift,
        );

        days.push({
          ...dayData,
          focusArea: taperSess.focusArea,
          sessionSummary: taperSess.sessionSummary,
          sessionDescription: taperSess.sessionDescription,
          totalDistance: taperSess.totalDistance,
          warmUp: taperSess.warmUp || 0,
          warmDown: taperSess.warmDown || 0,
          recoveries: taperSess.recoveries || "",
          block: taperSess.block || "",
          stimulus: taperSess.stimulus || "",
          reps: taperSess.reps || [],
          paces,
          weekNumber: Math.ceil((globalDayIndex + 1) / 7),
          blockNumber: blockCount1,
          weeklyMileage: Math.round(weekMileage),
          isTaper: true,
          isRest: taperSess.focusArea === "Rest",
          sessionsCount,
        });
        return;
      }
    }

    const distances = calculateDistances(weekMileage, sessionsCount, tuning);
    const assignment = getDayAssignment(dayData.dayOfWeek, {
      sessionsCount,
      blockCount: blockCount1,
      planBlockCount,
      distances,
    });

    let focusArea: FocusArea = assignment.focusArea;
    let sessionSummary = "";
    let sessionDescription = "";
    let totalDistance = 0;
    let warmUp = 0;
    let warmDown = 0;
    let recoveries = "";
    let block = "";
    let stimulus = "";
    let reps: number[] = [];
    let sessionDistance: number | undefined;
    let isRest = false;
    const debug: Record<string, number> = {};

    if (assignment.needsSessionSelection && sessionTemplates && assignment.sessionType) {
      const tableName = getSessionTableName(
        assignment.sessionType,
        weekInBlock,
        blockWeeks,
      );
      const selected = selectSession(
        sessionTemplates,
        tableName,
        distances.intensityMileage,
      );

      if (selected) {
        focusArea = assignment.focusArea;
        sessionSummary = selected.summary;
        sessionDescription = selected.description;
        totalDistance = selected.totalDistance;
        warmUp = selected.warmUp;
        warmDown = selected.warmDown;
        recoveries = selected.recoveries;
        block = selected.block;
        stimulus = selected.stimulus;
        reps = selected.reps || [];
        sessionDistance = selected.sessionDistance;
      } else {
        focusArea = assignment.focusArea;
        sessionSummary = "Training Session";
        sessionDescription = `${assignment.focusArea} training`;
        totalDistance = Math.round(distances.intensityMileage / 1000);
        reps = [];
      }
    } else {
      focusArea = assignment.focusArea;
      sessionSummary = assignment.sessionSummary ?? "";
      sessionDescription = assignment.sessionDescription ?? "";
      totalDistance = assignment.totalDistance ?? 0;
      warmUp = assignment.warmUp || 0;
      warmDown = assignment.warmDown || 0;
      recoveries = assignment.recoveries || "";
      isRest = assignment.isRest || false;

      if (!isRest && totalDistance > 0) {
        const wud = getWarmUpDown(totalDistance);
        warmUp = wud.warmUp;
        warmDown = wud.warmDown;
      }
    }

    const paces = buildPaceGuidance(
      focusArea,
      sessionDescription,
      { speedPaces, sePaces, tempoPaces },
      paceDay,
      daysUntilPaceUplift,
    );

    debug.blockCount = blockCount1;
    debug.weekInBlock = weekInBlock;
    debug.blockWeeks = blockWeeks;
    debug.sessionsCount = sessionsCount;
    debug.totalWeeklyMileage = Math.round(weekMileage);
    debug.intensityMileage = distances.intensityMileage;
    debug.baseMileage = distances.baseMileage;
    debug.longRunMileage = distances.longRunMileage;
    debug.paceIndex = currentPaceIndex;

    days.push({
      ...dayData,
      focusArea,
      sessionSummary,
      sessionDescription,
      totalDistance,
      warmUp,
      warmDown,
      recoveries,
      block,
      stimulus,
      reps,
      paces,
      weekNumber: Math.ceil((globalDayIndex + 1) / 7),
      blockNumber: blockCount1,
      weeklyMileage: Math.round(weekMileage),
      isTaper: false,
      isRest,
      sessionsCount,
      sessionDistance,
      _debug: debug,
    });
  }

  for (let bi = 0; bi < blocks.length && globalDayIndex < maxDayCount; bi++) {
    const block = blocks[bi];
    const blockCount = bi + 1;

    for (let sw = 0; sw < block.sessionWeeks && globalDayIndex < maxDayCount; sw++) {
      const weekInBlock = sw + 1;
      const wData = weeklyMileageData[globalWeekIndex];
      totalWeeklyMileage = wData ? wData.weekMileage : startingDistance;

      sessionsCount = clampSessionCount(sessionsCount, totalWeeklyMileage, tuning);

      for (let d = 0; d < 7 && globalDayIndex < maxDayCount; d++) {
        processDay(blockCount, weekInBlock, block.blockWeeks, totalWeeklyMileage);
        globalDayIndex++;
      }
      globalWeekIndex++;
    }

    for (let dw = 0; dw < block.deloadWeeks && globalDayIndex < maxDayCount; dw++) {
      const weekInBlock = block.sessionWeeks + dw + 1;
      const wData = weeklyMileageData[globalWeekIndex];
      totalWeeklyMileage = wData ? wData.weekMileage : startingDistance;

      sessionsCount = clampSessionCount(sessionsCount, totalWeeklyMileage, tuning);

      for (let d = 0; d < 7 && globalDayIndex < maxDayCount; d++) {
        processDay(blockCount, weekInBlock, block.blockWeeks, totalWeeklyMileage);
        globalDayIndex++;
      }
      globalWeekIndex++;
    }
  }

  while (globalDayIndex < maxDayCount) {
    const blockCount = blocks.length;
    processDay(blockCount, 0, planBlockLength, totalWeeklyMileage);
    globalDayIndex++;
  }

  const weeks: PlanWeek[] = [];
  let currentWeek: PlanWeek | null = null;

  for (const day of days) {
    const wn = day.weekNumber;
    if (!currentWeek || currentWeek.weekNumber !== wn) {
      if (currentWeek) weeks.push(currentWeek);
      currentWeek = {
        weekNumber: wn,
        days: [],
        totalMileage: 0,
        blockNumber: day.blockNumber,
        isTaper: false,
      };
    }
    currentWeek.days.push(day);
    currentWeek.totalMileage += day.totalDistance || 0;
    if (day.isTaper) currentWeek.isTaper = true;
  }
  if (currentWeek) weeks.push(currentWeek);

  weeks.forEach((w) => {
    w.totalMileage = Math.round(w.totalMileage * 10) / 10;
  });

  const planMeta = {
    raceDate: input.raceDate,
    totalDays: maxDayCount,
    totalWeeks: weeks.length,
    planBlockCount,
    planBlockLength,
    blocks: blocks.map((b) => ({
      blockWeeks: b.blockWeeks,
      sessionWeeks: b.sessionWeeks,
    })),
    taperStartDayIndex,
    slackDays: blockInfo.slackDays,
    startingDistance,
    targetDistance: targetTotalDistance,
    style,
    raceDistance,
    startPaceIndex,
    generatedAt: new Date().toISOString(),
  };

  return { planMeta, days, weeks };
}
