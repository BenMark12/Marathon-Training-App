"use client";

import { useRouter } from "next/navigation";
import { type MouseEvent, useTransition } from "react";
import { deletePlanAction } from "@/app/actions/plans";
import styles from "./DeletePlanButton.module.scss";

type Props = {
  planId: string;
  planLabel: string;
  variant?: "full" | "icon";
  redirectTo?: string;
};

export function DeletePlanButton({
  planId,
  planLabel,
  variant = "full",
  redirectTo,
}: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Delete "${planLabel}"? This will remove the plan and its completions. This cannot be undone.`,
      );
      if (!confirmed) return;
    }
    startTransition(async () => {
      await deletePlanAction(planId);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        className={styles.iconBtn}
        onClick={onClick}
        disabled={pending}
        aria-label={`Delete ${planLabel}`}
        title="Delete plan"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={styles.fullBtn}
      onClick={onClick}
      disabled={pending}
    >
      {pending ? "Deleting…" : "Delete plan"}
    </button>
  );
}
