import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/services/auth.service";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user: session });
}
