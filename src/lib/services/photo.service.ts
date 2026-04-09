import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { EventModel } from "@/models/Event";
import { PhotoModel } from "@/models/Photo";
import { FolderModel } from "@/models/Folder";
import { GalleryFolder } from "@/types";
import { Types } from "mongoose";

const photoInputSchema = z.object({
  url: z.string().url(),
  eventId: z.string().min(1),
  uploadedBy: z.string().min(1),
  hash: z.string().min(1),
  folderId: z.string().optional().nullable(),
});

export async function createPhoto(input: unknown) {
  const payload = photoInputSchema.parse(input);
  await connectToDatabase();

  const event = await EventModel.findById(payload.eventId).lean();
  if (!event) {
    throw new Error("Event not found.");
  }

  const now = Date.now();
  const eventTime = new Date(event.date).getTime();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  if (now < eventTime) {
    throw new Error("This event hasn't started yet. Uploads will be available once the event begins.");
  }

  if (now > eventTime + TWENTY_FOUR_HOURS) {
    throw new Error("This event has ended (24-hour window closed). New photos can no longer be added.");
  }

  const photo = await PhotoModel.create(payload);


  return {
    id: photo._id.toString(),
    url: photo.url,
  };
}

export async function listGalleryFolders(userId: string) {
  await connectToDatabase();

  // Filter events to only this user's own events
  const events = await EventModel.find({ createdBy: userId }).sort({ date: -1 }).lean();

  if (!events.length) {
    return [] satisfies GalleryFolder[];
  }

  const eventIds = events.map((event) => event._id);

  const photoCounts = await PhotoModel.aggregate<{
    _id: string;
    count: number;
    coverUrl: string | null;
  }>([
    {
      $match: {
        eventId: { $in: eventIds },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $group: {
        _id: "$eventId",
        count: { $sum: 1 },
        coverUrl: { $first: "$url" },
      },
    },
  ]);

  const countsMap = new Map(photoCounts.map((item) => [item._id.toString(), item]));

  return events.map((event) => {
    const match = countsMap.get(event._id.toString());

    return {
      id: event._id.toString(),
      title: event.title,
      date: event.date.toISOString(),
      location: event.location,
      coverUrl: match?.coverUrl ?? null,
      photoCount: match?.count ?? 0,
    } satisfies GalleryFolder;
  });
}

export type PhotoItem = {
  id: string;
  url: string;
  createdAt: string;
};

export type FolderMeta = {
  id: string;
  name: string;
  photoCount: number;
  eventId: string;
};

/** Fetch all photos belonging to a specific folder */
export async function listPhotosByFolder(
  folderId: string,
  eventId: string,
): Promise<PhotoItem[]> {
  await connectToDatabase();

  const query: Record<string, unknown> =
    folderId === "all"
      ? { eventId: new Types.ObjectId(eventId) }
      : { folderId: new Types.ObjectId(folderId) };

  const photos = await PhotoModel.find(query)
    .sort({ createdAt: -1 })
    .lean();

  return photos.map((p) => ({
    id: p._id.toString(),
    url: p.url,
    createdAt: (p as any).createdAt?.toISOString() ?? new Date().toISOString(),
  }));
}

/** Fetch folder metadata by folder ID (or "all" pseudo-folder) */
export async function getFolderMeta(
  folderId: string,
  eventId: string,
): Promise<FolderMeta | null> {
  await connectToDatabase();

  if (folderId === "all") {
    const count = await PhotoModel.countDocuments({
      eventId: new Types.ObjectId(eventId),
    });
    return { id: "all", name: "All Photos", photoCount: count, eventId };
  }

  const folder = await FolderModel.findById(folderId).lean();
  if (!folder) return null;

  const count = await PhotoModel.countDocuments({
    folderId: new Types.ObjectId(folderId),
  });

  return {
    id: folder._id.toString(),
    name: (folder as any).name,
    photoCount: count,
    eventId: (folder as any).eventId?.toString() ?? eventId,
  };
}
