import { auth } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Dashboard</h1>
      <p>
        Signed in as <strong>{session?.user?.name ?? "unknown"}</strong>{" "}
        (athlete {session?.user?.athleteId ?? "—"}).
      </p>
      <p>Plan list and weekly view land in Phase 3 / Phase 4.</p>
    </main>
  );
}
