import Link from "next/link";
import styles from "./PlanTabs.module.scss";

export type PlanTab = "plan" | "progress" | "activities";

export function PlanTabs({ planId, active }: { planId: string; active: PlanTab }) {
  return (
    <nav className={styles.tabs} aria-label="Plan sections">
      <Link
        href={`/plans/${planId}`}
        className={`${styles.tab} ${active === "plan" ? styles.active : ""}`}
        aria-current={active === "plan" ? "page" : undefined}
      >
        Plan
      </Link>
      <Link
        href={`/plans/${planId}/progress`}
        className={`${styles.tab} ${active === "progress" ? styles.active : ""}`}
        aria-current={active === "progress" ? "page" : undefined}
      >
        Progress
      </Link>
      <Link
        href={`/plans/${planId}/activities`}
        className={`${styles.tab} ${active === "activities" ? styles.active : ""}`}
        aria-current={active === "activities" ? "page" : undefined}
      >
        Activities
      </Link>
    </nav>
  );
}
