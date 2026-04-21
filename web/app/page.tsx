import Link from "next/link";
import { auth, signIn } from "@/auth";
import styles from "./page.module.scss";

export default async function LandingPage() {
  const session = await auth();

  async function connectStrava() {
    "use server";
    await signIn("strava", { redirectTo: "/dashboard" });
  }

  return (
    <main className={styles.main}>
      <figure className={styles.illustration} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/illustrations/undraw_running-wild_jnn2.svg" alt="" />
      </figure>
      <section className={styles.hero}>
        <div className={styles.mark}>
          Watto<span>.</span>
        </div>
        <h1 className={styles.lede}>
          Marathon training plans, shaped around your race.
        </h1>
        <p className={styles.sub}>
          Pick a race date, your current weekly mileage and pace, and your target.
          Watto builds an adaptive block-periodised plan and keeps it in sync with
          your Strava.
        </p>

        {session?.user ? (
          <div className={styles.signedIn}>
            <span>Signed in as {session.user.name ?? "athlete"}.</span>
            <Link href="/dashboard" className={styles.cta}>
              Open dashboard
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        ) : (
          <form action={connectStrava}>
            <button type="submit" className={styles.cta}>
              Connect with Strava
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        )}
      </section>

      <dl className={styles.meta}>
        <div className={styles.tile}>
          <dt>Structure</dt>
          <dd>Pyramidal blocks</dd>
        </div>
        <div className={styles.tile}>
          <dt>Growth</dt>
          <dd>≤10% / week</dd>
        </div>
        <div className={styles.tile}>
          <dt>Taper</dt>
          <dd>17 days</dd>
        </div>
      </dl>
    </main>
  );
}
