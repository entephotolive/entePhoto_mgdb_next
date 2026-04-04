import { NextResponse } from "next/server";
import { getDashboardSnapshot } from "@/lib/services/dashboard.service";

export async function GET() {
  try {
    const snapshot = await getDashboardSnapshot();
    return NextResponse.json({ data: snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load dashboard.";
    return NextResponse.json({ message }, { status: 401 });
  }
}
