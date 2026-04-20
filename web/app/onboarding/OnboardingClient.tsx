"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { generatePlanAction } from "@/app/actions/plans";
import styles from "./onboarding.module.scss";
import {
  StepDate,
  StepDays,
  StepDone,
  StepExperience,
  StepGenerating,
  StepGoal,
  StepMotivation,
  StepRace,
  StepRecent,
  StepReview,
  StepVolume,
  StepWelcome,
} from "./steps";
import {
  type OnboardingAnswers,
  estimateTargetVolume,
  formatHMS,
  goalToTargetSeconds,
  recentToMarathonSeconds,
} from "./utils";

const STEPS = [
  "welcome",
  "experience",
  "motivation",
  "race",
  "date",
  "volume",
  "recent",
  "goal",
  "days",
  "review",
  "generating",
  "done",
] as const;
type StepId = (typeof STEPS)[number];
const PROGRESS_TOTAL = 9;

const STORAGE_KEY = "watto.onboarding.v1";

export function OnboardingClient({ minRaceDate }: { minRaceDate: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [state, setState] = useState<{ step: number; answers: OnboardingAnswers }>(
    () => {
      if (typeof window === "undefined") return { step: 0, answers: {} };
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            step?: number;
            answers?: OnboardingAnswers;
          };
          return {
            step: typeof parsed.step === "number" ? parsed.step : 0,
            answers: parsed.answers ?? {},
          };
        }
      } catch {}
      return { step: 0, answers: {} };
    },
  );
  const { step, answers } = state;
  const setStep = (
    updater: number | ((prev: number) => number),
  ) =>
    setState((s) => ({
      ...s,
      step: typeof updater === "function" ? updater(s.step) : updater,
    }));
  const setAnswers = (
    updater: OnboardingAnswers | ((prev: OnboardingAnswers) => OnboardingAnswers),
  ) =>
    setState((s) => ({
      ...s,
      answers: typeof updater === "function" ? updater(s.answers) : updater,
    }));

  const [direction, setDirection] = useState<"fwd" | "back">("fwd");

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const id: StepId = STEPS[step];

  function next() {
    setDirection("fwd");
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }
  function back() {
    setDirection("back");
    setStep((s) => Math.max(0, s - 1));
  }
  function jump(s: number) {
    setDirection(s > step ? "fwd" : "back");
    setStep(s);
  }
  function update<K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  const estimateSec = useMemo(
    () => (answers.recent ? recentToMarathonSeconds(answers.recent) : null),
    [answers.recent],
  );

  async function submit() {
    setSubmitError(null);
    if (
      !answers.raceDate ||
      !answers.volume ||
      !answers.days ||
      !answers.goal ||
      !estimateSec
    ) {
      setSubmitError("Missing answers — scroll back and fill the gaps.");
      return;
    }
    const currentSec = estimateSec;
    const targetSec = goalToTargetSeconds(answers.goal, currentSec);
    const targetVolume = estimateTargetVolume(answers.volume, answers.days);

    const style =
      answers.goal.type === "finish" || answers.experience === "never"
        ? "Endurance"
        : "Speedster";

    const input = {
      raceDate: answers.raceDate,
      sessionsPerWeek: answers.days,
      currentMileage: answers.volume,
      targetMileage: targetVolume,
      currentPace: formatHMS(currentSec),
      targetPace: formatHMS(targetSec),
      raceDistance: "Marathon",
      style,
    } as const;

    startTransition(async () => {
      const result = await generatePlanAction(input);
      if (!result.ok) {
        setSubmitError(result.error);
        jump(STEPS.indexOf("review"));
        return;
      }
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      jump(STEPS.indexOf("done"));
      // small delay so the "done" celebration shows before routing
      setTimeout(() => router.push(`/plans/${result.planId}`), 2400);
    });
  }

  const progressIdx = Math.min(PROGRESS_TOTAL - 1, step);

  const screen = (() => {
    const common = { onNext: next, onBack: back };
    switch (id) {
      case "welcome":
        return <StepWelcome onNext={next} />;
      case "experience":
        return (
          <StepExperience
            {...common}
            value={answers.experience}
            onChange={(v) => update("experience", v)}
          />
        );
      case "motivation":
        return (
          <StepMotivation
            {...common}
            value={answers.motivation}
            onChange={(v) => update("motivation", v)}
          />
        );
      case "race":
        return (
          <StepRace
            {...common}
            value={answers.race}
            onChange={(v) => update("race", v)}
          />
        );
      case "date":
        return (
          <StepDate
            {...common}
            value={answers.raceDate}
            min={minRaceDate}
            onChange={(v) => update("raceDate", v)}
          />
        );
      case "volume":
        return (
          <StepVolume
            {...common}
            value={answers.volume}
            experience={answers.experience}
            onChange={(v) => update("volume", v)}
          />
        );
      case "recent":
        return (
          <StepRecent
            {...common}
            value={answers.recent}
            onChange={(v) => update("recent", v)}
          />
        );
      case "goal":
        return (
          <StepGoal
            {...common}
            value={answers.goal}
            estimateSec={estimateSec ?? null}
            onChange={(v) => update("goal", v)}
          />
        );
      case "days":
        return (
          <StepDays
            {...common}
            value={answers.days}
            onChange={(v) => update("days", v)}
          />
        );
      case "review":
        return (
          <StepReview
            onBack={back}
            onSubmit={submit}
            answers={answers}
            estimateSec={estimateSec ?? null}
            pending={pending}
            error={submitError}
          />
        );
      case "generating":
        return <StepGenerating />;
      case "done":
        return <StepDone />;
    }
  })();

  const showProgress = step > 0 && step < STEPS.indexOf("generating");

  return (
    <div className={styles.root}>
      <div className={styles.bgOrbA} aria-hidden />
      <div className={styles.bgOrbB} aria-hidden />
      <div className={styles.bgGrain} aria-hidden />

      <header className={styles.topBar}>
        <div className={styles.mark}>
          Watto<span>.</span>
        </div>
        {showProgress ? (
          <div className={styles.progress} role="progressbar" aria-valuenow={progressIdx + 1} aria-valuemin={1} aria-valuemax={PROGRESS_TOTAL}>
            {Array.from({ length: PROGRESS_TOTAL }).map((_, i) => (
              <span
                key={i}
                className={`${styles.progressDot} ${i <= progressIdx ? styles.progressDotOn : ""}`}
              />
            ))}
          </div>
        ) : (
          <span className={styles.topSpacer} aria-hidden />
        )}
      </header>

      <main className={styles.stage}>
        <section
          key={id}
          className={`${styles.screen} ${direction === "fwd" ? styles.enterFwd : styles.enterBack}`}
        >
          {screen}
        </section>
      </main>
    </div>
  );
}
