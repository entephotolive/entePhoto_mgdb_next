import { connectToDatabase } from "@/lib/db/mongodb";
import { FolderModel } from "@/models/Folder";
import { EventModel } from "@/models/Event";
import { Types } from "mongoose";
import mongoose from "mongoose";

function toObjectId(value: string): Types.ObjectId | null {
  return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null;
}

function resolveImageUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== "string" || rawUrl.trim().length === 0) return null;

  const normalized = rawUrl.trim().replace(/\\/g, "/");
  if (/^https?:\/\//i.test(normalized)) return normalized;

  let relative = normalized;
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

export async function listPublicFoldersByEvent(eventId: string) {
  await connectToDatabase();

 if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return {
      error: "Invalid event ID",
      folders: [],
    };
  }

  const event = await EventModel.findById(eventId).lean();

  if (!event) {
    return {
      error: "Event not found",
      folders: [],
    };
  }  
  return listFoldersByEvent(eventId, event.createdBy.toString());
}

export async function listFoldersByEvent(
  eventId: string,
  userId: string,
) {
  const conn = await connectToDatabase();
  const db = conn.connection.db;
  if (!db) return [];

  const eventObjectId = toObjectId(eventId);
  const eventMatch =
    eventObjectId
      ? [
          { event_id: eventObjectId },
          { eventId: eventObjectId },
          { event_id: eventId },
          { eventId: eventId },
        ]
      : [{ event_id: eventId }, { eventId: eventId }];

  // Keep access control: ensure this event belongs to the current user.
  // (Folders and photos may be written by a separate backend and not carry createdBy.)
  const owningEvent = await EventModel.findOne({
    _id: eventId,
    createdBy: userId,
  })
    .select({ _id: 1 })
    .lean();

  if (!owningEvent) {
    return [];
  }

  const foldersCollection = db.collection("folders");
  const rawFolders = await foldersCollection
    .find(
      { $or: eventMatch },
      {
        projection: {
          _id: 1,
          id: 1,
          name: 1,
          title: 1,
          folder_name: 1,
          folderName: 1,
          createdAt: 1,
          created_at: 1,
        },
      },
    )
    .toArray();

  const folderItems = rawFolders
    .map((f: any) => {
      const id = f._id?.toString?.() ?? String(f.id ?? "");
      const title =
        f.name ?? f.title ?? f.folder_name ?? f.folderName ?? "Folder";
      const createdAt =
        (f.createdAt instanceof Date
          ? f.createdAt
          : f.created_at instanceof Date
            ? f.created_at
            : null) ?? new Date(0);
      return { id, title, createdAt };
    })
    .filter((f) => Boolean(f.id));

  // Fetch photo counts + cover images from both collections used by the Python backend.
  const photosCollection = db.collection("photos");
  const facesCollection = db.collection("image_with_face");

  const buildAgg = (collection: any) => ({
    total: collection
      .aggregate([
        { $match: { $or: eventMatch } },
        {
          $addFields: {
            __sortDate: { $ifNull: ["$uploaded_at", "$createdAt"] },
            __url: {
              $ifNull: ["$image_url", { $ifNull: ["$url", "$image_storage_name"] }],
            },
          },
        },
        { $sort: { __sortDate: -1, _id: -1 } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            coverUrl: { $first: "$__url" },
          },
        },
      ])
      .toArray(),
    perFolder: collection
      .aggregate([
        { $match: { $or: eventMatch } },
        {
          $addFields: {
            __sortDate: { $ifNull: ["$uploaded_at", "$createdAt"] },
            __folder: { $ifNull: ["$folder_id", "$folderId"] },
            __url: {
              $ifNull: ["$image_url", { $ifNull: ["$url", "$image_storage_name"] }],
            },
          },
        },
        { $sort: { __sortDate: -1, _id: -1 } },
        {
          $group: {
            _id: "$__folder",
            count: { $sum: 1 },
            coverUrl: { $first: "$__url" },
          },
        },
      ])
      .toArray(),
  });

  const [photosAgg, facesAgg] = await Promise.all([
    Promise.all([buildAgg(photosCollection).total, buildAgg(photosCollection).perFolder]),
    Promise.all([buildAgg(facesCollection).total, buildAgg(facesCollection).perFolder]),
  ]);

  const [totalAggPhotos, perFolderAggPhotos] = photosAgg as any;
  const [totalAggFaces, perFolderAggFaces] = facesAgg as any;

  const totalCountPhotos = (totalAggPhotos?.[0] as any)?.count ?? 0;
  const totalCountFaces = (totalAggFaces?.[0] as any)?.count ?? 0;
  const totalCount = totalCountPhotos + totalCountFaces;

  const coverPhotos = resolveImageUrl((totalAggPhotos?.[0] as any)?.coverUrl ?? null);
  const coverFaces = resolveImageUrl((totalAggFaces?.[0] as any)?.coverUrl ?? null);
  const eventCoverUrl = coverPhotos ?? coverFaces ?? null;

  const folderStats = new Map<string, { count: number; coverUrl: string | null }>();

  const applyAgg = (perFolderAgg: any[]) => {
    for (const group of perFolderAgg as any[]) {
      const key =
        group?._id?.toString?.() ??
        (typeof group?._id === "string" ? group._id : null);
      if (!key) continue;
      const existing = folderStats.get(key) ?? { count: 0, coverUrl: null };
      const nextCover = resolveImageUrl(group.coverUrl ?? null);
      folderStats.set(key, {
        count: existing.count + (group.count ?? 0),
        coverUrl: existing.coverUrl ?? nextCover,
      });
    }
  };

  // Prefer covers from `photos` over `image_with_face` when both exist.
  applyAgg(perFolderAggPhotos);
  applyAgg(perFolderAggFaces);

  folderItems.sort((a, b) => {
    const delta = a.createdAt.getTime() - b.createdAt.getTime();
    if (delta !== 0) return delta;
    return a.title.localeCompare(b.title);
  });

  return [
    {
      id: "all",
      title: "All Photos",
      photoCount: totalCount,
      coverUrl: eventCoverUrl,
      location: "",
      date: new Date().toISOString(),
    },
    ...folderItems.map((f) => {
      const stats = folderStats.get(f.id);
      return {
        id: f.id,
        title: f.title,
        photoCount: stats?.count ?? 0,
        coverUrl: stats?.coverUrl ?? null,
        location: "",
        date: f.createdAt.toISOString(),
      };
    }),
  ];
}

export async function createFolder(
  name: string,
  eventId: string,
  userId: string,
) {
  try {
    await connectToDatabase();

    let slug = name.trim().toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "");

    // Fallback in case the name consisted entirely of special characters
    if (!slug) {
      slug = `folder-${Date.now()}`;
    }

    const folder = await FolderModel.create({
      name,
      slug,
      eventId,
      createdBy: userId,
    });

   
    return folder;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function updateFolder(
  folderId: string,
  name: string,
  userId: string,
) {
  try {
    await connectToDatabase();
    
    let slug = name.trim().toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "");

    if (!slug) {
      slug = `folder-${Date.now()}`;
    }

    const folder = await FolderModel.findOneAndUpdate(
      { _id: folderId, createdBy: userId },
      { name, slug },
      { new: true }
    );

    return folder;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function deleteFolder(folderId: string, userId: string) {
  try {
    await connectToDatabase();
    return await FolderModel.findOneAndDelete({ _id: folderId, createdBy: userId });
  } catch (error) {
    console.error(error);
    throw error;
  }
}
