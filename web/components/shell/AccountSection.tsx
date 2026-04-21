import { signOutAction } from "@/app/actions/auth";
import styles from "./AccountSection.module.scss";

type Props = {
  name?: string | null;
  image?: string | null;
  athleteId?: string | null;
};

export function AccountSection({ name, image, athleteId }: Props) {
  return (
    <section className={styles.account} aria-labelledby="account-heading">
      <div className={styles.sectionTitle} id="account-heading">
        Account
      </div>
      <div className={styles.card}>
        <div className={styles.identity}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className={styles.avatar} />
          ) : (
            <div className={styles.avatarFallback} aria-hidden />
          )}
          <div className={styles.text}>
            <p className={styles.name}>{name ?? "Athlete"}</p>
            {athleteId && (
              <p className={styles.meta}>Strava · athlete {athleteId}</p>
            )}
          </div>
        </div>
        <form action={signOutAction}>
          <button type="submit" className={styles.signOut}>
            Sign out
          </button>
        </form>
      </div>
    </section>
  );
}
