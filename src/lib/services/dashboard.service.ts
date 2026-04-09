import { requireSession } from "@/lib/services/auth.service";
import { listEvents } from "@/lib/services/event.service";
import { listGalleryFolders } from "@/lib/services/photo.service";
import { fetchProfileById } from "@/lib/services/profile.service";
import { connectToDatabase } from "@/lib/db/mongodb";
import { PhotoModel } from "@/models/Photo";
import { DashboardSnapshot } from "@/types";

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const session = await requireSession();
  const userId = session.id;

  await connectToDatabase();

  const [events, folders, profile, photoUploadCount] = await Promise.all([
    listEvents(userId),
    listGalleryFolders(userId),
    fetchProfileById(userId),
    // Count only photos uploaded by this photographer
    PhotoModel.countDocuments({ uploadedBy: userId }),
  ]);

  return {
    metrics: [
      {
        label: "My Events",
        value: String(events.length),
        delta: "Events you have created",
      },
      {
        label: "Gallery Folders",
        value: String(folders.length),
        delta: "Across your events",
      },
      {
        label: "Photos Uploaded",
        value: String(photoUploadCount),
        delta: "Your total contributions",
      },
    ],
    recentEvents: events.slice(0, 5),
    galleryFolders: folders.slice(0, 4),
    profile,
  };
}

