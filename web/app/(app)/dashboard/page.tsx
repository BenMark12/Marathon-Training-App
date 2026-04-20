import Link from "next/link";
import { auth } from "@/auth";
import { MigrationBanner } from "@/components/shell/MigrationBanner";
import { requireUserId } from "@/lib/auth/session";
import { listPlans } from "@/lib/storage/plans";
import styles from "./page.module.scss";

function daysUntil(iso: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = await requireUserId();
  const plans = await listPlans(userId);

  const sorted = [...plans].sort((a, b) => a.raceDate.localeCompare(b.raceDate));
  const upcoming = sorted.find((p) => daysUntil(p.raceDate) >= 0);

  return (
    <>
      <header className={styles.header}>
        <h1>Dashboard</h1>
        <span>
          {session?.user?.name ?? "Athlete"} · {plans.length} plan
          {plans.length === 1 ? "" : "s"}
        </span>
      </header>

      <MigrationBanner />

      {upcoming ? (
        <dl className={styles.countdown}>
          <dt>Race in</dt>
          <dd>{daysUntil(upcoming.raceDate)}</dd>
          <small>
            {upcoming.raceDistance} · {fmtDate(upcoming.raceDate)}
          </small>
        </dl>
      ) : (
        <div className={styles.empty}>
          <h2>No races on the horizon</h2>
          <p>Start by building a plan from your next race date.</p>
          <Link href="/plans/new" className={styles.cta}>
            Create a plan
          </Link>
        </div>
      )}

      {sorted.length > 0 && (
        <>
          <div className={styles.sectionTitle}>All plans</div>
          <ul className={styles.planList}>
            {sorted.map((p) => (
              <li key={p.planId}>
                <Link href={`/plans/${p.planId}`} className={styles.planCard}>
                  <div>
                    <p className={styles.cardTitle}>
                      {p.raceDistance} — {fmtDate(p.raceDate)}
                    </p>
                    <p className={styles.cardMeta}>
                      {p.totalWeeks} weeks · generated {fmtDate(p.generatedAt)}
                    </p>
                  </div>
                  <span className={styles.cardCount}>
                    {Math.max(0, daysUntil(p.raceDate))}
                    <small>days</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <Link href="/plans/new" className={styles.cta}>
            + New plan
          </Link>
        </>
      )}
    </>
  );
}
