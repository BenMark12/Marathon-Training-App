import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivitiesList } from "@/components/activities/ActivitiesList";
import { PlanTabs } from "@/components/plan/PlanTabs";
import { requireUserId } from "@/lib/auth/session";
import { getPlan } from "@/lib/storage/plans";
import { getStravaTokens } from "@/lib/storage/strava";
import {
  fetchRunActivitiesSince,
  type StravaActivity,
} from "@/lib/strava/client";
import styles from "./page.module.scss";

type Props = { params: Promise<{ id: string }> };

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function PlanActivitiesPage({ params }: Props) {
  const { id } = await params;
  const userId = await requireUserId();

  const [plan, tokens] = await Promise.all([
    getPlan(userId, id),
    getStravaTokens(userId),
  ]);

  if (!plan) notFound();

  const connected = !!tokens;
  const planStart = plan.days[0]?.dateStr;

  let activities: StravaActivity[] = [];
  let error: string | null = null;
  if (connected && planStart) {
    try {
      activities = await fetchRunActivitiesSince(userId, planStart);
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load activities.";
    }
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.kicker}>
          {plan.planMeta.raceDistance} · {fmtDate(plan.planMeta.raceDate)}
        </div>
        <h1 className={styles.title}>Activities</h1>
      </header>

      <PlanTabs planId={id} active="activities" />

      {!connected ? (
        <div className={styles.notice}>
          <p>Connect Strava to see your runs here.</p>
          <Link href="/" className={styles.link}>
            Go to dashboard →
          </Link>
        </div>
      ) : error ? (
        <div className={styles.notice}>
          <p>{error}</p>
        </div>
      ) : (
        <ActivitiesList activities={activities} />
      )}
    </>
  );
}
