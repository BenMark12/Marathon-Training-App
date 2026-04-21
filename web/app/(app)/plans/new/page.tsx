import type { Metadata } from "next";
import Link from "next/link";
import { PlanForm } from "./PlanForm";
import styles from "./page.module.scss";

export const metadata: Metadata = {
  title: "New plan",
};

export default function NewPlanPage() {
  // Server Component; Date.now() is fine here and re-evaluated on every request.
  // eslint-disable-next-line react-hooks/purity
  const minRaceDate = new Date(Date.now() + 56 * 86_400_000)
    .toISOString()
    .split("T")[0];
  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1>New plan</h1>
          <p>Tell Watto about your race and Watto builds the block structure.</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/illustrations/undraw_time-change_lyxp.svg"
          alt=""
          className={styles.headerArt}
        />
      </header>
      <Link href="/onboarding" className={styles.onboardingLink}>
        <span>
          New to marathons? <strong>Try the guided walkthrough</strong>
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      <PlanForm minRaceDate={minRaceDate} />
    </>
  );
}
