import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { EventModel } from "@/models/Event";
import { PhotoModel } from "@/models/Photo";
import { GalleryFolder } from "@/types";
import { Types } from "mongoose";
import { EVENT_UPLOAD_WINDOW_MS } from "@/lib/utils/upload-constants";

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

  // Enforce the same strict window as isEventActive() on the client.
  if (now < eventTime) {
    throw new Error(
      "This event has not started yet. Uploads open at the event start time.",
    );
  }

  if (now > eventTime + EVENT_UPLOAD_WINDOW_MS) {
    throw new Error(
      `This event's upload window has closed. Photos can only be uploaded during the ${EVENT_UPLOAD_WINDOW_MS / 3_600_000}-hour window after the event starts.`,
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
  faceCount?: number;
};

export type FolderMeta = {
  id: string;
  name: string;
  photoCount: number;
  eventId: string;
};

export type ListPhotoOptions = {
  /**
   * Which collections to fetch from.
   * - "both" (default): union of `photos` + `image_with_face`
   */
  source?: "photos" | "image_with_face" | "both";
  cursor?: string;
  limit?: number;
};

export type PaginatedPhotosResult = {
  photos: PhotoItem[];
  nextCursor: string | null;
};

function decodeCursor(cursor?: string): { createdAt: Date; id: string } | null {
  if (!cursor) return null;
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(json);
    if (parsed && parsed.createdAt) {
      return { createdAt: new Date(parsed.createdAt), id: parsed.id ?? "" };
    }
  } catch {
    const d = new Date(cursor);
    if (!Number.isNaN(d.getTime())) return { createdAt: d, id: "" };
  }
  return null;
}

function encodeCursor(item: { createdAt: string; id: string }): string {
  return Buffer.from(
    JSON.stringify({ createdAt: item.createdAt, id: item.id }),
  ).toString("base64url");
}

function toObjectId(value: string): Types.ObjectId | null {
  return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null;
}

function resolveImageUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== "string" || rawUrl.trim().length === 0) return null;

  const normalized = rawUrl.trim().replace(/\\/g, "/");
  let result = normalized;

  if (!/^https?:\/\//i.test(normalized)) {
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
    if (base) {
      result = `${base}${relative}`;
    } else {
      result = relative;
    }
  }

  // Force HTTPS for non-local URLs to prevent Mixed Content errors
  if (
    result.startsWith("http://") &&
    !result.includes("localhost") &&
    !result.includes("127.0.0.1")
  ) {
    result = result.replace(/^http:\/\//i, "https://");
  }

  return result;
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
  const candidates = [
    doc?.uploaded_at,
    doc?.uploadedAt,
    doc?.createdAt,
    doc?.created_at,
  ];
  for (const value of candidates) {
    if (!value) continue;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(0);
}

function resolveDocFaceCount(doc: any): number {
  if (!doc) return 0;
  if (typeof doc.face_count === "number") return doc.face_count;
  if (typeof doc.faceCount === "number") return doc.faceCount;
  if (typeof doc.face_count === "string" && !isNaN(Number(doc.face_count))) return Number(doc.face_count);
  if (typeof doc.faceCount === "string" && !isNaN(Number(doc.faceCount))) return Number(doc.faceCount);
  return 0;
}

/** Fetch all photos belonging to a specific folder */
export async function listPhotosByFolder(
  folderId: string,
  eventId: string,
  options: ListPhotoOptions = {},
): Promise<PaginatedPhotosResult> {
  const conn = await connectToDatabase();
  const db = conn.connection.db;
  if (!db) return { photos: [], nextCursor: null };

  if (folderId === "all" && !eventId) {
    return { photos: [], nextCursor: null };
  }

  const source = options.source ?? "both";
  const collections =
    source === "both" ? ["photos", "image_with_face"] : [source];

  // Ensure createdAt indexes exist on collections
  collections.forEach((name) => {
    db.collection(name)
      .createIndex({ uploaded_at: -1, createdAt: -1, _id: -1 })
      .catch(() => {});
  });

  const eventObjectId = eventId ? toObjectId(eventId) : null;
  const numEventId = Number(eventId);
  const isNumEventId = eventId ? !isNaN(numEventId) : false;

  const folderObjectId =
    folderId && folderId !== "all" ? toObjectId(folderId) : null;

  const eventMatch = eventId
    ? [
        { event_id: eventId },
        { eventId: eventId },
        ...(eventObjectId ? [{ event_id: eventObjectId }, { eventId: eventObjectId }] : []),
        ...(isNumEventId ? [{ event_id: numEventId }, { eventId: numEventId }] : []),
      ]
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

  const cursorData = decodeCursor(options.cursor);
  if (cursorData) {
    and.push({
      $or: [
        { uploaded_at: { $lt: cursorData.createdAt } },
        { createdAt: { $lt: cursorData.createdAt } },
      ],
    });
  }

  const query = and.length === 1 ? and[0] : { $and: and };

  const limit = options.limit;
  const fetchLimit = limit ? limit * 2 + 10 : 0;

  const docsByCollection = await Promise.all(
    collections.map((name) => {
      let cursor = db.collection(name).find(query, {
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
          face_count: 1,
          faceCount: 1,
        },
      });
      cursor = cursor.sort({ uploaded_at: -1, createdAt: -1, _id: -1 });
      if (fetchLimit > 0) {
        cursor = cursor.limit(fetchLimit);
      }
      return cursor.toArray();
    }),
  );

  let merged = docsByCollection
    .flat()
    .map((doc: any) => {
      const rawUrl = resolveDocRawUrl(doc);
      const url = resolveImageUrl(rawUrl);
      if (!url) return null;

      const createdAt = resolveDocCreatedAt(doc);
      const faceCount = resolveDocFaceCount(doc);

      return {
        id: (doc._id?.toString?.() ?? String(doc.id ?? url)) as string,
        url,
        createdAt: createdAt.toISOString(),
        __createdAtMs: createdAt.getTime(),
        faceCount,
      };
    })
    .filter(Boolean) as Array<PhotoItem & { __createdAtMs: number }>;

  merged.sort((a, b) => {
    if (b.__createdAtMs !== a.__createdAtMs) {
      return b.__createdAtMs - a.__createdAtMs;
    }
    return b.id.localeCompare(a.id);
  });

  if (cursorData) {
    const cursorMs = cursorData.createdAt.getTime();
    merged = merged.filter((item) => {
      if (item.__createdAtMs < cursorMs) return true;
      if (item.__createdAtMs === cursorMs && cursorData.id) {
        return item.id < cursorData.id;
      }
      return false;
    });
  }

  // De-dupe by URL, keeping the item with highest faceCount (e.g. from image_with_face collection).
  const urlToItemMap = new Map<string, PhotoItem & { __createdAtMs: number }>();
  for (const item of merged) {
    const existing = urlToItemMap.get(item.url);
    if (!existing) {
      urlToItemMap.set(item.url, item);
    } else {
      if ((item.faceCount ?? 0) > (existing.faceCount ?? 0)) {
        urlToItemMap.set(item.url, item);
      }
    }
  }

  const deduplicated: PhotoItem[] = Array.from(urlToItemMap.values()).map((item) => ({
    id: item.id,
    url: item.url,
    createdAt: item.createdAt,
    faceCount: item.faceCount ?? 0,
  }));

  // Use an explicit limit when supplied, otherwise default to PAGE_SIZE.
  // nextCursor is null on the last page so callers know when to stop.
  const PAGE_SIZE = limit ?? 40;
  let photos = deduplicated;
  let nextCursor: string | null = null;

  if (deduplicated.length > PAGE_SIZE) {
    photos = deduplicated.slice(0, PAGE_SIZE);
    const lastItem = photos[photos.length - 1];
    nextCursor = encodeCursor(lastItem);
  }

  return { photos, nextCursor };
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
  const numEventId = Number(eventId);
  const isNumEventId = eventId ? !isNaN(numEventId) : false;
  const folderObjectId = folderId !== "all" ? toObjectId(folderId) : null;

  const eventMatch = eventId
    ? [
        { event_id: eventId },
        { eventId: eventId },
        ...(eventObjectId ? [{ event_id: eventObjectId }, { eventId: eventObjectId }] : []),
        ...(isNumEventId ? [{ event_id: numEventId }, { eventId: numEventId }] : []),
      ]
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

/** Delete a photo by ID */
export async function deletePhoto(photoId: string) {
  try {
    await connectToDatabase();
    return await PhotoModel.findOneAndDelete({ _id: photoId });
  } catch (error) {
    console.error(error);
    throw error;
  }
}
