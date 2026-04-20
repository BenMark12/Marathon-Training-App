"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { hasLegacyData } from "@/lib/migrate/legacy";
import styles from "./MigrationBanner.module.scss";

export function MigrationBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Read localStorage once on mount; SSR doesn't have access.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(hasLegacyData());
  }, []);

  if (!show) return null;

  return (
    <aside className={styles.banner}>
      <p>Plans from the old app are still in this browser.</p>
      <Link href="/migrate">Import →</Link>
    </aside>
  );
}
