import { DashboardSnapshot } from "@/types";
import { requireSession } from "@/lib/services/auth.service";
import { listEvents } from "@/lib/services/event.service";
import { listGalleryFolders } from "@/lib/services/photo.service";
import { listPhotographers } from "@/lib/services/photographer.service";

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const session = await requireSession();

  const [events, folders, photographers] = await Promise.all([
    listEvents(session.id),
    listGalleryFolders(session.id),
    listPhotographers(),
  ]);

  return {
    metrics: [
      {
        label: "Events scheduled",
        value: String(events.length),
        delta: "Across the whole studio",
      },
      {
        label: "Gallery folders",
        value: String(folders.length),
        delta: "Event-based organization",
      },
      {
        label: "Photographers",
        value: String(photographers.length),
        delta: "Active team members",
      },
    ],
    recentEvents: events.slice(0, 5),
    galleryFolders: folders.slice(0, 4),
    photographers: photographers.slice(0, 4),
  };
}
