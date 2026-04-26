  import { GalleryFolders } from "@/components/feature-specific/gallery/gallery-folders";
import { GalleryControls } from "@/components/feature-specific/gallery/gallery-controls";
import { EmptyState } from "@/components/shared/empty-state";
import { requireSession } from "@/lib/services/auth.service";
import { listEvents } from "@/lib/services/event.service";
import { listFoldersByEvent } from "@/lib/services/folder.service";

export const metadata = {
  title: "Gallery — Ente photo",
  description:
    "Organize high-resolution captures from the ceremony. Group by timeline for client delivery.",
};

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const session = await requireSession();
  const search = await searchParams;
  
  // Fetch all events for the dropdown
  const events = await listEvents(session.id).catch(() => []);
  
  // Use the eventId from search params or default to the most recent event
  const activeEventId = search.eventId || events[0]?.id;
  
  // Fetch folders for the specific event
  const folders = activeEventId 
    ? await listFoldersByEvent(activeEventId, session.id).catch(() => [])
    : [];

  return (
    <div className="space-y-4">
      {/* Gallery Header Controls (Breadcrumbs + Actions) */}
      {events.length > 0 && (
        <GalleryControls events={events} selectedEventId={activeEventId} />
      )}

      {/* Main Page Title & Description */}
      <div className="mb-10">
        <h1 className="text-5xl font-bold tracking-tight text-white mb-4">Gallery</h1>
        <p className="text-slate-500 max-w-xl leading-relaxed text-lg">
          Organize high-resolution captures from the ceremony. Group by timeline for client delivery.
        </p>
      </div>

      {folders.length ? (
        <GalleryFolders folders={folders} eventId={activeEventId} />
      ) : (
        <EmptyState
          title="No items found"
          description={events.length === 0 
            ? "Create an event first to see your gallery objects." 
            : "No folders have been created for this event yet."}
        />
      )}
    </div>
  );
}
