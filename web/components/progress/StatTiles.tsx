import type { ProgressView } from "@/lib/progress/buildProgressView";
import styles from "./StatTiles.module.scss";

function accentClass(completion: number): string {
  if (completion >= 85) return "success";
  if (completion >= 70) return "warning";
  return "danger";
}

export function StatTiles({ view }: { view: ProgressView }) {
  const allDays = view.weeks.flatMap((w) => w.days);
  const done = allDays.filter((d) => d.done);
  const skipped = allDays.filter((d) => d.skipped);
  const totalPast = done.length + skipped.length;
  const completion =
    totalPast > 0 ? Math.round((done.length / totalPast) * 100) : 0;

  const pastWeeks = view.weeks.filter((w) => w.weekNumber < view.nowWeek);
  const plannedTotal = pastWeeks.reduce((s, w) => s + w.plannedKm, 0);
  const actualTotal = pastWeeks.reduce((s, w) => s + (w.actualKm ?? 0), 0);

  const currentWk = view.weeks.find((w) => w.weekNumber === view.nowWeek);
  const currentPlanned = currentWk?.plannedKm ?? 0;
  const currentActual = currentWk?.actualKm ?? 0;

  const past = allDays.filter(
    (d) => d.dateStr <= view.today && d.focusArea !== "Rest",
  );
  let streak = 0;
  for (let i = past.length - 1; i >= 0; i--) {
    if (past[i].done) streak++;
    else break;
  }

  return (
    <div className={styles.grid}>
      <Tile
        label="Completion"
        value={completion}
        unit="%"
        sub={`${done.length} done · ${skipped.length} skipped`}
        accent={accentClass(completion)}
      />
      <Tile
        label="This week"
        value={Math.round(currentActual)}
        unit={`/ ${currentPlanned} km`}
        sub={
          currentPlanned > 0
            ? `${Math.round((currentActual / currentPlanned) * 100)}% of plan`
            : ""
        }
      />
      <Tile
        label="Build so far"
        value={Math.round(actualTotal)}
        unit={`/ ${Math.round(plannedTotal)} km`}
        sub={`${pastWeeks.length} weeks logged`}
      />
      <Tile
        label="Streak"
        value={streak}
        unit="sessions"
        sub={streak >= 3 ? "Keep it rolling" : "Back on the horse"}
      />
    </div>
  );
}

function Tile({
  label,
  value,
  unit,
  sub,
  accent,
}: {
  label: string;
  value: number;
  unit?: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className={styles.tile}>
      <div className={styles.label}>{label}</div>
      <div
        className={`${styles.value} ${accent ? styles[accent] : ""}`}
      >
        {value}
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      {sub && <div className={styles.sub}>{sub}</div>}
    </div>
  );
}
