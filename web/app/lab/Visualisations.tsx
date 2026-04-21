"use client";

import { useMemo } from "react";
import type { GeneratedPlan, PlanDay, TuningParams } from "@/lib/engine";
import styles from "./lab.module.scss";

const FOCUS_COLOURS: Record<string, string> = {
  Rest: "var(--c-rest)",
  Recovery: "var(--c-recovery)",
  Base: "var(--c-base)",
  "Long Run": "var(--c-longrun)",
  Speed: "var(--c-speed)",
  "Speed Endurance": "var(--c-se)",
  Tempo: "var(--c-tempo)",
  "Pre-Race Shakeout": "var(--c-taper)",
  "Race Day": "var(--c-race)",
};

export function Visualisations({
  plan,
  tuning,
}: {
  plan: GeneratedPlan;
  tuning: TuningParams;
}) {
  const weeks = plan.weeks;

  const totalKm = useMemo(
    () => plan.days.reduce((s, d) => s + (d.totalDistance || 0), 0),
    [plan.days],
  );
  const peakWeek = useMemo(
    () => weeks.reduce((m, w) => (w.totalMileage > m.totalMileage ? w : m), weeks[0]),
    [weeks],
  );
  const maxWeeklyKm = Math.max(...weeks.map((w) => w.totalMileage));
  const totalRestDays = plan.days.filter((d) => d.isRest).length;
  const sessionDays = plan.days.filter((d) => !d.isRest && (d.totalDistance ?? 0) > 0);

  return (
    <div className={styles.viz}>
      <Readout plan={plan} totalKm={totalKm} peakWeek={peakWeek} restDays={totalRestDays} sessionCount={sessionDays.length} />

      <Card eyebrow="01" title="Weekly mileage ladder" subtitle="Peak → deload → taper, week by week">
        <MileageLadder plan={plan} maxKm={maxWeeklyKm} />
      </Card>

      <Card eyebrow="02" title="Block architecture" subtitle="Session weeks, deloads, and taper window">
        <BlockTimeline plan={plan} tuning={tuning} />
      </Card>

      <Card eyebrow="03" title="Focus mix / week" subtitle="Stacked session-type volume">
        <FocusStack plan={plan} />
      </Card>

      <Card eyebrow="04" title="Pace index stepdown" subtitle="How fast the athlete gets reclassified">
        <PaceStepdown plan={plan} />
      </Card>

      <Card eyebrow="05" title="Session density heatmap" subtitle="Week × day, shaded by total distance">
        <DensityHeatmap plan={plan} />
      </Card>

      <Card eyebrow="06" title="Plan grid" subtitle={`${plan.days.length} days, ${weeks.length} weeks`} wide>
        <PlanTable plan={plan} />
      </Card>
    </div>
  );
}

function Readout({
  plan,
  totalKm,
  peakWeek,
  restDays,
  sessionCount,
}: {
  plan: GeneratedPlan;
  totalKm: number;
  peakWeek: { weekNumber: number; totalMileage: number };
  restDays: number;
  sessionCount: number;
}) {
  const items = [
    { label: "Weeks", value: plan.planMeta.totalWeeks },
    { label: "Blocks", value: plan.planMeta.planBlockCount },
    {
      label: "Block shape",
      value: plan.planMeta.blocks.map((b) => b.blockWeeks).join("·"),
    },
    { label: "Peak km", value: `${Math.round(peakWeek.totalMileage)}` },
    { label: "Peak week", value: `#${peakWeek.weekNumber}` },
    { label: "Total km", value: `${Math.round(totalKm)}` },
    { label: "Sessions", value: sessionCount },
    { label: "Rest days", value: restDays },
    {
      label: "Taper starts",
      value: `day ${plan.planMeta.taperStartDayIndex + 1}`,
    },
    { label: "Slack days", value: plan.planMeta.slackDays },
    { label: "Start pace idx", value: plan.planMeta.startPaceIndex },
  ];

  return (
    <div className={styles.readout}>
      {items.map((it) => (
        <div key={it.label} className={styles.readoutCell}>
          <div className={styles.readoutLabel}>{it.label}</div>
          <div className={styles.readoutValue}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function Card({
  eyebrow,
  title,
  subtitle,
  wide,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`${styles.card} ${wide ? styles.cardWide : ""}`}>
      <header className={styles.cardHeader}>
        <div className={styles.cardEyebrow}>{eyebrow}</div>
        <div>
          <h3 className={styles.cardTitle}>{title}</h3>
          {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
        </div>
      </header>
      <div className={styles.cardBody}>{children}</div>
    </section>
  );
}

function MileageLadder({ plan, maxKm }: { plan: GeneratedPlan; maxKm: number }) {
  const weeks = plan.weeks;
  const H = 180;
  const rail = Math.max(20, Math.ceil(maxKm / 20) * 20);

  const { blockBoundaries, blockPeakWeeks } = useMemo(() => {
    const seen = new Set<number>();
    const boundaries: number[] = [];
    const peakByBlock = new Map<number, number>();
    weeks.forEach((w, i) => {
      if (!seen.has(w.blockNumber)) {
        seen.add(w.blockNumber);
        if (i > 0) boundaries.push(i);
      }
      if (!w.isTaper) {
        const prev = peakByBlock.get(w.blockNumber) ?? 0;
        if (w.totalMileage > prev) peakByBlock.set(w.blockNumber, w.totalMileage);
      }
    });
    return { blockBoundaries: boundaries, blockPeakWeeks: peakByBlock };
  }, [weeks]);

  return (
    <div className={styles.ladderWrap}>
      <div className={styles.ladderAxis} style={{ height: H }}>
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <div key={t} className={styles.ladderGridline} style={{ bottom: `${t * 100}%` }}>
            <span className={styles.ladderAxisLabel}>{Math.round(rail * t)}</span>
          </div>
        ))}
      </div>
      <div className={styles.ladderBars} style={{ height: H }}>
        {weeks.map((w, i) => {
          const h = rail > 0 ? (w.totalMileage / rail) * H : 0;
          const peak = blockPeakWeeks.get(w.blockNumber) ?? 0;
          const isTopWeek = !w.isTaper && w.totalMileage === peak && peak > 0;
          const isBoundary = blockBoundaries.includes(i);
          return (
            <div key={w.weekNumber} className={styles.ladderCol}>
              {isBoundary && <span className={styles.ladderDivider} aria-hidden />}
              <div
                className={`${styles.ladderBar} ${w.isTaper ? styles.ladderBarTaper : ""} ${isTopWeek ? styles.ladderBarPeak : ""}`}
                title={`Wk ${w.weekNumber} · ${Math.round(w.totalMileage)}km · block ${w.blockNumber}`}
                style={{ height: h }}
              />
              <div className={styles.ladderWeekLabel}>{w.weekNumber}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BlockTimeline({ plan, tuning }: { plan: GeneratedPlan; tuning: TuningParams }) {
  const totalWeeks = plan.planMeta.totalWeeks;
  const cells: { blockNumber: number; kind: "session" | "deload" | "taper"; weekNumber: number }[] = [];

  plan.weeks.forEach((w) => {
    if (w.isTaper) cells.push({ blockNumber: w.blockNumber, kind: "taper", weekNumber: w.weekNumber });
    else {
      const blockWeeks = plan.weeks.filter((x) => x.blockNumber === w.blockNumber && !x.isTaper);
      const idxInBlock = blockWeeks.findIndex((x) => x.weekNumber === w.weekNumber);
      const tail = idxInBlock >= blockWeeks.length - tuning.deloadWeeks;
      cells.push({ blockNumber: w.blockNumber, kind: tail ? "deload" : "session", weekNumber: w.weekNumber });
    }
  });

  return (
    <div className={styles.timeline}>
      <div className={styles.timelineTrack}>
        {cells.map((c, i) => (
          <div
            key={`${c.weekNumber}-${i}`}
            className={`${styles.timelineCell} ${styles[`timeline_${c.kind}`]}`}
            title={`Wk ${c.weekNumber} · ${c.kind}`}
            style={{ flex: 1 }}
          >
            <span className={styles.timelineWeek}>{c.weekNumber}</span>
          </div>
        ))}
      </div>
      <div className={styles.timelineLegend}>
        <LegendDot kind="session" label="Session week" />
        <LegendDot kind="deload" label="Deload" />
        <LegendDot kind="taper" label="Taper" />
        <span className={styles.timelineStat}>
          {plan.planMeta.planBlockCount} block{plan.planMeta.planBlockCount === 1 ? "" : "s"} · {totalWeeks} weeks total
        </span>
      </div>
    </div>
  );
}

function LegendDot({ kind, label }: { kind: "session" | "deload" | "taper"; label: string }) {
  return (
    <span className={styles.legendItem}>
      <span className={`${styles.legendSwatch} ${styles[`timeline_${kind}`]}`} />
      {label}
    </span>
  );
}

function FocusStack({ plan }: { plan: GeneratedPlan }) {
  const rows = useMemo(() => {
    return plan.weeks.map((w) => {
      const totals = new Map<string, number>();
      for (const d of w.days) {
        if (!d.totalDistance) continue;
        const key = d.focusArea || "Other";
        totals.set(key, (totals.get(key) ?? 0) + d.totalDistance);
      }
      const total = [...totals.values()].reduce((s, v) => s + v, 0);
      return { week: w.weekNumber, total, segs: [...totals.entries()] };
    });
  }, [plan.weeks]);

  const max = Math.max(1, ...rows.map((r) => r.total));

  return (
    <div className={styles.stack}>
      {rows.map((r) => (
        <div key={r.week} className={styles.stackRow}>
          <div className={styles.stackWeek}>{r.week}</div>
          <div className={styles.stackBar}>
            {r.segs.map(([focus, km]) => (
              <div
                key={focus}
                className={styles.stackSeg}
                title={`Wk ${r.week} · ${focus} · ${Math.round(km)}km`}
                style={{
                  width: `${(km / max) * 100}%`,
                  background: FOCUS_COLOURS[focus] ?? "var(--c-text-dim)",
                }}
              />
            ))}
          </div>
          <div className={styles.stackTotal}>{Math.round(r.total)}</div>
        </div>
      ))}
      <div className={styles.focusLegend}>
        {Object.entries(FOCUS_COLOURS)
          .filter(([f]) => f !== "Rest")
          .map(([f, c]) => (
            <span key={f} className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ background: c }} />
              {f}
            </span>
          ))}
      </div>
    </div>
  );
}

function PaceStepdown({ plan }: { plan: GeneratedPlan }) {
  const points = useMemo(() => {
    return plan.days
      .filter((d) => d._debug?.paceIndex !== undefined)
      .map((d, _i, arr) => ({
        x: d.dayCount / Math.max(1, arr[arr.length - 1].dayCount),
        idx: d._debug!.paceIndex,
        day: d.dayCount,
      }));
  }, [plan.days]);

  if (points.length === 0) return <div className={styles.empty}>No pace data</div>;

  const minIdx = Math.min(...points.map((p) => p.idx));
  const maxIdx = Math.max(...points.map((p) => p.idx));
  const range = Math.max(1, maxIdx - minIdx);

  const W = 100;
  const H = 100;
  const path = points
    .map((p, i) => {
      const x = p.x * W;
      const y = ((p.idx - minIdx) / range) * H;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className={styles.stepdown}>
      <svg viewBox={`0 -4 ${W} ${H + 8}`} preserveAspectRatio="none" className={styles.stepdownSvg}>
        <path d={path} fill="none" stroke="var(--c-accent)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        {points.filter((_, i) => i === 0 || i === points.length - 1 || i % Math.floor(points.length / 6) === 0).map((p) => {
          const x = p.x * W;
          const y = ((p.idx - minIdx) / range) * H;
          return <circle key={p.day} cx={x} cy={y} r="0.9" fill="var(--c-accent)" vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className={styles.stepdownAxis}>
        <span>start · idx {maxIdx}</span>
        <span>race · idx {minIdx}</span>
      </div>
    </div>
  );
}

function DensityHeatmap({ plan }: { plan: GeneratedPlan }) {
  const weeks = plan.weeks;
  const maxKm = Math.max(1, ...plan.days.map((d) => d.totalDistance || 0));
  const dayOrder: PlanDay["dayOfWeek"][] = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return (
    <div className={styles.heatmap}>
      <div className={styles.heatmapHead}>
        <span />
        {dayOrder.map((d) => (
          <span key={d} className={styles.heatmapHeadCell}>
            {d.slice(0, 3)}
          </span>
        ))}
      </div>
      <div className={styles.heatmapBody}>
        {weeks.map((w) => (
          <div key={w.weekNumber} className={styles.heatmapRow}>
            <span className={styles.heatmapWeek}>{w.weekNumber}</span>
            {dayOrder.map((dow) => {
              const day = w.days.find((d) => d.dayOfWeek === dow);
              const km = day?.totalDistance ?? 0;
              const t = km > 0 ? 0.15 + 0.85 * (km / maxKm) : 0;
              const bg =
                km === 0
                  ? "transparent"
                  : day?.focusArea
                    ? `color-mix(in oklab, ${FOCUS_COLOURS[day.focusArea] ?? "var(--c-accent)"} ${Math.round(t * 100)}%, white)`
                    : `rgba(90,122,58,${t})`;
              return (
                <span
                  key={dow}
                  className={styles.heatmapCell}
                  style={{ background: bg }}
                  title={day ? `Wk ${w.weekNumber} · ${dow} · ${km}km · ${day.focusArea}` : ""}
                >
                  {km > 0 ? Math.round(km) : ""}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanTable({ plan }: { plan: GeneratedPlan }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Wk</th>
            <th>Blk</th>
            <th>Day</th>
            <th>Date</th>
            <th>Focus</th>
            <th>Summary</th>
            <th className={styles.numCol}>Km</th>
            <th className={styles.numCol}>Week km</th>
          </tr>
        </thead>
        <tbody>
          {plan.days.map((d) => (
            <tr key={d.dateStr} className={d.isRest ? styles.rowRest : d.isTaper ? styles.rowTaper : ""}>
              <td>{d.weekNumber}</td>
              <td>{d.blockNumber}</td>
              <td>{d.dayOfWeek.slice(0, 3)}</td>
              <td className={styles.mono}>{d.dateStr}</td>
              <td>
                <span
                  className={styles.focusPill}
                  style={{ background: FOCUS_COLOURS[d.focusArea] ?? "var(--c-text-dim)" }}
                >
                  {d.focusArea}
                </span>
              </td>
              <td className={styles.truncate}>{d.sessionSummary}</td>
              <td className={`${styles.numCol} ${styles.mono}`}>{d.totalDistance ? d.totalDistance.toFixed(1) : "—"}</td>
              <td className={`${styles.numCol} ${styles.mono}`}>{d.weeklyMileage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
