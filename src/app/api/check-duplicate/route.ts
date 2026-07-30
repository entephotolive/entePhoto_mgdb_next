import { NextResponse } from "next/server";
import { requireSession } from "@/lib/services/auth.service";
import { connectToDatabase } from "@/lib/db/mongodb";
import mongoose from "mongoose";

export async function POST(request: Request) {
  try {
    await requireSession();
    const payload = await request.json();
    const { eventId, filenames } = payload;
    
    if (!eventId || !filenames || !Array.isArray(filenames) || filenames.length === 0) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const conn = await connectToDatabase();
    const db = conn.connection.db;
    
    if (!db) {
      throw new Error("Database connection not ready");
    }

    // Support both Mongo ObjectId and string event_id formats
    const eventIdFilter = mongoose.Types.ObjectId.isValid(eventId)
      ? { $in: [new mongoose.Types.ObjectId(eventId), String(eventId)] }
      : String(eventId);

    // Map lowercase base stems to requested filenames and build extension-agnostic regexes
    const stemToRequestedName = new Map<string, string>();
    const searchConditions: Array<{ image_name: { $regex: RegExp } }> = [];

    filenames.forEach((filename: string) => {
      if (typeof filename !== "string" || !filename.trim()) return;
      const baseStem = filename.replace(/\.[^/.]+$/, "");
      const lowerStem = baseStem.toLowerCase();
      stemToRequestedName.set(lowerStem, filename);

      // Escape special regex characters in the base stem
      const escapedStem = baseStem.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      // Matches stem with any extension (e.g. .jpg, .heic, .png, .jpeg) or no extension, case-insensitively
      searchConditions.push({
        image_name: { $regex: new RegExp(`^${escapedStem}(\\.[a-zA-Z0-9]+)?$`, "i") },
      });
    });

    if (searchConditions.length === 0) {
      return NextResponse.json({ isDuplicate: false, duplicates: [], results: {} }, { status: 200 });
    }

    const query = {
      event_id: eventIdFilter,
      $or: searchConditions,
    };

    // Query 'photos' and 'image_with_face' collections in parallel
    const [duplicatePhotos, duplicateImageWithFace] = await Promise.all([
      db.collection("photos").find(query).project({ image_name: 1 }).toArray(),
      db.collection("image_with_face").find(query).project({ image_name: 1 }).toArray(),
    ]);
    
    const duplicateSet = new Set<string>();

    const processDoc = (doc: { image_name?: string }) => {
      if (!doc.image_name) return;
      const dbStem = doc.image_name.replace(/\.[^/.]+$/, "").toLowerCase();
      // Match all requested filenames that share this stem
      filenames.forEach((requestedName: string) => {
        if (typeof requestedName !== "string") return;
        const reqStem = requestedName.replace(/\.[^/.]+$/, "").toLowerCase();
        if (reqStem === dbStem) {
          duplicateSet.add(requestedName);
        }
      });
    };

    duplicatePhotos.forEach(processDoc);
    duplicateImageWithFace.forEach(processDoc);

    const results: Record<string, boolean> = {};
    filenames.forEach((name: string) => {
      if (typeof name === "string") {
        results[name] = duplicateSet.has(name);
      }
    });

    const duplicates = Array.from(duplicateSet);
    const isDuplicate = duplicates.length > 0;

    return NextResponse.json(
      {
        isDuplicate,
        duplicates,
        results,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to check duplicates.";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ message }, { status });
  }
}
