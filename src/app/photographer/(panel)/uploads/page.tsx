import { UploadWorkspace } from "@/components/feature-specific/uploads/upload-workspace";
import { PageHeader } from "@/components/shared/page-header";
import { requireSession } from "@/lib/services/auth.service";
import { listEvents } from "@/lib/services/event.service";

export const metadata = {
  title: "Uploads — Ente photo",
  description:
    "Upload, review, and register image batches for your events.",
};

export default async function UploadsPage() {
  const session = await requireSession();
  const events = await listEvents(session.id).catch(() => []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Upload pipeline"
        title="Drag, review, and register image batches"

      />
      <UploadWorkspace events={events} userId={session.id} />
    </div>
  );
}
