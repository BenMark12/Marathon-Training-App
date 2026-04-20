import { notFound } from "next/navigation";
import { PlanActionsMenu } from "@/components/plan/PlanActionsMenu";
import { PlanTabs } from "@/components/plan/PlanTabs";
import { ProgressView } from "@/components/progress/ProgressView";
import { requireUserId } from "@/lib/auth/session";
import { buildProgressView } from "@/lib/progress/buildProgressView";
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

export default async function PlanProgressPage({ params }: Props) {
  const { id } = await params;
  const userId = await requireUserId();

  const [plan, completions, tokens] = await Promise.all([
    getPlan(userId, id),
    getCompletions(userId, id),
    getStravaTokens(userId),
  ]);

  if (!plan) notFound();

  const view = buildProgressView(plan, completions);
  const stravaConnected = !!tokens;

  return (
    <>
      <header className={styles.header}>
        <div className={styles.kicker}>
          {plan.planMeta.raceDistance} · {fmtDate(plan.planMeta.raceDate)}
        </div>
        <h1 className={styles.title}>Your progress</h1>
      </header>

      <div className={styles.tabsRow}>
        <PlanTabs planId={id} active="progress" />
        <PlanActionsMenu
          planId={id}
          planLabel={`${plan.planMeta.raceDistance} — ${fmtDate(plan.planMeta.raceDate)}`}
          weeks={plan.weeks}
          completions={completions.completed}
          stravaConnected={stravaConnected}
          redirectTo="/dashboard"
        />
      </div>

      <ProgressView view={view} planId={id} />
    </>
  );
}
