"use client";

import { useState } from "react";
import type { z } from "zod";
import type { PlanWeekSchema } from "@/lib/storage/schemas";
import { WeekRow } from "./WeekRow";
import styles from "./PlanGrid.module.scss";

type PlanWeek = z.infer<typeof PlanWeekSchema>;

function todayISO(): string {
  return new Date().toISOString().split("T")[0]!;
}

function findCurrentWeekIndex(weeks: PlanWeek[]): number {
  const today = todayISO();
  for (let i = 0; i < weeks.length; i++) {
    const last = weeks[i]!.days[weeks[i]!.days.length - 1]?.dateStr;
    if (last && last >= today) return i;
  }
  return Math.max(0, weeks.length - 1);
}

export function PlanGrid({
  weeks,
  planId,
  completions,
}: {
  weeks: PlanWeek[];
  planId: string;
  completions: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const currentIdx = findCurrentWeekIndex(weeks);
  const visibleEnd = Math.min(weeks.length, currentIdx + 2);
  const visibleWeeks = expanded ? weeks : weeks.slice(currentIdx, visibleEnd);
  const hiddenCount = weeks.length - visibleEnd;
  const lastDate = weeks[weeks.length - 1]?.days.at(-1)?.dateStr;
  const throughLabel = lastDate
    ? new Date(lastDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "race day";

  return (
    <div className={styles.grid}>
      {visibleWeeks.map((w) => (
        <WeekRow
          key={w.weekNumber}
          week={w}
          planId={planId}
          completions={completions}
        />
      ))}

      {!expanded && hiddenCount > 0 && (
        <button
          type="button"
          className={styles.expand}
          onClick={() => setExpanded(true)}
          aria-label={`See full plan — ${hiddenCount} more weeks`}
        >
          <div className={styles.expandText}>
            <span className={styles.expandTitle}>See full plan</span>
            <span className={styles.expandMeta}>
              {hiddenCount} more {hiddenCount === 1 ? "week" : "weeks"}
              <span className={styles.dot} aria-hidden="true">·</span>
              through {throughLabel}
            </span>
          </div>
          <span className={styles.chevron} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      )}

      {expanded && weeks.length > visibleEnd && (
        <button
          type="button"
          className={styles.collapse}
          onClick={() => setExpanded(false)}
        >
          Show less
        </button>
      )}
    </div>
  );
}
