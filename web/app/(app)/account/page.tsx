import { auth } from "@/auth";
import { AccountSection } from "@/components/shell/AccountSection";
import { EmailPreferences } from "@/components/shell/EmailPreferences";
import { requireUserId } from "@/lib/auth/session";
import { getPreferences } from "@/lib/storage/preferences";
import styles from "./page.module.scss";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized — no signed-in user");

  const userId = await requireUserId();
  const prefs = await getPreferences(userId);

  return (
    <>
      <header className={styles.header}>
        <h1>Account</h1>
      </header>
      <AccountSection
        name={session.user.name}
        image={session.user.image}
        athleteId={session.user.athleteId}
      />
      <EmailPreferences
        initialEmail={prefs?.email ?? ""}
        initialOptIn={prefs?.weeklyEmailOptIn ?? false}
      />
    </>
  );
}
