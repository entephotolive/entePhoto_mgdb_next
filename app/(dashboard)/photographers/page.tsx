import { redirect } from "next/navigation";
import { PhotographerPanel } from "@/components/feature-specific/photographers/photographer-panel";
import { ProfileCard } from "@/components/feature-specific/photographers/profile-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireSession } from "@/lib/services/auth.service";
import { listPhotographers } from "@/lib/services/photographer.service";

export default async function PhotographersPage() {
  const session = await requireSession();


  const photographers = await listPhotographers().catch(() => []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Team"
        title="Photographer panel"
        description="Admin-only visibility into photographer capacity, event ownership, and upload volume."
      />

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <ProfileCard user={session} />
        {photographers.length ? (
          <PhotographerPanel photographers={photographers} />
        ) : (
          <EmptyState
            title="No photographers registered"
            description="Use the bootstrap flow or registration API to add photographer accounts."
          />
        )}
      </div>
    </div>
  );
}
