import type { StravaActivity } from "@/lib/strava/client";
import styles from "./ActivitiesList.module.scss";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function fmtKm(metres: number): string {
  return (metres / 1000).toFixed(1);
}

function fmtPace(metres: number, secs: number | undefined): string {
  if (!secs || metres <= 0) return "—";
  const perKm = secs / (metres / 1000);
  const m = Math.floor(perKm / 60);
  const s = Math.round(perKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ActivitiesList({
  activities,
}: {
  activities: StravaActivity[];
}) {
  if (activities.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No runs logged since your plan started.</p>
      </div>
    );
  }

  const sorted = [...activities].sort((a, b) =>
    b.start_date_local.localeCompare(a.start_date_local),
  );

  return (
    <ul className={styles.list}>
      {sorted.map((a) => (
        <li key={a.id} className={styles.row}>
          <a
            href={`https://www.strava.com/activities/${a.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            <time className={styles.date}>{fmtDate(a.start_date_local)}</time>
            <span className={styles.name}>{a.name || "Run"}</span>
            <span className={styles.stat}>
              <span className={styles.num}>{fmtKm(a.distance)}</span>
              <span className={styles.unit}>km</span>
            </span>
            <span className={styles.stat}>
              <span className={styles.num}>
                {fmtPace(a.distance, a.moving_time)}
              </span>
              <span className={styles.unit}>/km</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
