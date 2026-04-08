import { connectToDatabase } from "@/lib/db/mongodb";
import { FolderModel } from "@/models/Folder";
import { PhotoModel } from "@/models/Photo";

export async function listFoldersByEvent(eventId: string, userId: string) {
  await connectToDatabase();

  // Fetch real folders from the database
  const folders = await FolderModel.find({ eventId, createdBy: userId }).lean();

  // For each folder, we might want to get a cover image and photo count.
  // This is a simplified version.
  const photoCounts = await PhotoModel.aggregate([
    { $match: { eventId: eventId as any } },
    {
      $group: {
        _id: "$eventId",
        count: { $sum: 1 },
        coverUrl: { $first: "$url" },
      },
    },
  ]);

  const eventStats = photoCounts[0] || { count: 0, coverUrl: null };

  // Map the local models to the UI representation.
  // The mockup shows "All Photos" as the first item.
  const results = [
    {
      id: "all",
      title: "All Photos",
      photoCount: eventStats.count,
      coverUrl: eventStats.coverUrl,
      location: "", // Not used in mockup cards
      date: new Date().toISOString(), // Not used in mockup cards
    },
    ...folders.map((f) => ({
      id: f._id.toString(),
      title: f.name,
      photoCount: 0, // Placeholder
      coverUrl: null, // Placeholder
      location: "",
      date: (f as any).createdAt?.toISOString() || new Date().toISOString(),
    })),
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
