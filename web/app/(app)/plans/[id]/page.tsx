import { notFound } from "next/navigation";
import { PlanActionsMenu } from "@/components/plan/PlanActionsMenu";
import { PlanGrid } from "@/components/plan/PlanGrid";
import { PlanTabs } from "@/components/plan/PlanTabs";
import { requireUserId } from "@/lib/auth/session";
import { getCompletions } from "@/lib/storage/completions";
import { getPlan } from "@/lib/storage/plans";
import { getStravaTokens } from "@/lib/storage/strava";
import styles from "./page.module.scss";

type Props = { params: Promise<{ id: string }> };

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function PlanPage({ params }: Props) {
  const { id } = await params;
  const userId = await requireUserId();

  const [plan, completions, tokens] = await Promise.all([
    getPlan(userId, id),
    getCompletions(userId, id),
    getStravaTokens(userId),
  ]);

  if (!plan) notFound();

  const { planMeta, weeks } = plan;
  const stravaConnected = !!tokens;

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.topLine}>
          <h1 className={styles.title}>{planMeta.raceDistance}</h1>
          <span className={styles.raceDate}>{fmtDate(planMeta.raceDate)}</span>
        </div>

        <dl className={styles.meta}>
          <div className={styles.metaTile}>
            <dt>Weeks</dt>
            <dd>{planMeta.totalWeeks}</dd>
          </div>
          <div className={styles.metaTile}>
            <dt>Blocks</dt>
            <dd>{planMeta.planBlockCount}</dd>
          </div>
          <div className={styles.metaTile}>
            <dt>Start</dt>
            <dd>
              {planMeta.startingDistance}
              <small style={{ fontWeight: 400, color: "var(--c-text-dim)" }}>
                {" "}
                km/w
              </small>
            </dd>
          </div>
          <div className={styles.metaTile}>
            <dt>Target</dt>
            <dd>
              {planMeta.targetDistance}
              <small style={{ fontWeight: 400, color: "var(--c-text-dim)" }}>
                {" "}
                km/w
              </small>
            </dd>
          </div>
        </dl>
      </section>

      <div className={styles.tabsRow}>
        <PlanTabs planId={id} active="plan" />
        <PlanActionsMenu
          planId={id}
          planLabel={`${planMeta.raceDistance} — ${fmtDate(planMeta.raceDate)}`}
          weeks={weeks}
          completions={completions.completed}
          stravaConnected={stravaConnected}
          redirectTo="/dashboard"
        />
      </div>

      <div className={styles.sectionTitle}>Schedule</div>
      <PlanGrid weeks={weeks} planId={id} completions={completions.completed} />
    </>
  );
}
