import { auth } from "@/auth";

export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.athleteId;
  if (!userId) {
    throw new Error("Unauthorized — no signed-in user");
  }
  return userId;
}
