import {
  FOCUS_COLORS,
  focusKeyOf,
  type FocusKey,
  type ProgressView,
} from "@/lib/progress/buildProgressView";
import styles from "./FocusDonut.module.scss";

const FOCUS_LABELS: Partial<Record<FocusKey, string>> = {
  longrun: "Long Run",
  se: "Speed End.",
  recovery: "Recovery",
  base: "Base",
  speed: "Speed",
  tempo: "Tempo",
  taper: "Taper",
  race: "Race",
};

function tally(view: ProgressView) {
  const counts: Partial<Record<FocusKey, number>> = {};
  let total = 0;
  for (const wk of view.weeks) {
    for (const d of wk.days) {
      if (d.done && d.actualKm > 0) {
        const key = focusKeyOf(d.focusArea);
        counts[key] = (counts[key] ?? 0) + d.actualKm;
        total += d.actualKm;
      }
    }
  }
  return { counts, total };
}

export function FocusDonut({ view }: { view: ProgressView }) {
  const { counts, total } = tally(view);
  const entries = (Object.entries(counts) as [FocusKey, number][]).sort(
    (a, b) => b[1] - a[1],
  );

  const r = 54;
  const c = 2 * Math.PI * r;

  if (total === 0) {
    return (
      <div className={styles.empty}>
        <p>No completed sessions yet.</p>
        <p className={styles.emptySub}>
          Mark sessions done or connect Strava to see your training mix.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.chart}>
        <svg width="132" height="132" viewBox="0 0 132 132" className={styles.svg}>
          <circle cx="66" cy="66" r={r} className={styles.track} />
          {entries.map(([key, km], i) => {
            const priorKm = entries.slice(0, i).reduce((s, [, v]) => s + v, 0);
            const offset = c * (priorKm / total);
            const dash = c * (km / total);
            return (
              <circle
                key={key}
                cx="66"
                cy="66"
                r={r}
                fill="none"
                stroke={FOCUS_COLORS[key]}
                strokeWidth="18"
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
              />
            );
          })}
        </svg>
        <div className={styles.center}>
          <div className={styles.total}>{Math.round(total)}</div>
          <div className={styles.unit}>km logged</div>
        </div>
      </div>
      <div className={styles.list}>
        {entries.map(([key, km]) => (
          <div key={key} className={styles.row}>
            <span
              className={styles.dot}
              style={{ background: FOCUS_COLORS[key] }}
            />
            <span className={styles.rowLabel}>
              {FOCUS_LABELS[key] ?? key}
            </span>
            <span className={styles.rowValue}>
              {Math.round(km)}
              <span className={styles.rowUnit}>km</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
