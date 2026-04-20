import type { ProgressView, ProgressWeek } from "@/lib/progress/buildProgressView";
import styles from "./BlockTimeline.module.scss";

interface Block {
  label: string;
  shortLabel: string;
  start: number;
  end: number;
  isTaper: boolean;
}

function groupBlocks(weeks: ProgressWeek[]): Block[] {
  const blocks: Block[] = [];
  for (const wk of weeks) {
    const label = wk.isTaper ? "Taper" : `Block ${wk.blockNumber}`;
    const last = blocks[blocks.length - 1];
    if (last && last.label === label) {
      last.end = wk.weekNumber;
    } else {
      blocks.push({
        label,
        shortLabel: wk.isTaper ? "T" : `B${wk.blockNumber}`,
        start: wk.weekNumber,
        end: wk.weekNumber,
        isTaper: wk.isTaper,
      });
    }
  }
  return blocks;
}

export function BlockTimeline({ view }: { view: ProgressView }) {
  const blocks = groupBlocks(view.weeks);
  const total = view.weeks.length;
  const now = view.nowWeek;

  return (
    <div className={styles.wrap}>
      <div className={styles.blocks}>
        {blocks.map((b) => {
          const width = ((b.end - b.start + 1) / total) * 100;
          const isCurrent = now >= b.start && now <= b.end;
          const isPast = now > b.end;
          const state = isCurrent ? "current" : isPast ? "past" : "future";
          const cls = [
            styles.block,
            styles[state],
            b.isTaper ? styles.taper : styles.build,
          ].join(" ");
          return (
            <div
              key={`${b.label}-${b.start}`}
              className={cls}
              style={{ flex: `${width}` }}
              title={b.label}
            >
              <span>{b.shortLabel}</span>
            </div>
          );
        })}
      </div>

      <div className={styles.ticks}>
        {view.weeks.map((wk) => {
          const state =
            wk.weekNumber === now
              ? "now"
              : wk.weekNumber < now
                ? "past"
                : "future";
          return (
            <div
              key={wk.weekNumber}
              className={`${styles.tick} ${styles[state]}`}
            />
          );
        })}
      </div>

      <div className={styles.legend}>
        <span>Wk 1</span>
        <span className={styles.current}>Wk {now} · now</span>
        <span>Wk {total} · race</span>
      </div>
    </div>
  );
}
