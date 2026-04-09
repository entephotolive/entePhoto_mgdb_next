import { NextResponse } from "next/server";
import { cleanupExpiredEvents } from "@/lib/services/event.service";

export async function GET(request: Request) {
  // Optional but recommended: Secure the cron route by checking an authorization header
  // so random users can't manually trigger your database cleanup.
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deletedCount = await cleanupExpiredEvents();
    
    console.log(`[CRON] Cleanup complete. Deleted ${deletedCount} expired events.`);
    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    console.error("[CRON] Failed to cleanup expired events:", error);
    return NextResponse.json({ success: false, error: "Cleanup failed" }, { status: 500 });
  }
}
