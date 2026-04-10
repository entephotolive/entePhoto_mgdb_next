import { connectToDatabase } from "@/lib/db/mongodb";
import { FolderModel } from "@/models/Folder";
import { PhotoModel } from "@/models/Photo";
import { EventModel } from "@/models/Event";
import { Types } from "mongoose";
import mongoose from "mongoose";

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

export async function listFoldersByEvent(eventId: string, userId: string) {
  await connectToDatabase();

  // Fetch real folders from the database
  const folders = await FolderModel.find({ eventId, createdBy: userId }).lean();

  // For each folder, we want to get a cover image and photo count.
  const photoCounts = await PhotoModel.aggregate([
    { $match: { eventId: new (Types.ObjectId as any)(eventId) } },
    {
      $group: {
        _id: "$folderId",
        count: { $sum: 1 },
        coverUrl: { $first: "$url" },
      },
    },
  ]);

  let totalCount = 0;
  let eventCoverUrl = null;
  const folderStats = new Map();

  for (const group of photoCounts) {
    totalCount += group.count;
    if (!eventCoverUrl && group.coverUrl) {
      eventCoverUrl = group.coverUrl;
    }
    if (group._id) {
      folderStats.set(group._id.toString(), group);
    }
  }

  // Map the local models to the UI representation.
  // The mockup shows "All Photos" as the first item.
  const results = [
    {
      id: "all",
      title: "All Photos",
      photoCount: totalCount,
      coverUrl: eventCoverUrl,
      location: "", // Not used in mockup cards
      date: new Date().toISOString(), // Not used in mockup cards
    },
    ...folders.map((f) => {
      const stats = folderStats.get(f._id.toString());
      return {
        id: f._id.toString(),
        title: f.name,
        photoCount: stats?.count || 0,
        coverUrl: stats?.coverUrl || null,
        location: "",
        date: (f as any).createdAt?.toISOString() || new Date().toISOString(),
      };
    }),
  ];

  return results;
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
