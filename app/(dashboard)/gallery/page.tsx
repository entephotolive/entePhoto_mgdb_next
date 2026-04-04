import { GalleryFolders } from "@/components/feature-specific/gallery/gallery-folders";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireSession } from "@/lib/services/auth.service";
import { listGalleryFolders } from "@/lib/services/photo.service";

export default async function GalleryPage() {
  const session = await requireSession();
  const folders = await listGalleryFolders(session.id).catch(() => []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Gallery"
        title="Folder-first media organization"
        description="Instead of inventing a separate folder schema, the gallery is grouped by event, which keeps the model simple and scalable."
      />

      {folders.length ? (
        <GalleryFolders folders={folders} />
      ) : (
        <EmptyState
          title="No folders yet"
          description="Folders appear automatically when photos are linked to an event."
        />
      )}
    </div>
  );
}
