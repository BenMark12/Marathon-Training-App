"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./onboarding.module.scss";
import {
  type Experience,
  type GoalChoice,
  MOTIVATION_OPTIONS,
  type OnboardingAnswers,
  RACE_OPTIONS,
  type RecentDist,
  type RecentRun,
  formatHoursRough,
  recentToMarathonSeconds,
  weeksUntil,
} from "./utils";

type NavProps = { onNext: () => void; onBack: () => void };

function Hint({ children }: { children: React.ReactNode }) {
  return <p className={styles.hint}>{children}</p>;
}

function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.primaryBtn}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{children}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className={styles.secondaryBtn} onClick={onClick}>
      {children}
    </button>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className={styles.eyebrow}>{children}</span>;
}

/* ── 0. Welcome ────────────────────────────────────────────────────────── */
export function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className={`${styles.col} ${styles.welcome}`}>
      <Eyebrow>Welcome to Watto</Eyebrow>
      <h1 className={styles.display}>
        <span className={styles.displayLine}>Ready to run</span>
        <span className={styles.bigNumber}>
          42.2
          <em>km</em>
        </span>
      </h1>
      <p className={styles.sub}>
        A marathon is a long way. We&rsquo;ll take it a week at a time, starting
        with nine small questions.
      </p>
      <div className={styles.distanceRibbon}>
        <span className={styles.ribbonStart}>0</span>
        <span className={styles.ribbonTrack}>
          <span className={styles.ribbonRunner}>🏃</span>
        </span>
        <span className={styles.ribbonEnd}>42.2</span>
      </div>
      <PrimaryButton onClick={onNext}>Let&rsquo;s go</PrimaryButton>
    </div>
  );
}

/* ── 1. Experience ─────────────────────────────────────────────────────── */
export function StepExperience({
  onNext,
  onBack,
  value,
  onChange,
}: NavProps & {
  value: Experience | undefined;
  onChange: (v: Experience) => void;
}) {
  const opts: { id: Experience; title: string; sub: string; emoji: string }[] = [
    { id: "never", title: "Brand new to this", sub: "A marathon feels huge — and that's fine.", emoji: "🌱" },
    { id: "some", title: "I've run a bit", sub: "5Ks, 10Ks, maybe a half.", emoji: "🏃" },
    { id: "lots", title: "I've done marathons", sub: "I want a better plan this time.", emoji: "🎯" },
  ];
  return (
    <div className={styles.col}>
      <Eyebrow>Step 1 · You</Eyebrow>
      <h2 className={styles.h2}>Where are you starting from?</h2>
      <Hint>No wrong answer — it just tunes how we talk to you.</Hint>
      <div className={styles.tapStack}>
        {opts.map((o, i) => (
          <button
            key={o.id}
            type="button"
            className={`${styles.tapCard} ${value === o.id ? styles.tapCardOn : ""}`}
            style={{ animationDelay: `${i * 70}ms` }}
            onClick={() => {
              onChange(o.id);
              setTimeout(onNext, 180);
            }}
          >
            <span className={styles.tapEmoji}>{o.emoji}</span>
            <span className={styles.tapBody}>
              <span className={styles.tapTitle}>{o.title}</span>
              <span className={styles.tapSub}>{o.sub}</span>
            </span>
            <span className={styles.tapChevron} aria-hidden>
              →
            </span>
          </button>
        ))}
      </div>
      <SecondaryButton onClick={onBack}>Back</SecondaryButton>
    </div>
  );
}

/* ── 2. Motivation ─────────────────────────────────────────────────────── */
export function StepMotivation({
  onNext,
  onBack,
  value,
  onChange,
}: NavProps & { value?: string; onChange: (v: string) => void }) {
  return (
    <div className={styles.col}>
      <Eyebrow>Step 2 · Why</Eyebrow>
      <h2 className={styles.h2}>What&rsquo;s pulling you to the start line?</h2>
      <Hint>Knowing your &ldquo;why&rdquo; helps you through the tough weeks.</Hint>
      <div className={styles.chipGrid}>
        {MOTIVATION_OPTIONS.map((o, i) => (
          <button
            key={o.id}
            type="button"
            className={`${styles.chipCard} ${value === o.id ? styles.chipCardOn : ""}`}
            style={{ animationDelay: `${i * 50}ms` }}
            onClick={() => onChange(o.id)}
          >
            <span className={styles.chipEmoji}>{o.emoji}</span>
            <span>{o.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.navRow}>
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        <PrimaryButton disabled={!value} onClick={onNext}>
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ── 3. Race ───────────────────────────────────────────────────────────── */
export function StepRace({
  onNext,
  onBack,
  value,
  onChange,
}: NavProps & {
  value?: { name: string; emoji: string };
  onChange: (v: { name: string; emoji: string }) => void;
}) {
  return (
    <div className={styles.col}>
      <Eyebrow>Step 3 · Race</Eyebrow>
      <h2 className={styles.h2}>Which marathon are you aiming for?</h2>
      <Hint>Pick a big one, or &ldquo;my own race&rdquo; if it&rsquo;s something smaller.</Hint>
      <div className={styles.tapStack}>
        {RACE_OPTIONS.map((o, i) => (
          <button
            key={o.name}
            type="button"
            className={`${styles.tapCard} ${value?.name === o.name ? styles.tapCardOn : ""}`}
            style={{ animationDelay: `${i * 60}ms` }}
            onClick={() => {
              onChange(o);
              setTimeout(onNext, 180);
            }}
          >
            <span className={styles.tapEmoji}>{o.emoji}</span>
            <span className={styles.tapBody}>
              <span className={styles.tapTitle}>{o.name}</span>
            </span>
            <span className={styles.tapChevron} aria-hidden>
              →
            </span>
          </button>
        ))}
      </div>
      <SecondaryButton onClick={onBack}>Back</SecondaryButton>
    </div>
  );
}

/* ── 4. Date ───────────────────────────────────────────────────────────── */
export function StepDate({
  onNext,
  onBack,
  value,
  min,
  onChange,
}: NavProps & { value?: string; min: string; onChange: (v: string) => void }) {
  const weeks = value ? weeksUntil(value) : null;
  const readiness = (() => {
    if (weeks == null) return null;
    if (weeks < 8) return { tone: "warn", label: "A bit tight — plans need 8+ weeks." };
    if (weeks < 12) return { tone: "ok", label: "Enough time if you&rsquo;re already active." };
    if (weeks < 20) return { tone: "great", label: "Lovely runway. Ideal prep window." };
    return { tone: "chill", label: "Plenty of time — we&rsquo;ll build slowly." };
  })();

  return (
    <div className={styles.col}>
      <Eyebrow>Step 4 · Date</Eyebrow>
      <h2 className={styles.h2}>When&rsquo;s race day?</h2>
      <Hint>The plan works backwards from this date.</Hint>
      <label className={styles.dateField}>
        <span className={styles.dateLabel}>Race date</span>
        <input
          type="date"
          className={styles.dateInput}
          value={value ?? ""}
          min={min}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      {weeks != null && (
        <div
          className={`${styles.readout} ${readiness?.tone ? styles[`readout_${readiness.tone}`] : ""}`}
        >
          <span className={styles.readoutNumber}>{weeks}</span>
          <span className={styles.readoutUnit}>weeks to prep</span>
          {readiness && (
            <span
              className={styles.readoutNote}
              dangerouslySetInnerHTML={{ __html: readiness.label }}
            />
          )}
        </div>
      )}
      <div className={styles.navRow}>
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        <PrimaryButton disabled={!value || (weeks ?? 0) < 8} onClick={onNext}>
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ── 5. Volume ─────────────────────────────────────────────────────────── */
export function StepVolume({
  onNext,
  onBack,
  value,
  experience,
  onChange,
}: NavProps & {
  value?: number;
  experience?: Experience;
  onChange: (v: number) => void;
}) {
  const defaultVolume = experience === "never" ? 10 : experience === "lots" ? 50 : 25;
  const current = value ?? defaultVolume;
  useEffect(() => {
    if (value === undefined) onChange(defaultVolume);
  }, [value, defaultVolume, onChange]);

  const compare = (() => {
    if (current < 10) return "≈ one gentle jog a week";
    if (current < 20) return "≈ two easy runs a week";
    if (current < 35) return "≈ three runs, one a bit longer";
    if (current < 55) return "≈ four runs with a proper long run";
    if (current < 80) return "≈ five runs, serious training";
    return "≈ high-mileage athlete";
  })();

  return (
    <div className={styles.col}>
      <Eyebrow>Step 5 · Volume</Eyebrow>
      <h2 className={styles.h2}>How much are you running now?</h2>
      <Hint>Rough number — we&rsquo;ll grow it gently from here.</Hint>

      <div className={styles.sliderReadout}>
        <span className={styles.sliderValue}>{current}</span>
        <span className={styles.sliderUnit}>km&nbsp;/ week</span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className={styles.slider}
        style={{ ["--pct" as string]: `${current}%` }}
      />
      <div className={styles.sliderScale}>
        <span>0</span>
        <span>50</span>
        <span>100+</span>
      </div>
      <div className={styles.sliderCompare}>{compare}</div>

      <div className={styles.navRow}>
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
      </div>
    </div>
  );
}

/* ── 6. Recent run (fitness check) ─────────────────────────────────────── */
export function StepRecent({
  onNext,
  onBack,
  value,
  onChange,
}: NavProps & { value?: RecentRun; onChange: (v: RecentRun) => void }) {
  const dist = value?.dist ?? "5k";
  const mm = value?.mm ?? 30;
  const ss = value?.ss ?? 0;

  const distOptions: { id: RecentDist; label: string }[] = [
    { id: "1mile", label: "1 mile" },
    { id: "5k", label: "5K" },
    { id: "10k", label: "10K" },
    { id: "half", label: "Half" },
    { id: "long", label: "~16 km" },
  ];

  const update = (patch: Partial<RecentRun>) =>
    onChange({ dist, mm, ss, ...patch });

  const estimateSec = useMemo(
    () => recentToMarathonSeconds({ dist, mm, ss }),
    [dist, mm, ss],
  );

  return (
    <div className={styles.col}>
      <Eyebrow>Step 6 · Fitness</Eyebrow>
      <h2 className={styles.h2}>Your most recent run?</h2>
      <Hint>We use this to predict a realistic marathon time.</Hint>

      <div className={styles.segment}>
        {distOptions.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`${styles.segmentOption} ${dist === o.id ? styles.segmentOptionOn : ""}`}
            onClick={() => update({ dist: o.id })}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className={styles.timeField}>
        <div className={styles.timeCluster}>
          <div className={styles.timeCell}>
            <input
              type="number"
              min={0}
              max={180}
              value={mm}
              onChange={(e) => update({ mm: Math.max(0, Math.min(180, Number(e.target.value) || 0)) })}
              aria-label="Minutes"
            />
            <span>min</span>
          </div>
          <span className={styles.timeSep}>:</span>
          <div className={styles.timeCell}>
            <input
              type="number"
              min={0}
              max={59}
              value={String(ss).padStart(2, "0")}
              onChange={(e) => update({ ss: Math.max(0, Math.min(59, Number(e.target.value) || 0)) })}
              aria-label="Seconds"
            />
            <span>sec</span>
          </div>
        </div>
      </div>

      {estimateSec != null && estimateSec > 0 && (
        <div className={styles.estimateCard}>
          <span className={styles.estimateEyebrow}>Riegel says your marathon is around</span>
          <span className={styles.estimateNumber}>{formatHoursRough(estimateSec)}</span>
          <span className={styles.estimateNote}>
            A starting point — training sharpens this.
          </span>
        </div>
      )}

      <div className={styles.navRow}>
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        <PrimaryButton disabled={!estimateSec} onClick={onNext}>
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ── 7. Goal ───────────────────────────────────────────────────────────── */
export function StepGoal({
  onNext,
  onBack,
  value,
  estimateSec,
  onChange,
}: NavProps & {
  value?: GoalChoice;
  estimateSec: number | null;
  onChange: (v: GoalChoice) => void;
}) {
  const [customHH, setCustomHH] = useState<number>(
    value?.type === "custom" ? value.hh : 3,
  );
  const [customMM, setCustomMM] = useState<number>(
    value?.type === "custom" ? value.mm : 45,
  );

  const goals: { id: GoalChoice["type"]; label: string; sub?: string }[] = [
    { id: "finish", label: "Just finish", sub: "Cross the line smiling." },
    { id: "sub4", label: "Sub 4h", sub: "Steady, respectable." },
    { id: "sub330", label: "Sub 3:30", sub: "Committed amateur." },
    { id: "sub3", label: "Sub 3h", sub: "Serious business." },
  ];

  return (
    <div className={styles.col}>
      <Eyebrow>Step 7 · Goal</Eyebrow>
      <h2 className={styles.h2}>What does success look like?</h2>
      <Hint>
        {estimateSec
          ? `Based on your recent run, ${formatHoursRough(estimateSec)} feels honest. Pick what motivates you.`
          : "Pick what feels right — we'll adjust the paces."}
      </Hint>

      <div className={styles.goalGrid}>
        {goals.map((g, i) => (
          <button
            key={g.id}
            type="button"
            className={`${styles.goalCard} ${value?.type === g.id ? styles.goalCardOn : ""}`}
            style={{ animationDelay: `${i * 60}ms` }}
            onClick={() => onChange({ type: g.id } as GoalChoice)}
          >
            <span className={styles.goalLabel}>{g.label}</span>
            {g.sub && <span className={styles.goalSub}>{g.sub}</span>}
          </button>
        ))}
        <div
          className={`${styles.goalCustom} ${value?.type === "custom" ? styles.goalCardOn : ""}`}
        >
          <button
            type="button"
            className={styles.goalCustomToggle}
            onClick={() => onChange({ type: "custom", hh: customHH, mm: customMM })}
          >
            <span className={styles.goalLabel}>I have a number</span>
          </button>
          {value?.type === "custom" && (
            <div className={styles.goalCustomInputs}>
              <input
                type="number"
                min={2}
                max={7}
                value={customHH}
                onChange={(e) => {
                  const v = Math.max(2, Math.min(7, Number(e.target.value) || 0));
                  setCustomHH(v);
                  onChange({ type: "custom", hh: v, mm: customMM });
                }}
                aria-label="Hours"
              />
              <span>h</span>
              <input
                type="number"
                min={0}
                max={59}
                value={customMM}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(59, Number(e.target.value) || 0));
                  setCustomMM(v);
                  onChange({ type: "custom", hh: customHH, mm: v });
                }}
                aria-label="Minutes"
              />
              <span>m</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.navRow}>
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        <PrimaryButton disabled={!value} onClick={onNext}>
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ── 8. Days ───────────────────────────────────────────────────────────── */
export function StepDays({
  onNext,
  onBack,
  value,
  onChange,
}: NavProps & { value?: 3 | 4 | 5; onChange: (v: 3 | 4 | 5) => void }) {
  const opts: { id: 3 | 4 | 5; title: string; sub: string }[] = [
    { id: 3, title: "3 days", sub: "Time-pressed, busy life." },
    { id: 4, title: "4 days", sub: "Balanced — the sweet spot." },
    { id: 5, title: "5 days", sub: "Dedicated, high volume." },
  ];
  return (
    <div className={styles.col}>
      <Eyebrow>Step 8 · Schedule</Eyebrow>
      <h2 className={styles.h2}>How many running days per week?</h2>
      <Hint>Be honest about your week — consistency beats ambition.</Hint>
      <div className={styles.daysRow}>
        {opts.map((o, i) => (
          <button
            key={o.id}
            type="button"
            className={`${styles.dayCard} ${value === o.id ? styles.dayCardOn : ""}`}
            style={{ animationDelay: `${i * 80}ms` }}
            onClick={() => {
              onChange(o.id);
              setTimeout(onNext, 220);
            }}
          >
            <span className={styles.dayNumber}>{o.id}</span>
            <span className={styles.dayTitle}>{o.title}</span>
            <span className={styles.daySub}>{o.sub}</span>
          </button>
        ))}
      </div>
      <SecondaryButton onClick={onBack}>Back</SecondaryButton>
    </div>
  );
}

/* ── 9. Review ─────────────────────────────────────────────────────────── */
export function StepReview({
  onBack,
  onSubmit,
  answers,
  estimateSec,
  pending,
  error,
}: {
  onBack: () => void;
  onSubmit: () => void;
  answers: OnboardingAnswers;
  estimateSec: number | null;
  pending: boolean;
  error: string | null;
}) {
  const weeks = answers.raceDate ? weeksUntil(answers.raceDate) : null;

  const goalLabel = (() => {
    if (!answers.goal) return "—";
    if (answers.goal.type === "custom")
      return `${answers.goal.hh}h ${String(answers.goal.mm).padStart(2, "0")}m`;
    return { finish: "Just finish", sub4: "Sub 4h", sub330: "Sub 3:30", sub3: "Sub 3h" }[
      answers.goal.type
    ];
  })();

  const rows: [string, string][] = [
    ["Race", answers.race?.name ?? "—"],
    ["Date", answers.raceDate ?? "—"],
    ["Runway", weeks != null ? `${weeks} weeks` : "—"],
    ["Running now", answers.volume != null ? `${answers.volume} km / week` : "—"],
    ["Fitness", estimateSec ? `Marathon ~${formatHoursRough(estimateSec)}` : "—"],
    ["Goal", goalLabel],
    ["Days / week", answers.days ? String(answers.days) : "—"],
  ];

  return (
    <div className={styles.col}>
      <Eyebrow>Step 9 · Review</Eyebrow>
      <h2 className={styles.h2}>Here&rsquo;s what we heard.</h2>
      <Hint>Look good? We&rsquo;ll build a block-periodised plan from this.</Hint>

      <dl className={styles.review}>
        {rows.map(([k, v], i) => (
          <div
            key={k}
            className={styles.reviewRow}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={styles.navRow}>
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        <PrimaryButton disabled={pending} onClick={onSubmit}>
          {pending ? "Building…" : "Build my plan"}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ── 10. Generating ────────────────────────────────────────────────────── */
export function StepGenerating() {
  const messages = [
    "Reading your race date…",
    "Laying down weekly blocks…",
    "Picking long runs…",
    "Tuning paces…",
    "Adding a taper…",
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % messages.length), 900);
    return () => clearInterval(t);
  }, [messages.length]);

  return (
    <div className={`${styles.col} ${styles.centered}`}>
      <div className={styles.spinner} aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <h2 className={styles.h2}>Building your plan</h2>
      <p className={styles.loadingMsg} key={i}>
        {messages[i]}
      </p>
    </div>
  );
}

/* ── 11. Done ──────────────────────────────────────────────────────────── */
export function StepDone() {
  const pieces = Array.from({ length: 36 });
  return (
    <div className={`${styles.col} ${styles.centered}`}>
      <div className={styles.confetti} aria-hidden>
        {pieces.map((_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 97) % 100}%`,
              animationDelay: `${(i % 9) * 90}ms`,
              background: [
                "#5a7a3a",
                "#c47a20",
                "#3a6a8a",
                "#c44040",
                "#b8960a",
                "#6a5aaa",
              ][i % 6],
            }}
          />
        ))}
      </div>
      <div className={styles.bigTick} aria-hidden>
        <svg viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" strokeWidth="4" stroke="currentColor" />
          <path
            d="M20 33l9 9 16-18"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className={styles.h2}>Plan ready.</h2>
      <p className={styles.sub}>Opening it now…</p>
    </div>
  );
}
