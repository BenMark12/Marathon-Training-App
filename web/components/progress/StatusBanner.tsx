import type { ProgressView } from "@/lib/progress/buildProgressView";
import styles from "./StatusBanner.module.scss";

const MESSAGES = {
  ontrack: {
    title: "On track",
    sub: "Mileage and key sessions are landing.",
  },
  behind: {
    title: "A little behind",
    sub: "You've missed a few sessions — no panic.",
  },
  ahead: {
    title: "Ahead of plan",
    sub: "Strong block. Watch for overreach.",
  },
} as const;

export function StatusBanner({ view }: { view: ProgressView }) {
  const m = MESSAGES[view.scenario];
  return (
    <div className={`${styles.banner} ${styles[view.scenario]}`}>
      <div className={styles.body}>
        <div className={styles.title}>{m.title}</div>
        <div className={styles.sub}>{m.sub}</div>
      </div>
    </div>
  );
}
