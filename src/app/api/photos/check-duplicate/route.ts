import { NextResponse } from "next/server";
import { requireSession } from "@/lib/services/auth.service";
import { connectToDatabase } from "@/lib/db/mongodb";
import mongoose from "mongoose";

export async function POST(request: Request) {
  try {
    await requireSession();
    const payload = await request.json();
    const { eventId, filenames } = payload;
    
    if (!eventId || !filenames || !Array.isArray(filenames)) {
       return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const conn = await connectToDatabase();
    const db = conn.connection.db;
    
    if (!db) {
        throw new Error("Database connection not ready");
    }

    const eventObjectId = new mongoose.Types.ObjectId(eventId);

    // Check in 'photos' collection
    const duplicatePhotos = await db.collection("photos").find({
      event_id: eventObjectId,
      image_name: { $in: filenames }
    }).project({ image_name: 1 }).toArray();

    // Check in 'image_with_face' collection
    const duplicateImageWithFace = await db.collection("image_with_face").find({
      event_id: eventObjectId,
      image_name: { $in: filenames }
    }).project({ image_name: 1 }).toArray();
    
    const duplicates = new Set([
      ...duplicatePhotos.map(d => d.image_name),
      ...duplicateImageWithFace.map(d => d.image_name)
    ]);

    return NextResponse.json(
      { duplicates: Array.from(duplicates) },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to check duplicates.";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ message }, { status });
  }
}
