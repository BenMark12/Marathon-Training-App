"use client";

import { useState, useTransition } from "react";
import { updatePreferencesAction } from "@/app/actions/preferences";
import styles from "./EmailPreferences.module.scss";

type Props = {
  initialEmail: string;
  initialOptIn: boolean;
};

export function EmailPreferences({ initialEmail, initialOptIn }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [optIn, setOptIn] = useState(initialOptIn);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    { kind: "ok"; message: string } | { kind: "err"; message: string } | null
  >(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus(null);
    startTransition(async () => {
      const result = await updatePreferencesAction({
        email: email.trim(),
        weeklyEmailOptIn: optIn,
      });
      if (result.ok) {
        setStatus({ kind: "ok", message: "Saved." });
      } else {
        setStatus({ kind: "err", message: result.error });
      }
    });
  };

  return (
    <section className={styles.section} aria-labelledby="email-prefs-heading">
      <div className={styles.sectionTitle} id="email-prefs-heading">
        Weekly email
      </div>
      <form className={styles.card} onSubmit={onSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email-input">
            Email address
          </label>
          <input
            id="email-input"
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <span className={styles.hint}>
            Strava doesn&apos;t share your email, so we need it from you directly.
          </span>
        </div>

        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
          />
          <span>Send me this week&apos;s plan every Sunday evening</span>
        </label>

        <div className={styles.actions}>
          <button type="submit" className={styles.save} disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </button>
          {status && (
            <span
              className={`${styles.status} ${
                status.kind === "err" ? styles.error : ""
              }`}
              role="status"
            >
              {status.message}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
