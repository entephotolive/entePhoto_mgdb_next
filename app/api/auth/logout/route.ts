import { NextResponse } from "next/server";
import { destroySession } from "@/lib/services/auth.service";

export async function POST() {
  await destroySession();
  return NextResponse.json({ message: "Signed out successfully." });
}
