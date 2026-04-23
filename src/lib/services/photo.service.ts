import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { EventModel } from "@/models/Event";
import { PhotoModel } from "@/models/Photo";
import { GalleryFolder } from "@/types";
import { Types } from "mongoose";

const photoInputSchema = z.object({
  url: z.string().url(),
  eventId: z.string().min(1),
  uploadedBy: z.string().min(1),
  folderId: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
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
    throw new Error(
      "This event hasn't started yet. Uploads will be available once the event begins.",
    );
  }

  if (now > eventTime + TWENTY_FOUR_HOURS) {
    throw new Error(
      "This event has ended (24-hour window closed). New photos can no longer be added.",
    );
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
  const events = await EventModel.find({ createdBy: userId })
    .sort({ date: -1 })
    .lean();

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

  const countsMap = new Map(
    photoCounts.map((item) => [item._id.toString(), item]),
  );

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

type ListPhotoOptions = {
  /**
   * Which collections to fetch from.
   * - "both" (default): union of `photos` + `image_with_face`
   */
  source?: "photos" | "image_with_face" | "both";
};

function toObjectId(value: string): Types.ObjectId | null {
  return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null;
}

function resolveImageUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== "string" || rawUrl.trim().length === 0) return null;

  const normalized = rawUrl.trim().replace(/\\/g, "/");
  if (/^https?:\/\//i.test(normalized)) return normalized;

  let relative = normalized;
  // If we only have a storage name like `public/<event>/<file>.jpg`, turn it into `/media/public/...`
  if (!relative.startsWith("/") && relative.startsWith("public/")) {
    relative = `/media/${relative}`;
  } else if (!relative.startsWith("/") && relative.startsWith("media/")) {
    relative = `/${relative}`;
  } else if (!relative.startsWith("/")) {
    relative = `/${relative}`;
  }

  const base = process.env.NEXT_PUBLIC_PYTHON_API_URL?.replace(/\/+$/g, "");
  if (!base) return relative;

  return `${base}${relative}`;
}

function resolveDocRawUrl(doc: any): string | null {
  const imageUrl = doc?.image_url ?? doc?.imageUrl ?? null;
  const url = doc?.url ?? null;
  const storage =
    doc?.image_storage_name ??
    doc?.imageStorageName ??
    doc?.storage_name ??
    doc?.storageName ??
    null;

  if (typeof imageUrl === "string" && imageUrl.trim()) return imageUrl;
  if (typeof url === "string" && url.trim()) return url;
  if (typeof storage === "string" && storage.trim()) return storage;
  return null;
}

function resolveDocCreatedAt(doc: any): Date {
  const candidates = [doc?.uploaded_at, doc?.uploadedAt, doc?.createdAt, doc?.created_at];
  for (const value of candidates) {
    if (!value) continue;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(0);
}

/** Fetch all photos belonging to a specific folder */
export async function listPhotosByFolder(
  folderId: string,
  eventId: string,
  options: ListPhotoOptions = {},
): Promise<PhotoItem[]> {
  const conn = await connectToDatabase();
  const db = conn.connection.db;
  if (!db) return [];

  if (folderId === "all" && !eventId) {
    return [];
  }

  const source = options.source ?? "both";
  const collections =
    source === "both" ? ["photos", "image_with_face"] : [source];

  const eventObjectId = eventId ? toObjectId(eventId) : null;
  const folderObjectId = folderId && folderId !== "all" ? toObjectId(folderId) : null;

  const eventMatch =
    eventId && eventObjectId
      ? [
          { event_id: eventObjectId },
          { eventId: eventObjectId },
          { event_id: eventId },
          { eventId: eventId },
        ]
      : eventId
        ? [{ event_id: eventId }, { eventId: eventId }]
        : [];

  const folderMatch =
    folderId !== "all"
      ? folderObjectId
        ? [
            { folder_id: folderId },
            { folderId: folderId },
            { folder_id: folderObjectId },
            { folderId: folderObjectId },
          ]
        : [{ folder_id: folderId }, { folderId: folderId }]
      : [];

  const and: Record<string, unknown>[] = [];
  if (folderId === "all") {
    if (eventMatch.length) and.push({ $or: eventMatch });
  } else {
    and.push({ $or: folderMatch });
    if (eventMatch.length) and.push({ $or: eventMatch });
  }

  const query = and.length === 1 ? and[0] : { $and: and };

  const docsByCollection = await Promise.all(
    collections.map((name) =>
      db
        .collection(name)
        .find(query, {
          projection: {
            _id: 1,
            id: 1,
            image_url: 1,
            url: 1,
            image_storage_name: 1,
            uploaded_at: 1,
            uploadedAt: 1,
            createdAt: 1,
            created_at: 1,
          },
        })
        .sort({ uploaded_at: -1, createdAt: -1, _id: -1 })
        .toArray(),
    ),
  );

  const merged = docsByCollection.flat().map((doc: any) => {
    const rawUrl = resolveDocRawUrl(doc);
    const url = resolveImageUrl(rawUrl);
    if (!url) return null;

    const createdAt = resolveDocCreatedAt(doc);

    return {
      id: (doc._id?.toString?.() ?? String(doc.id ?? url)) as string,
      url,
      createdAt: createdAt.toISOString(),
      __createdAtMs: createdAt.getTime(),
    };
  }).filter(Boolean) as Array<PhotoItem & { __createdAtMs: number }>;

  merged.sort((a, b) => b.__createdAtMs - a.__createdAtMs);

  // De-dupe by URL (face collection may contain the same underlying image).
  const seen = new Set<string>();
  const result: PhotoItem[] = [];
  for (const item of merged) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    result.push({ id: item.id, url: item.url, createdAt: item.createdAt });
  }

  return result;
}

/** Fetch folder metadata by folder ID (or "all" pseudo-folder) */
export async function getFolderMeta(
  folderId: string,
  eventId: string,
  options: ListPhotoOptions = {},
): Promise<FolderMeta | null> {
  const conn = await connectToDatabase();
  const db = conn.connection.db;
  if (!db) return null;

  const source = options.source ?? "both";
  const collections =
    source === "both" ? ["photos", "image_with_face"] : [source];

  const eventObjectId = eventId ? toObjectId(eventId) : null;
  const folderObjectId = folderId !== "all" ? toObjectId(folderId) : null;

  const eventMatch =
    eventId && eventObjectId
      ? [
          { event_id: eventObjectId },
          { eventId: eventObjectId },
          { event_id: eventId },
          { eventId: eventId },
        ]
      : eventId
        ? [{ event_id: eventId }, { eventId: eventId }]
        : [];

  if (folderId === "all") {
    if (!eventId || eventMatch.length === 0) {
      return { id: "all", name: "All Photos", photoCount: 0, eventId };
    }

    const counts = await Promise.all(
      collections.map((name) =>
        db.collection(name).countDocuments({ $or: eventMatch }),
      ),
    );
    const count = counts.reduce((sum, n) => sum + n, 0);
    return { id: "all", name: "All Photos", photoCount: count, eventId };
  }

  const foldersCollection = db.collection("folders");
  const folderQuery: Record<string, unknown>[] = [];
  if (folderObjectId) folderQuery.push({ _id: folderObjectId });
  folderQuery.push({ _id: folderId });
  folderQuery.push({ folder_id: folderId });
  folderQuery.push({ id: folderId });

  const folderDoc = await foldersCollection.findOne({ $or: folderQuery });
  const folderName =
    (folderDoc as any)?.name ??
    (folderDoc as any)?.title ??
    (folderDoc as any)?.folder_name ??
    (folderDoc as any)?.folderName ??
    null;

  const folderMatch = folderObjectId
    ? [
        { folder_id: folderId },
        { folderId: folderId },
        { folder_id: folderObjectId },
        { folderId: folderObjectId },
      ]
    : [{ folder_id: folderId }, { folderId: folderId }];

  const and: Record<string, unknown>[] = [{ $or: folderMatch }];
  if (eventMatch.length) and.push({ $or: eventMatch });
  const countQuery = and.length === 1 ? and[0] : { $and: and };

  const counts = await Promise.all(
    collections.map((name) => db.collection(name).countDocuments(countQuery)),
  );
  const count = counts.reduce((sum, n) => sum + n, 0);

  return {
    id: folderId,
    name: folderName ?? "Folder",
    photoCount: count,
    eventId,
  };
}
