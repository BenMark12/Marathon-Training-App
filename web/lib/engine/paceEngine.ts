import type {
  Config,
  FocusArea,
  PaceData,
  PaceRow,
  PaceStyle,
  PaceTables,
} from "./types";
import { DEFAULT_TUNING, type TuningParams } from "./tuning";

export function paceStrToSeconds(str: string): number {
  if (!str) return 0;
  const parts = str.split(":");
  if (parts.length === 3) {
    return (
      parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2])
    );
  }
  return 0;
}

export function secondsToMinKm(secs: number): string {
  if (!secs || secs <= 0) return "--:--";
  const mins = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${mins}:${s.toString().padStart(2, "0")}`;
}

export function secondsToHMS(secs: number): string {
  if (!secs || secs <= 0) return "0:00:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.round(secs % 60);
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function findPaceIndex(
  config: Config,
  raceDistance: string,
  currentPace: string,
): { paceIndex: number; headerValue: string } {
  const { convertedTable, paceColumns } = config;
  const currentPaceSecs = paceStrToSeconds(currentPace);

  const row = convertedTable.rows.find((r) => r.distance === raceDistance);
  if (!row) return { paceIndex: 8, headerValue: "03:40:00" };

  for (let i = 0; i < paceColumns.length; i++) {
    const colKey = paceColumns[i];
    const colVal = (row[colKey] as number) || 0;
    if (currentPaceSecs < colVal) {
      return { paceIndex: i + 1, headerValue: colKey };
    }
  }

  return { paceIndex: 13, headerValue: "04:30:00" };
}

export function calculatePaceUplift(
  headerValue: string,
  targetPace: string,
  maxDayCount: number,
  tuning: TuningParams = DEFAULT_TUNING,
): number {
  const headerSecs = paceStrToSeconds(headerValue);
  const targetSecs = paceStrToSeconds(targetPace);
  const diffSecs = headerSecs - targetSecs;

  const increments = Math.round(diffSecs / tuning.paceUpliftSeconds);

  if (increments <= 0) return maxDayCount;
  if (increments >= tuning.paceIndexMax) return Math.floor(maxDayCount / 12);

  return Math.floor(maxDayCount / increments);
}

export function getPaceTableNames(
  config: Config,
  paceIndex: number,
  style: PaceStyle,
): { speed: string | null; se: string | null; tempo: string | null } {
  const summary = config.paceSummary.rows;
  let idx = paceIndex;
  if (idx < 1 || idx > summary.length) {
    idx = Math.max(1, Math.min(13, idx));
  }
  const row = summary[idx - 1];
  if (!row) return { speed: null, se: null, tempo: null };

  const speedCol = style === "Endurance" ? "Speed_Endurance" : "Speed_Speedster";
  const seCol = style === "Endurance" ? "SE_Endurance" : "SE_Speedster";

  return {
    speed: (row[speedCol] as string | null) || null,
    se: (row[seCol] as string | null) || null,
    tempo: (row["Tempo"] as string | null) || null,
  };
}

export function loadPaceTable(
  paceTables: PaceTables,
  tableName: string,
): PaceRow[] | null {
  const table = paceTables[tableName];
  if (!table) return null;

  return table.map((row) => ({
    label: row.label,
    upper: row.Upper || 0,
    lower: row.Lower || 0,
    upperDif: row.UppeDif || 0,
    lowerDif: row.LowerDif || 0,
  }));
}

export function buildPaceGuidance(
  focusArea: FocusArea | string,
  description: string,
  paceData: PaceData,
  dayIndex: number,
  daysUntilPaceUplift: number,
): string {
  if (!paceData || !description) return "";

  const { speedPaces, sePaces, tempoPaces } = paceData;
  const ii = daysUntilPaceUplift > 0 ? dayIndex % daysUntilPaceUplift : 0;

  const fmt = (secs: number): string => secondsToMinKm(secs);

  function paceAtDay(
    upper: number,
    upperDif: number,
    lower: number,
    lowerDif: number,
  ): string {
    const u = upper - (upperDif * ii) / (daysUntilPaceUplift || 1);
    const l = lower ? lower - (lowerDif * ii) / (daysUntilPaceUplift || 1) : 0;
    if (l > 0) return `${fmt(u)} to ${fmt(l)}`;
    return fmt(u);
  }

  const lines: string[] = [];
  const desc = description || "";

  if (focusArea === "Speed" && speedPaces) {
    const distMap = [
      { pattern: /\b100\b/, label: "100's", idx: 0 },
      { pattern: /\b200\b/, label: "200's", idx: 1 },
      { pattern: /\b300\b/, label: "300's", idx: 2 },
      { pattern: /\b400\b/, label: "400's", idx: 3 },
      { pattern: /\b500\b/, label: "500's", idx: 4 },
      { pattern: /\b600\b/, label: "600's", idx: 5 },
    ];
    for (const d of distMap) {
      if (d.pattern.test(desc) && speedPaces[d.idx]) {
        const p = speedPaces[d.idx];
        lines.push(
          `${d.label} @ ${paceAtDay(p.upper, p.upperDif, p.lower, p.lowerDif)} min/km`,
        );
      }
    }
  } else if ((focusArea === "Speed Endurance" || focusArea === "SE") && sePaces) {
    const distMap = [
      { pattern: /\b600\b/, label: "600's", idx: 0 },
      { pattern: /\b800\b/, label: "800's", idx: 1 },
      { pattern: /\b1000\b/, label: "1000's", idx: 2 },
      { pattern: /\b1200\b/, label: "1200's", idx: 3 },
      { pattern: /\b1600\b/, label: "1600's", idx: 4 },
    ];
    for (const d of distMap) {
      if (d.pattern.test(desc) && sePaces[d.idx]) {
        const p = sePaces[d.idx];
        lines.push(
          `${d.label} @ ${paceAtDay(p.upper, p.upperDif, p.lower, p.lowerDif)} min/km`,
        );
      }
    }
  } else if (focusArea === "Tempo" && tempoPaces) {
    const distMap = [
      { pattern: /\b1000\b/, label: "1000's", seIdx: 0 },
      { pattern: /\b2000\b/, label: "2000's", seIdx: 1 },
      { pattern: /\b3000\b/, label: "3000's", seIdx: 2 },
      { pattern: /\b4000\b/, label: "4000's", seIdx: 3 },
      { pattern: /\b5000\b/, label: "5000's", seIdx: 4 },
    ];
    if (sePaces) {
      for (const d of distMap) {
        if (d.pattern.test(desc) && sePaces[d.seIdx]) {
          const p = sePaces[d.seIdx];
          lines.push(
            `${d.label} @ ${paceAtDay(p.upper, p.upperDif, p.lower, p.lowerDif)} min/km`,
          );
        }
      }
    }
  } else if (focusArea === "Base" && tempoPaces && tempoPaces.length > 5) {
    const p = tempoPaces[5];
    if (p)
      lines.push(
        `Easy Running @ ${paceAtDay(p.upper, p.upperDif, p.lower, p.lowerDif)} min/km`,
      );
  } else if (focusArea === "Recovery" && tempoPaces && tempoPaces.length > 3) {
    const p = tempoPaces[3];
    if (p)
      lines.push(
        `Recovery Jog @ ${paceAtDay(p.upper, p.upperDif, p.lower, p.lowerDif)} min/km`,
      );
  } else if (focusArea === "Long Run" && tempoPaces) {
    if (tempoPaces[4]) {
      const lr = tempoPaces[4];
      lines.push(
        `Start steady @ ${paceAtDay(lr.upper, lr.upperDif, lr.lower, lr.lowerDif)} min/km`,
      );
    }
    if (tempoPaces[6]) {
      const ss = tempoPaces[6];
      lines.push(
        `Build to @ ${paceAtDay(ss.upper, ss.upperDif, ss.lower, ss.lowerDif)} min/km`,
      );
    }
    if (tempoPaces[7]) {
      const tr = tempoPaces[7];
      lines.push(
        `Finish strong @ ${paceAtDay(tr.upper, tr.upperDif, tr.lower, tr.lowerDif)} min/km`,
      );
    }
  }

  return lines.join("\n");
}
