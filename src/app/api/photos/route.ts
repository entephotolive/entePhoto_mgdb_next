import { NextResponse } from "next/server";
import { requireSession } from "@/lib/services/auth.service";
import { createPhoto } from "@/lib/services/photo.service";
import { PhotoModel } from "@/models/Photo";


export async function POST(request: Request) {
  try {
    await requireSession();
    const payload = await request.json();
    console.log("PLAYLOAD -------------", payload);
    console.log("payloadLDFNMLDFJ-----------------")
    const photo = await createPhoto(payload);

    return NextResponse.json({ message: "Photo registered.", data: photo }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to register photo.";
    const status = message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ message }, { status });
  }
}
