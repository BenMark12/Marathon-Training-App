import type { ProgressView } from "@/lib/progress/buildProgressView";
import styles from "./WeeklyMileageChart.module.scss";

const CHART_HEIGHT = 140;

export function WeeklyMileageChart({ view }: { view: ProgressView }) {
  const maxKm = Math.max(
    0,
    ...view.weeks.map((w) => Math.max(w.plannedKm, w.actualKm ?? 0)),
  );
  const scale = (km: number) => (maxKm > 0 ? (km / maxKm) * CHART_HEIGHT : 0);

  return (
    <div className={styles.wrap}>
      <div className={styles.plot} style={{ height: CHART_HEIGHT + 32 }}>
        {[0.25, 0.5, 0.75, 1].map((t, i) => (
          <div
            key={i}
            className={`${styles.gridline} ${i === 3 ? styles.axis : ""}`}
            style={{ top: CHART_HEIGHT - CHART_HEIGHT * t }}
          >
            <span className={styles.axisLabel}>
              {Math.round(maxKm * t)}
            </span>
          </div>
        ))}

        <div className={styles.bars}>
          {view.weeks.map((wk) => {
            const plannedH = scale(wk.plannedKm);
            const actualH = wk.actualKm != null ? scale(wk.actualKm) : 0;
            const isCurrent = wk.weekNumber === view.nowWeek;
            const isFuture = wk.weekNumber > view.nowWeek;

            return (
              <div key={wk.weekNumber} className={styles.col}>
                <div
                  className={`${styles.planned} ${isFuture ? styles.plannedFuture : styles.plannedHatched} ${wk.isPeak ? styles.peak : ""}`}
                  style={{ height: plannedH }}
                  title={`Wk ${wk.weekNumber} · planned ${Math.round(wk.plannedKm)}km`}
                />
                {wk.actualKm != null && wk.actualKm > 0 && (
                  <div
                    className={`${styles.actual} ${wk.isTaper ? styles.taper : ""} ${isCurrent ? styles.current : ""}`}
                    style={{ height: actualH }}
                    title={`Wk ${wk.weekNumber} · actual ${Math.round(wk.actualKm)}km`}
                  />
                )}
                <div
                  className={`${styles.weekLabel} ${isCurrent ? styles.weekLabelCurrent : ""}`}
                >
                  {wk.weekNumber}
                </div>
                {isCurrent && <div className={styles.marker} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchActual}`} /> Actual
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchHatched}`} /> Planned
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchDot}`} /> This week
        </span>
      </div>
    </div>
  );
}
