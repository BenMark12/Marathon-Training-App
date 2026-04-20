"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { importLegacyPlanAction } from "@/app/actions/migrate";
import {
  clearLegacyStorage,
  readLegacyPayloads,
  type LegacyPayload,
} from "@/lib/migrate/legacy";
import styles from "./page.module.scss";

type RowState = "pending" | "ok" | "fail";
type Row = { payload: LegacyPayload; state: RowState; error?: string };

function describe(payload: LegacyPayload): string {
  const plan = payload.plan as { planMeta?: { raceDate?: string; raceDistance?: string } };
  const raceDate = plan.planMeta?.raceDate ?? payload.entry.raceDate ?? "unknown date";
  const raceDistance =
    plan.planMeta?.raceDistance ?? payload.entry.distance ?? "Marathon";
  return `${raceDistance} — ${raceDate}`;
}

export default function MigratePage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Read localStorage once on mount; SSR doesn't have access.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRows(
      readLegacyPayloads().map((p) => ({ payload: p, state: "pending" as RowState })),
    );
  }, []);

  function runMigration() {
    if (!rows || rows.length === 0) return;
    startTransition(async () => {
      const next: Row[] = [];
      let allOk = true;
      for (const row of rows) {
        const result = await importLegacyPlanAction(
          row.payload.plan,
          row.payload.completions,
        );
        if (result.ok) {
          next.push({ ...row, state: "ok" });
        } else {
          allOk = false;
          next.push({ ...row, state: "fail", error: result.error });
        }
      }
      setRows(next);
      if (allOk) {
        clearLegacyStorage();
        setDone(true);
      }
    });
  }

  if (rows === null) {
    return (
      <>
        <header className={styles.header}>
          <h1>Migrate plans</h1>
          <p>Checking this browser for plans from the old app…</p>
        </header>
      </>
    );
  }

  if (rows.length === 0) {
    return (
      <>
        <header className={styles.header}>
          <h1>Migrate plans</h1>
        </header>
        <div className={styles.empty}>
          <h2>Nothing to migrate</h2>
          <p>This browser has no legacy plans to import.</p>
          <Link href="/dashboard" className={styles.secondary}>
            Back to dashboard
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <header className={styles.header}>
        <h1>Migrate plans</h1>
        <p>
          Flow found {rows.length} plan{rows.length === 1 ? "" : "s"} in this
          browser. Import them into your account to keep them in sync across
          devices. Legacy storage is cleared once all imports succeed.
        </p>
      </header>

      <div className={styles.panel}>
        <ul className={styles.list}>
          {rows.map((row, i) => (
            <li key={i} className={styles.row}>
              <span>{describe(row.payload)}</span>
              <span className={`${styles.state} ${styles[row.state]}`}>
                {row.state === "pending"
                  ? "Waiting"
                  : row.state === "ok"
                    ? "Imported"
                    : row.error ?? "Failed"}
              </span>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          {done ? (
            <button
              type="button"
              className={styles.cta}
              onClick={() => router.push("/dashboard")}
            >
              Go to dashboard
            </button>
          ) : (
            <>
              <button
                type="button"
                className={styles.cta}
                onClick={runMigration}
                disabled={pending}
              >
                {pending ? "Importing…" : "Import now"}
              </button>
              <Link href="/dashboard" className={styles.secondary}>
                Skip
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
