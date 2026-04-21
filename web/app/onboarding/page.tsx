import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OnboardingClient } from "./OnboardingClient";

export const metadata: Metadata = {
  title: "Start your plan",
};

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  // Server Component; Date.now() is fine here and re-evaluated on every request.
  // eslint-disable-next-line react-hooks/purity
  const minRaceDate = new Date(Date.now() + 56 * 86_400_000)
    .toISOString()
    .split("T")[0];

  return <OnboardingClient minRaceDate={minRaceDate} />;
}
