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
      <h1>Flow</h1>
      <p>Marathon training plans tuned to your race date, pace, and mileage.</p>
      {session?.user ? (
        <Link href="/dashboard" className={styles.cta}>
          Go to dashboard
        </Link>
      ) : (
        <form action={connectStrava}>
          <button type="submit" className={styles.cta}>
            Connect Strava
          </button>
        </form>
      )}
    </main>
  );
}
