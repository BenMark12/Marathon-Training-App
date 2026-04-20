import styles from "./Section.module.scss";

export function Section({
  title,
  accessory,
  children,
}: {
  title: string;
  accessory?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {accessory}
      </header>
      {children}
    </section>
  );
}
