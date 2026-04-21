import type { ProgressView as ProgressViewData } from "@/lib/progress/buildProgressView";
import { BlockTimeline } from "./BlockTimeline";
import { FocusDonut } from "./FocusDonut";
import { NextKeySession } from "./NextKeySession";
import { Section } from "./Section";
import { SessionGrid } from "./SessionGrid";
import { StatTiles } from "./StatTiles";
import { StatusBanner } from "./StatusBanner";
import { StatusRing } from "./StatusRing";
import { WeeklyMileageChart } from "./WeeklyMileageChart";
import styles from "./ProgressView.module.scss";

function fmtRaceDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function ProgressView({
  view,
  planId,
}: {
  view: ProgressViewData;
  planId: string;
}) {
  const currentWk = view.weeks.find((w) => w.weekNumber === view.nowWeek);
  const blockLabel = currentWk?.isTaper
    ? "Taper"
    : `Block ${currentWk?.blockNumber ?? 1}`;

  return (
    <div className={styles.stack}>
      <div className={styles.heroCard}>
        <StatusRing view={view} />
        <div className={styles.heroBody}>
          <div>
            <div className={styles.kicker}>Currently in</div>
            <div className={styles.heroTitle}>
              {blockLabel}
              <span className={styles.heroWeek}>· Wk {view.nowWeek}</span>
            </div>
          </div>
          <BlockTimeline view={view} />
        </div>
      </div>

      <StatusBanner view={view} />

      <StatTiles view={view} />

      <Section
        title="Weekly mileage — planned vs actual"
        accessory={<span className={styles.unitTag}>km</span>}
      >
        <WeeklyMileageChart view={view} />
      </Section>

      <Section
        title="Session log"
        accessory={
          <span className={styles.unitTag}>{view.weeks.length} wks</span>
        }
      >
        <SessionGrid view={view} />
      </Section>

      <Section title="Training mix">
        <FocusDonut view={view} />
      </Section>

      <Section title="Up next">
        <NextKeySession view={view} planId={planId} />
      </Section>

      <div className={styles.foot}>
        {view.planMeta.raceDistance} · {fmtRaceDate(view.planMeta.raceDate)}
      </div>
    </div>
  );
}
