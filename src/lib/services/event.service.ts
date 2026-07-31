import { z } from "zod";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { EventModel } from "@/models/Event";
import { PhotoModel } from "@/models/Photo";
import { FolderModel } from "@/models/Folder";
import { EventListItem } from "@/types";
import { createFolder } from "@/lib/services/folder.service";


const eventInputSchema = z.object({
  title: z.string().min(3),
  date: z.string().datetime(),
  location: z.string().min(2),
  createdBy: z.string().min(1),
});

export async function listEvents(userId: string) {
  const conn = await connectToDatabase();
  const db = conn.connection.db;
  if (!db) return [];

  const query = { createdBy: userId };

  const events = await EventModel.find(query)
    .populate("createdBy", "name")
    .sort({ date: 1 })
    .lean();

  const photosColl = db.collection("photos");
  const facesColl = db.collection("image_with_face");
  const scansColl = db.collection("guest_scans");

  const eventsWithCounts = await Promise.all(
    events.map(async (event) => {
      const eventIdStr = event._id.toString();
      const eventIdObj = event._id;

      const filter = {
        $or: [
          { eventId: eventIdStr },
          { event_id: eventIdStr },
          { eventId: eventIdObj },
          { event_id: eventIdObj },
        ],
      };

      const [pCount, fCount, totalScans, uniqueAttendees] = await Promise.all([
        photosColl.countDocuments(filter),
        facesColl.countDocuments(filter),
        scansColl.countDocuments(filter),
        scansColl.distinct("attendeeId", filter),
      ]);

      return {
        id: eventIdStr,
        title: event.title,
        date: event.date.toISOString(),
        location: event.location,
        photoCount: pCount + fCount,
        totalScans,
        uniqueScans: uniqueAttendees.length,
        createdBy: {
          id: (event.createdBy as any)?._id?.toString?.() ?? userId,
          name: (event.createdBy as any)?.name ?? "Unknown",
        },
      };
    }),
  );

  return eventsWithCounts as EventListItem[];
}

export async function createEvent(input: unknown) {
  const payload = eventInputSchema.parse(input);
  await connectToDatabase();

  const event = await EventModel.create({
    ...payload,
    date: new Date(payload.date),
  });

  // Automatically create the Cover Photo folder
  await createFolder("Cover Photo", event._id.toString(), payload.createdBy);

  return {
    id: event._id.toString(),
    title: event.title,
    date: event.date.toISOString(),
    location: event.location,
    photoCount: 0,
    totalScans: 0,
    uniqueScans: 0,
    createdBy: {
      id: event.createdBy.toString(),
      name: "Assigned User",
    },
  } satisfies EventListItem;
}

/**
 * Fetch a single event by its ID.
 * Returns null if the ID is not a valid ObjectId or the event does not exist.
 * Throws on database errors.
 */
export async function getEventById(eventId: string): Promise<EventListItem | null> {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return null;
  }

  const conn = await connectToDatabase();
  const db = conn.connection.db;

  const event = await EventModel.findById(eventId)
    .populate("createdBy", "name")
    .lean();

  if (!event) {
    return null;
  }

  const eventIdStr = event._id.toString();
  const eventIdObj = event._id;

  const filter = {
    $or: [
      { eventId: eventIdStr },
      { event_id: eventIdStr },
      { eventId: eventIdObj },
      { event_id: eventIdObj },
    ],
  };

  let photoCount = 0;
  let totalScans = 0;
  let uniqueScans = 0;

  if (db) {
    const [pCount, fCount, tScans, uAttendees] = await Promise.all([
      db.collection("photos").countDocuments(filter),
      db.collection("image_with_face").countDocuments(filter),
      db.collection("guest_scans").countDocuments(filter),
      db.collection("guest_scans").distinct("attendeeId", filter),
    ]);
    photoCount = pCount + fCount;
    totalScans = tScans;
    uniqueScans = uAttendees.length;
  }

  return {
    id: eventIdStr,
    title: event.title,
    date: event.date.toISOString(),
    location: event.location,
    photoCount,
    totalScans,
    uniqueScans,
    createdBy: {
      id: (event.createdBy as any)?._id?.toString?.() ?? "",
      name: (event.createdBy as any)?.name ?? "Unknown",
    },
  } satisfies EventListItem;
}

export async function updateEvent(eventId: string, input: unknown) {
  const payload = eventInputSchema.partial().parse(input);
  await connectToDatabase();

  const event = await EventModel.findByIdAndUpdate(
    eventId,
    {
      ...(payload.title ? { title: payload.title } : {}),
      ...(payload.date ? { date: new Date(payload.date) } : {}),
      ...(payload.location ? { location: payload.location } : {}),
      ...(payload.createdBy ? { createdBy: payload.createdBy } : {}),
    },
    {
      new: true,
    },
  )
    .populate("createdBy", "name")
    .lean();

  if (!event) {
    return null;
  }

  return {
    id: event._id.toString(),
    title: event.title,
    date: event.date.toISOString(),
    location: event.location,
    createdBy: {
      id: (event.createdBy as any)?._id?.toString?.() ?? "",
      name: (event.createdBy as any)?.name ?? "Unknown",
    },
  } satisfies EventListItem;
}

export async function deleteEvent(eventId: string) {
  await connectToDatabase();

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const event = await EventModel.findById(eventId).session(session);

    if (!event) {
      throw new Error("Event not found");
    }

    await PhotoModel.deleteMany({ eventId }).session(session);

    await FolderModel.deleteMany({ eventId }).session(session);

    await EventModel.findByIdAndDelete(eventId).session(session);

    await session.commitTransaction();

    // External service after DB success
    // await deleteEventFolderFromCloudinary(eventId);

    return true;

  } catch (error) {
    await session.abortTransaction();

    console.error("Delete Event Error:", error);

    return false;

  } finally {
    session.endSession();
  }
}