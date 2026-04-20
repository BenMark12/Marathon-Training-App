"use client";

import { useMemo, useState } from "react";
import { dataStore } from "@/lib/data";
import {
  DEFAULT_TUNING,
  generateTrainingPlan,
  type GeneratePlanInput,
  type GeneratedPlan,
  type TuningParams,
} from "@/lib/engine";
import styles from "./lab.module.scss";
import { Visualisations } from "./Visualisations";

type Style = GeneratePlanInput["style"];

interface LabState {
  input: GeneratePlanInput;
  tuning: TuningParams;
}

function defaultRaceDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 140);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_STATE: LabState = {
  input: {
    raceDate: defaultRaceDate(),
    sessionsPerWeek: 4,
    currentMileage: 50,
    targetMileage: 90,
    raceDistance: "Marathon",
    currentPace: "04:00:00",
    targetPace: "03:30:00",
    style: "Endurance",
  },
  tuning: DEFAULT_TUNING,
};

export function LabClient() {
  const [state, setState] = useState<LabState>(DEFAULT_STATE);

  const result = useMemo<
    { ok: true; plan: GeneratedPlan } | { ok: false; error: string }
  >(() => {
    try {
      const plan = generateTrainingPlan(state.input, dataStore, state.tuning);
      return { ok: true, plan };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }, [state]);

  function updateInput<K extends keyof GeneratePlanInput>(
    key: K,
    value: GeneratePlanInput[K],
  ) {
    setState((s) => ({ ...s, input: { ...s.input, [key]: value } }));
  }

  function updateTuning<K extends keyof TuningParams>(
    key: K,
    value: TuningParams[K],
  ) {
    setState((s) => ({ ...s, tuning: { ...s.tuning, [key]: value } }));
  }

  function resetTuning() {
    setState((s) => ({ ...s, tuning: DEFAULT_TUNING }));
  }

  function resetAll() {
    setState(DEFAULT_STATE);
  }

  const plan = result.ok ? result.plan : null;

  return (
    <div className={styles.shell}>
      <aside className={styles.rail}>
        <header className={styles.railHeader}>
          <div className={styles.eyebrow}>watto · lab</div>
          <h1 className={styles.title}>Algorithm bench</h1>
          <p className={styles.subtitle}>
            Every knob the generator exposes. Changes regenerate the plan live.
          </p>
        </header>

        <Section num="01" label="Athlete inputs">
          <Field label="Race date">
            <input
              type="date"
              value={state.input.raceDate}
              onChange={(e) => updateInput("raceDate", e.target.value)}
              className={styles.input}
            />
          </Field>

          <TwoUp>
            <Field label="Current km/week" hint={`${state.input.currentMileage}`}>
              <input
                type="range"
                min={10}
                max={200}
                step={1}
                value={state.input.currentMileage}
                onChange={(e) => updateInput("currentMileage", Number(e.target.value))}
                className={styles.range}
              />
            </Field>
            <Field label="Target km/week" hint={`${state.input.targetMileage}`}>
              <input
                type="range"
                min={10}
                max={250}
                step={1}
                value={state.input.targetMileage}
                onChange={(e) => updateInput("targetMileage", Number(e.target.value))}
                className={styles.range}
              />
            </Field>
          </TwoUp>

          <TwoUp>
            <Field label="Current time">
              <input
                type="text"
                value={state.input.currentPace}
                pattern="\d{2}:\d{2}:\d{2}"
                onChange={(e) => updateInput("currentPace", e.target.value)}
                className={styles.input}
              />
            </Field>
            <Field label="Target time">
              <input
                type="text"
                value={state.input.targetPace}
                pattern="\d{2}:\d{2}:\d{2}"
                onChange={(e) => updateInput("targetPace", e.target.value)}
                className={styles.input}
              />
            </Field>
          </TwoUp>

          <Field label="Sessions per week" hint={`${state.input.sessionsPerWeek}`}>
            <input
              type="range"
              min={3}
              max={5}
              step={1}
              value={state.input.sessionsPerWeek}
              onChange={(e) => updateInput("sessionsPerWeek", Number(e.target.value))}
              className={styles.range}
            />
          </Field>

          <Field label="Style">
            <div className={styles.segmented} role="tablist">
              {(["Endurance", "Speedster"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={state.input.style === s}
                  className={`${styles.segment} ${state.input.style === s ? styles.segmentActive : ""}`}
                  onClick={() => updateInput("style", s as Style)}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        <Section num="02" label="Distance allocation">
          <NumericTuning
            label="Long-run fraction"
            hint="Sunday long run as fraction of weekly km"
            value={state.tuning.longRunFraction}
            defaultValue={DEFAULT_TUNING.longRunFraction}
            min={0.2}
            max={0.55}
            step={0.01}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            onChange={(v) => updateTuning("longRunFraction", v)}
          />
          <NumericTuning
            label="Long-run cap (km)"
            hint="Hard ceiling on long-run distance"
            value={state.tuning.longRunCapKm}
            defaultValue={DEFAULT_TUNING.longRunCapKm}
            min={20}
            max={50}
            step={1}
            onChange={(v) => updateTuning("longRunCapKm", v)}
          />
          <NumericTuning
            label="Intensity fraction"
            hint="Speed + tempo volume as fraction of weekly km"
            value={state.tuning.intensityFraction}
            defaultValue={DEFAULT_TUNING.intensityFraction}
            min={0.1}
            max={0.35}
            step={0.01}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            onChange={(v) => updateTuning("intensityFraction", v)}
          />
        </Section>

        <Section num="03" label="Mileage progression">
          <NumericTuning
            label="Weekly growth cap"
            hint="Max week-on-week mileage jump"
            value={state.tuning.weeklyGrowthCap}
            defaultValue={DEFAULT_TUNING.weeklyGrowthCap}
            min={0.02}
            max={0.2}
            step={0.005}
            format={(v) => `${(v * 100).toFixed(1)}%`}
            onChange={(v) => updateTuning("weeklyGrowthCap", v)}
          />
          <NumericTuning
            label="Per-week ceiling"
            hint="Hard per-week multiplier cap"
            value={state.tuning.perWeekGrowthCeiling}
            defaultValue={DEFAULT_TUNING.perWeekGrowthCeiling}
            min={1.02}
            max={1.2}
            step={0.01}
            format={(v) => `×${v.toFixed(2)}`}
            onChange={(v) => updateTuning("perWeekGrowthCeiling", v)}
          />
          <TwoUp>
            <NumericTuning
              label="Deload week 1"
              hint="As fraction of block peak"
              value={state.tuning.deload1Factor}
              defaultValue={DEFAULT_TUNING.deload1Factor}
              min={0.5}
              max={0.95}
              step={0.01}
              format={(v) => `${(v * 100).toFixed(0)}%`}
              onChange={(v) => updateTuning("deload1Factor", v)}
            />
            <NumericTuning
              label="Deload week 2"
              hint="As fraction of block peak"
              value={state.tuning.deload2Factor}
              defaultValue={DEFAULT_TUNING.deload2Factor}
              min={0.4}
              max={0.9}
              step={0.01}
              format={(v) => `${(v * 100).toFixed(0)}%`}
              onChange={(v) => updateTuning("deload2Factor", v)}
            />
          </TwoUp>
          <NumericTuning
            label="Peak weeks / block"
            hint="Weeks held at block max before deload"
            value={state.tuning.peakWeeksPerBlock}
            defaultValue={DEFAULT_TUNING.peakWeeksPerBlock}
            min={1}
            max={4}
            step={1}
            onChange={(v) => updateTuning("peakWeeksPerBlock", v)}
          />
        </Section>

        <Section num="04" label="Block shape">
          <NumericTuning
            label="Deload weeks"
            hint="Tail of each block"
            value={state.tuning.deloadWeeks}
            defaultValue={DEFAULT_TUNING.deloadWeeks}
            min={1}
            max={3}
            step={1}
            onChange={(v) => updateTuning("deloadWeeks", v)}
          />
          <NumericTuning
            label="Taper window (days)"
            hint="Days before race taper kicks in"
            value={state.tuning.taperDays}
            defaultValue={DEFAULT_TUNING.taperDays}
            min={10}
            max={28}
            step={1}
            onChange={(v) => updateTuning("taperDays", v)}
          />
          <TwoUp>
            <NumericTuning
              label="Slack target min"
              hint="Preferred minimum pre-block slack days"
              value={state.tuning.slackTargetMin}
              defaultValue={DEFAULT_TUNING.slackTargetMin}
              min={0}
              max={14}
              step={1}
              onChange={(v) => updateTuning("slackTargetMin", v)}
            />
            <NumericTuning
              label="Slack target max"
              hint="Preferred maximum pre-block slack days"
              value={state.tuning.slackTargetMax}
              defaultValue={DEFAULT_TUNING.slackTargetMax}
              min={2}
              max={21}
              step={1}
              onChange={(v) => updateTuning("slackTargetMax", v)}
            />
          </TwoUp>
        </Section>

        <Section num="05" label="Session-count rules">
          <TwoUp>
            <NumericTuning
              label="Low mileage → 3 sessions"
              hint="Below this weekly km, force 3"
              value={state.tuning.sessionsLowMileageThreshold}
              defaultValue={DEFAULT_TUNING.sessionsLowMileageThreshold}
              min={20}
              max={70}
              step={1}
              onChange={(v) => updateTuning("sessionsLowMileageThreshold", v)}
            />
            <NumericTuning
              label="High mileage → 5"
              hint="Above this weekly km, force 5"
              value={state.tuning.sessionsHighMileageThreshold}
              defaultValue={DEFAULT_TUNING.sessionsHighMileageThreshold}
              min={60}
              max={150}
              step={1}
              onChange={(v) => updateTuning("sessionsHighMileageThreshold", v)}
            />
          </TwoUp>
          <NumericTuning
            label="Bump-to-4 threshold"
            hint="Above this, 3 or 4 → 4"
            value={state.tuning.sessionsBumpMileageThreshold}
            defaultValue={DEFAULT_TUNING.sessionsBumpMileageThreshold}
            min={30}
            max={90}
            step={1}
            onChange={(v) => updateTuning("sessionsBumpMileageThreshold", v)}
          />
        </Section>

        <Section num="06" label="Pace progression">
          <NumericTuning
            label="Pace uplift increment (s)"
            hint="Seconds between pace-index steps"
            value={state.tuning.paceUpliftSeconds}
            defaultValue={DEFAULT_TUNING.paceUpliftSeconds}
            min={120}
            max={1200}
            step={30}
            onChange={(v) => updateTuning("paceUpliftSeconds", v)}
          />
        </Section>

        <div className={styles.actions}>
          <button type="button" className={styles.actionSecondary} onClick={resetTuning}>
            Reset tuning
          </button>
          <button type="button" className={styles.actionGhost} onClick={resetAll}>
            Reset all
          </button>
        </div>
      </aside>

      <main className={styles.canvas}>
        {result.ok && plan ? (
          <Visualisations plan={plan} tuning={state.tuning} />
        ) : (
          <div className={styles.errorCard}>
            <div className={styles.errorLabel}>Generator error</div>
            <div className={styles.errorMsg}>
              {!result.ok ? result.error : ""}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Section({
  num,
  label,
  children,
}: {
  num: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <span className={styles.sectionNum}>{num}</span>
        <span className={styles.sectionLabel}>{label}</span>
        <span className={styles.sectionRule} aria-hidden />
      </header>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldRow}>
        <span className={styles.fieldLabel}>{label}</span>
        {hint !== undefined && <span className={styles.fieldHint}>{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function TwoUp({ children }: { children: React.ReactNode }) {
  return <div className={styles.twoUp}>{children}</div>;
}

function NumericTuning({
  label,
  hint,
  value,
  defaultValue,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const formatted = format ? format(value) : step < 1 ? value.toFixed(2) : String(value);
  const modified = value !== defaultValue;
  return (
    <div className={`${styles.field} ${modified ? styles.fieldModified : ""}`}>
      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>
          {label}
          {modified && <span className={styles.modDot} aria-label="modified" />}
        </span>
        <span className={styles.fieldValue}>{formatted}</span>
      </div>
      {hint && <div className={styles.fieldHintLine}>{hint}</div>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={styles.range}
      />
    </div>
  );
}
