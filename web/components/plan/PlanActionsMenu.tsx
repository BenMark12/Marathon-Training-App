"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { z } from "zod";
import { deletePlanAction } from "@/app/actions/plans";
import { syncActivitiesAction } from "@/app/actions/strava";
import type { PlanWeekSchema } from "@/lib/storage/schemas";
import styles from "./PlanActionsMenu.module.scss";

type PlanWeek = z.infer<typeof PlanWeekSchema>;

type Props = {
  planId: string;
  planLabel: string;
  weeks: PlanWeek[];
  completions: Record<string, string>;
  stravaConnected: boolean;
  redirectTo?: string;
};

type Status =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function PlanActionsMenu({
  planId,
  planLabel,
  weeks,
  completions,
  stravaConnected,
  redirectTo,
}: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [syncPending, startSync] = useTransition();
  const [deletePending, startDelete] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleSync() {
    setOpen(false);
    setStatus({ kind: "idle" });
    startSync(async () => {
      const r = await syncActivitiesAction(planId);
      if (!r.ok) {
        setStatus({ kind: "error", message: r.error });
        return;
      }
      setStatus({
        kind: "success",
        message:
          r.newMatches === 0
            ? "Up to date — no new runs to match."
            : `Matched ${r.newMatches} new run${r.newMatches === 1 ? "" : "s"}.`,
      });
    });
  }

  function handleExport() {
    setOpen(false);
    const csv = buildCsv(weeks, completions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFileName(planLabel)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleDelete() {
    setOpen(false);
    const confirmed = window.confirm(
      `Delete "${planLabel}"? This will remove the plan and its completions. This cannot be undone.`,
    );
    if (!confirmed) return;
    startDelete(async () => {
      await deletePlanAction(planId);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  const busy = syncPending || deletePending;
  const statusText =
    status.kind !== "idle"
      ? status.message
      : syncPending
        ? "Syncing…"
        : deletePending
          ? "Deleting…"
          : null;

  return (
    <div className={styles.root} ref={rootRef}>
      {statusText && (
        <span
          className={`${styles.status} ${status.kind !== "idle" ? styles[status.kind] : ""}`}
          role="status"
        >
          {statusText}
        </span>
      )}
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Plan actions"
        disabled={busy}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && (
        <div role="menu" className={styles.menu}>
          {stravaConnected && (
            <button
              role="menuitem"
              type="button"
              className={styles.item}
              onClick={handleSync}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M15.4 17.1L11.1 8.9 6.7 17.1H3L11.1 2l8.1 15.1h-3.8z" />
                <path
                  d="M15.4 17.1l-2.3 4.4-2.2-4.4H8L13.1 22l5-9.9h-2.7z"
                  opacity=".6"
                />
              </svg>
              Sync from Strava
            </button>
          )}
          <button
            role="menuitem"
            type="button"
            className={styles.item}
            onClick={handleExport}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Export as CSV
          </button>
          <button
            role="menuitem"
            type="button"
            className={`${styles.item} ${styles.danger}`}
            onClick={handleDelete}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Delete plan
          </button>
        </div>
      )}
    </div>
  );
}

function safeFileName(label: string): string {
  return label.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "plan";
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function buildCsv(
  weeks: PlanWeek[],
  completions: Record<string, string>,
): string {
  const header = [
    "Date",
    "Day",
    "Week",
    "Block",
    "Focus",
    "Session",
    "Distance (km)",
    "Paces",
    "Reps",
    "Completed",
  ];
  const rows = weeks.flatMap((w) =>
    w.days.map((d) => [
      d.dateStr,
      d.dayOfWeek,
      String(d.weekNumber),
      String(d.blockNumber),
      d.focusArea,
      d.sessionSummary,
      (d.totalDistance / 1000).toFixed(2),
      d.paces,
      d.reps.join("|"),
      completions[d.dateStr] ?? "",
    ]),
  );
  return [header, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
}
