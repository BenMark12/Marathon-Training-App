import { FOCUS_COLORS, focusKeyOf } from "@/lib/progress/buildProgressView";
import type { ProgressDay, ProgressView } from "@/lib/progress/buildProgressView";
import styles from "./SessionGrid.module.scss";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function cellStyle(d: ProgressDay, isCurrentWeek: boolean, isFuture: boolean) {
  const key = focusKeyOf(d.focusArea);
  const color = FOCUS_COLORS[key];

  if (d.focusArea === "Rest") {
    return {
      background: "var(--c-bg-surface)",
      border: "1px solid var(--c-border)",
    };
  }
  if (d.done) {
    return { background: color, border: "none" };
  }
  if (d.skipped) {
    return {
      background: "transparent",
      border: `1.5px dashed ${color}`,
    };
  }
  if (isFuture || (isCurrentWeek && !d.isPast)) {
    return {
      background: "transparent",
      border: `1px solid ${color}`,
    };
  }
  return {
    background: "var(--c-bg-surface)",
    border: "1px solid var(--c-border)",
  };
}

export function SessionGrid({ view }: { view: ProgressView }) {
  return (
    <>
      <div className={styles.grid}>
        <div className={styles.dayCol}>
          {DAY_LABELS.map((d, i) => (
            <div key={i} className={styles.dayLabel}>
              {d}
            </div>
          ))}
        </div>
        <div className={styles.weeks}>
          {view.weeks.map((wk) => {
            const isCurrentWeek = wk.weekNumber === view.nowWeek;
            const isFuture = wk.weekNumber > view.nowWeek;
            return (
              <div key={wk.weekNumber} className={styles.weekCol}>
                {wk.days.map((d) => {
                  const s = cellStyle(d, isCurrentWeek, isFuture);
                  const tipActual = d.done
                    ? ` · ${d.actualKm}km done`
                    : d.skipped
                      ? " · skipped"
                      : "";
                  return (
                    <div
                      key={d.dateStr}
                      className={`${styles.cell} ${d.isToday ? styles.today : ""}`}
                      style={s}
                      title={`${d.dateStr} · ${d.sessionSummary}${tipActual}`}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchDone}`} /> Done
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchSkipped}`} /> Skipped
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchUpcoming}`} /> Upcoming
        </span>
      </div>
    </>
  );
}
