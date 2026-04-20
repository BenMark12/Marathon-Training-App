import { auth } from "@/auth";
import { AppShell } from "@/components/shell/AppShell";
import { BottomNav } from "@/components/shell/BottomNav";
import { listPlans } from "@/lib/storage/plans";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user?.athleteId;
  const plans = userId ? await listPlans(userId) : [];
  const singlePlanId = plans.length === 1 ? plans[0].planId : undefined;

  return (
    <>
      <AppShell>{children}</AppShell>
      <BottomNav singlePlanId={singlePlanId} />
    </>
  );
}
