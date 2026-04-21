import Link from "next/link";
import styles from "./AppShell.module.scss";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.logo}>
          Watto<span>.</span>
        </Link>
        <p className={styles.strapline}>Marathon training, tuned to you</p>
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
