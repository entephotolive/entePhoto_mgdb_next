import { NextResponse } from "next/server";
import { requireSession } from "@/lib/services/auth.service";
import { connectToDatabase } from "@/lib/db/mongodb";
import { PhotoModel } from "@/models/Photo";

export async function POST(request: Request) {
  try {
    await requireSession();
    await connectToDatabase();
    
    const { hash } = await request.json();

    if (!hash) {
      return NextResponse.json({ message: "Hash is required" }, { status: 400 });
    }

    const existing = await PhotoModel.findOne({ hash });

    if (existing) {
      return NextResponse.json({ exists: true });
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to check photo duplication.";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ message }, { status });
  }
}
