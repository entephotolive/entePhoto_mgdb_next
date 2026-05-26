"use server";

import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db/mongodb";

export type ApprovalFilter = "all" | "approved" | "pending";

/**
 * Fetch a page of users with optional approval filter.
 *
 * Uses the native MongoDB driver to correctly query the `isApproved` field
 * even on legacy documents where the field is absent (treated as falsy = pending).
 */
export async function fetchUsersPage(
  page: number,
  limit: number = 20,
  filter: ApprovalFilter = "all"
) {
  const conn = await connectToDatabase();
  const collection = conn.connection.collection("users");

  // Treat documents where isApproved is missing (undefined/null) as "pending"
  const query: Record<string, unknown> = {};
  if (filter === "approved") {
    query.isApproved = true;
  } else if (filter === "pending") {
    // Match documents where isApproved is false OR the field doesn't exist
    query.$or = [{ isApproved: false }, { isApproved: { $exists: false } }];
  }

  const skip = (page - 1) * limit;

  const users = await collection
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  return users.map((user) => ({
    _id: user._id.toString(),
    name: user.name as string | undefined,
    email: user.email as string,
    avatarUrl: (user.avatarUrl as string | undefined) ?? null,
    phoneNumber: (user.phoneNumber as string | undefined) ?? null,
    studioName: (user.studioName as string | undefined) ?? null,
    studioLocation: (user.studioLocation as string | undefined) ?? null,
    specializations: (user.specializations as string[] | undefined) ?? [],
    isApproved: (user.isApproved as boolean | undefined) ?? false,
    provider: (user.provider as string | undefined) ?? "google",
    createdAt: user.createdAt
      ? new Date(user.createdAt as string | Date).toISOString()
      : null,
  }));
}

/**
 * Approve or revoke a photographer's access.
 * Uses native driver to guarantee the field is written correctly.
 */
export async function updateUserApproval(userId: string, isApproved: boolean) {
  const conn = await connectToDatabase();
  const collection = conn.connection.collection("users");

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    { $set: { isApproved, updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!result) throw new Error("User not found");

  return {
    success: true,
    isApproved: (result.isApproved as boolean | undefined) ?? false,
  };
}

/**
 * Get basic statistics for a photographer (counts + latest events).
 * Uses the same dual-collection count method as dashboard.service
 * to correctly capture both photos and face-detected images.
 */
export async function getPhotographerOverview(userId: string) {
  const conn = await connectToDatabase();
  const db = conn.connection.db;
  if (!db) throw new Error("Database not connected");

  const userObjectId = new ObjectId(userId);

  // 1. Get all event IDs for this photographer
  const userEvents = await db
    .collection("events")
    .find({ createdBy: userObjectId }, { projection: { _id: 1 } })
    .toArray();

  const eventObjectIds = userEvents.map((e) => e._id);
  const eventStringIds = eventObjectIds.map((id) => id.toString());

  // 2. Count photos across both collections (same as dashboard.service)
  // Events can store eventId as ObjectId or string — match both formats
  const eventFilter =
    eventObjectIds.length > 0
      ? {
          $or: [
            { eventId: { $in: eventObjectIds } },
            { event_id: { $in: eventObjectIds } },
            { eventId: { $in: eventStringIds } },
            { event_id: { $in: eventStringIds } },
          ],
        }
      : { _id: null }; // no events = no photos

  const [photosCount, facesCount] = await Promise.all([
    db.collection("photos").countDocuments(eventFilter),
    db.collection("image_with_face").countDocuments(eventFilter),
  ]);

  const totalPhotos = photosCount + facesCount;
  const totalEvents = userEvents.length;

  // 3. Latest 5 events
  const latestEvents = await db
    .collection("events")
    .find({ createdBy: userObjectId })
    .sort({ date: -1 })
    .limit(5)
    .toArray();

  const photosColl = db.collection("photos");
  const facesColl = db.collection("image_with_face");

  const latestEventsWithCounts = await Promise.all(
    latestEvents.map(async (e) => {
      const eventIdStr = e._id.toString();
      const eventIdObj = e._id;

      const filter = {
        $or: [
          { eventId: eventIdStr },
          { event_id: eventIdStr },
          { eventId: eventIdObj },
          { event_id: eventIdObj },
        ],
      };

      const [pCount, fCount] = await Promise.all([
        photosColl.countDocuments(filter),
        facesColl.countDocuments(filter),
      ]);

      return {
        _id: eventIdStr,
        title: e.title as string,
        date: e.date instanceof Date ? e.date.toISOString() : (e.date as string),
        photoCount: pCount + fCount,
        location: (e.location as string) || "Unknown",
      };
    })
  );

  return {
    totalPhotos,
    totalEvents,
    latestEvents: latestEventsWithCounts,
  };
}

/**
 * Get full history and profile details for a photographer.
 * Returns ALL events (no limit).
 */
export async function getPhotographerFullDetails(userId: string) {
  const conn = await connectToDatabase();
  const db = conn.connection.db;
  if (!db) throw new Error("Database not connected");

  const userObjectId = new ObjectId(userId);

  // All events — no limit
  const allEvents = await db
    .collection("events")
    .find({ createdBy: userObjectId })
    .sort({ date: -1 })
    .toArray();

  const photosColl = db.collection("photos");
  const facesColl = db.collection("image_with_face");

  // Fetch accurate counts for each event
  const eventsWithCounts = await Promise.all(
    allEvents.map(async (e) => {
      const eventIdStr = e._id.toString();
      const eventIdObj = e._id;

      const filter = {
        $or: [
          { eventId: eventIdStr },
          { event_id: eventIdStr },
          { eventId: eventIdObj },
          { event_id: eventIdObj },
        ],
      };

      const [pCount, fCount] = await Promise.all([
        photosColl.countDocuments(filter),
        facesColl.countDocuments(filter),
      ]);

      return {
        _id: eventIdStr,
        title: e.title as string,
        date: e.date instanceof Date ? e.date.toISOString() : (e.date as string),
        photoCount: pCount + fCount,
        location: (e.location as string) || "Unknown",
      };
    })
  );

  const user = await db.collection("users").findOne({ _id: userObjectId });

  return {
    events: eventsWithCounts,
    profile: {
      bio: (user?.bio as string) || "",
      studioName: (user?.studioName as string) || "",
      studioLocation: (user?.studioLocation as string) || "",
      specializations: (user?.specializations as string[]) || [],
      joinedAt:
        user?.createdAt instanceof Date
          ? user.createdAt.toISOString()
          : null,
    },
  };
}
