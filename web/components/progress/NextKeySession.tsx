import Link from "next/link";
import {
  FOCUS_COLORS,
  focusKeyOf,
  type ProgressDay,
  type ProgressView,
} from "@/lib/progress/buildProgressView";
import styles from "./NextKeySession.module.scss";

const QUALITY = new Set(["Speed", "Speed Endurance", "Tempo"]);

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function Card({
  planId,
  day,
  emphasis,
}: {
  planId: string;
  day: ProgressDay | undefined;
  emphasis: string;
}) {
  if (!day) return null;
  const key = focusKeyOf(day.focusArea);
  const colour = FOCUS_COLORS[key];
  return (
    <Link href={`/plans/${planId}/day/${day.dateStr}`} className={styles.card}>
      <div className={styles.kicker} style={{ color: colour }}>
        <span className={styles.kickerDot} style={{ background: colour }} />
        {emphasis}
      </div>
      <div className={styles.title}>{day.sessionSummary}</div>
      <div className={styles.meta}>
        {fmt(day.dateStr)} · {day.plannedKm}km
      </div>
    </Link>
  );
}

export function NextKeySession({
  view,
  planId,
}: {
  view: ProgressView;
  planId: string;
}) {
  const future = view.weeks.flatMap((w) => w.days).filter(
    (d) => d.dateStr > view.today,
  );
  const nextLong = future.find((d) => d.focusArea === "Long Run");
  const nextQuality = future.find((d) => QUALITY.has(d.focusArea));

  if (!nextLong && !nextQuality) {
    return (
      <div className={styles.empty}>
        No key sessions remaining. Race day is close.
      </div>
    );
  }

  return (
    <div className={styles.row}>
      <Card planId={planId} day={nextLong} emphasis="Next long run" />
      <Card planId={planId} day={nextQuality} emphasis="Next quality" />
    </div>
  );
}
