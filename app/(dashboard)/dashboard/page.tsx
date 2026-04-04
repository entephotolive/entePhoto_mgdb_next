import { EmptyState } from "@/components/shared/empty-state";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { getDashboardSnapshot } from "@/lib/services/dashboard.service";
import { formatShortDate } from "@/lib/utils/format";

export default async function DashboardPage() {
  const snapshot = await getDashboardSnapshot().catch(() => null);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Studio dashboard"
        description="A server-rendered summary for events, gallery folders, and photographer activity."
      />

      <section className="grid gap-4 xl:grid-cols-3">
        {snapshot?.metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        )) ?? (
          <EmptyState
            title="Connect MongoDB to see live metrics"
            description="The dashboard is wired to real services. Add MONGODB_URI and JWT_SECRET to start reading production data."
          />
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Recent events</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Upcoming and active coverage</h2>
          </div>
          {snapshot?.recentEvents.length ? (
            snapshot.recentEvents.map((event) => (
              <div key={event.id} className="rounded-3xl bg-white/[0.04] p-4">
                <p className="font-semibold text-white">{event.title}</p>
                <p className="mt-2 text-sm text-slate-400">
                  {event.location} • {formatShortDate(event.date)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">No events available yet.</p>
          )}
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Folders</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Gallery organization</h2>
          </div>
          {snapshot?.galleryFolders.length ? (
            snapshot.galleryFolders.map((folder) => (
              <div key={folder.id} className="rounded-3xl bg-white/[0.04] p-4">
                <p className="font-semibold text-white">{folder.title}</p>
                <p className="mt-2 text-sm text-slate-400">
                  {folder.photoCount} photos • {folder.location}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">Folders will appear after photos are registered.</p>
          )}
        </Card>
      </section>
    </div>
  );
}
