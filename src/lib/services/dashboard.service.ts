import { requireSession } from "@/lib/services/auth.service";
import { listEvents } from "@/lib/services/event.service";
import { listGalleryFolders } from "@/lib/services/photo.service";
import { fetchProfileById } from "@/lib/services/profile.service";
import { connectToDatabase } from "@/lib/db/mongodb";
import { PhotoModel } from "@/models/Photo";
import { DashboardSnapshot } from "@/types";
import mongoose from "mongoose";

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const session = await requireSession();
  const userId = session.id;

  const conn = await connectToDatabase();
  const db = conn.connection.db;
  if (!db) throw new Error("Database not connected");

  const [events, folders, profile] = await Promise.all([
    listEvents(userId),
    listGalleryFolders(userId),
    fetchProfileById(userId),
  ]);

  const eventIds = events.map((e) => e.id);
  const eventObjectIds = eventIds.map((id) =>
    mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null
  ).filter(Boolean);

  const photosColl = db.collection("photos");
  const facesColl = db.collection("image_with_face");

  // Comprehensive filter matching both string and ObjectId formats
  const eventFilter = {
    $or: [
      { eventId: { $in: eventIds } },
      { event_id: { $in: eventIds } },
      { eventId: { $in: eventObjectIds } },
      { event_id: { $in: eventObjectIds } },
    ],
  };

  const [totalPhotos, totalFaces] = await Promise.all([
    photosColl.countDocuments(eventFilter),
    facesColl.countDocuments(eventFilter),
  ]);

  const photoUploadCount = totalPhotos + totalFaces;

  // Fetch photo counts for the most recent events (already provided by listEvents)
  const recentEventsWithCounts = events.slice(0, 5);

  return {
    metrics: [
      {
        label: "My Events",
        value: String(events.length),
        delta: "Total events created",
      },
      {
        label: "Gallery Folders",
        value: String(folders.length),
        delta: "Folders organized",
      },
      {
        label: "Total Photos",
        value: String(photoUploadCount),
        delta: "Captured across all events",
      },
    ],
    recentEvents: recentEventsWithCounts,
    galleryFolders: folders,
    profile,
  };
}

