import type { ProgressView } from "@/lib/progress/buildProgressView";
import styles from "./StatusRing.module.scss";

function diffDays(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / 86_400_000);
}

export function StatusRing({ view }: { view: ProgressView }) {
  const start = new Date(view.weeks[0].days[0].dateStr);
  const race = new Date(view.planMeta.raceDate);
  const today = new Date(view.today);

  const totalDays = view.weeks.length * 7;
  const elapsed = Math.max(0, diffDays(today, start));
  const daysToRace = Math.max(0, diffDays(race, today));
  const pct = Math.min(1, Math.max(0, elapsed / totalDays));

  const r = 74;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);

  const statusClass =
    view.scenario === "behind"
      ? styles.behind
      : view.scenario === "ahead"
        ? styles.ahead
        : styles.ontrack;

  return (
    <div className={styles.ring}>
      <svg width="172" height="172" viewBox="0 0 172 172" className={styles.svg}>
        <circle cx="86" cy="86" r={r} className={styles.track} />
        <circle
          cx="86"
          cy="86"
          r={r}
          className={`${styles.progress} ${statusClass}`}
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className={styles.label}>
        <span className={styles.kicker}>Race in</span>
        <span className={styles.value}>{daysToRace}</span>
        <span className={styles.kicker}>days</span>
      </div>
    </div>
  );
}
