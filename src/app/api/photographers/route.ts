import { NextResponse } from "next/server";
import { requireSession } from "@/lib/services/auth.service";
import { listPhotographers } from "@/lib/services/photographer.service";

export async function GET() {
  try {
    await requireSession();
    const photographers = await listPhotographers();

    return NextResponse.json({ data: photographers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load photographers.";
    const status = message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ message }, { status });
  }
}
