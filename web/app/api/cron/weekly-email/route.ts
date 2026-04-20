import { NextResponse } from "next/server";
import { sendWeeklyEmailsForAllUsers } from "@/lib/email/sendWeeklyEmails";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Weekly-plan email cron.
 *
 * Triggered on Sundays at 18:00 UTC by Vercel Cron (see `vercel.json`).
 * Vercel attaches `Authorization: Bearer $CRON_SECRET` when invoking cron
 * routes — we reject requests that don't match. We also accept a matching
 * `x-cron-secret` header so the job can be driven manually.
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  if (request.headers.get("x-cron-secret") === secret) return true;
  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await sendWeeklyEmailsForAllUsers();
  return NextResponse.json({ ok: true, ...summary });
}

export async function POST(request: Request) {
  return GET(request);
}
