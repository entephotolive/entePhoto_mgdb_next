import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDashboardSnapshot } from "@/lib/services/dashboard.service";
import { formatShortDate } from "@/lib/utils/format";
import {
  Calendar,
  FolderOpen,
  Users,
  TrendingUp,
  ImageIcon,
  ArrowUpRight,
  Clock,
  MapPin,
} from "lucide-react";
import Link from "next/link";

const METRIC_CONFIG = [
  {
    icon: Calendar,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/20",
    glow: "shadow-[0_0_30px_rgba(34,211,238,0.08)]",
    href: "/admin/events",
  },
  {
    icon: FolderOpen,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/20",
    glow: "shadow-[0_0_30px_rgba(167,139,250,0.08)]",
    href: "/admin/gallery",
  },
  {
    icon: Users,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    glow: "shadow-[0_0_30px_rgba(52,211,153,0.08)]",
    href: "/admin/gallery",
  },
];

export default async function DashboardPage() {
  const snapshot = await getDashboardSnapshot().catch(() => null);

  const now = new Date();

  return (
    <div className="space-y-8 pb-4">

      {/* ── Header ── */}
      <div className="flex flex-col gap-1 pt-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400/70">
          Overview
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white lg:text-4xl">
          Welcome back{snapshot?.profile?.name ? `, ${snapshot.profile.name}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500 max-w-xl">
          {snapshot?.profile?.studioName
            ? `Your personal dashboard for ${snapshot.profile.studioName}.`
            : "A live snapshot of your events, gallery folders, and photo uploads."}
        </p>
      </div>

      {/* ── Metric Cards ── */}
      <section className="grid gap-4 sm:grid-cols-3">
        {snapshot?.metrics.map((metric, i) => {
          const cfg = METRIC_CONFIG[i];
          const Icon = cfg.icon;
          return (
            <Link key={metric.label} href={cfg.href}>
              
              <Card
                className={`group relative overflow-hidden border ${cfg.border} bg-white/[0.03] ${cfg.glow} hover:bg-white/[0.06] transition-all duration-300 cursor-pointer`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div
                      className={`${cfg.bg} ${cfg.border} border rounded-xl p-2.5`}
                    >
                      <Icon className={`${cfg.color} h-5 w-5`} />
                    </div>
                    <ArrowUpRight
                      className="text-slate-600 group-hover:text-slate-400 transition-colors h-4 w-4"
                    />
                  </div>
                  <div className="mt-4">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">
                      {metric.label}
                    </p>
                    <p className={`mt-2 text-4xl font-bold ${cfg.color}`}>
                      {metric.value}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{metric.delta}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        }) ?? (
          <div className="col-span-3">
            <Card className="border-dashed border-white/10 bg-white/[0.02]">
              <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <TrendingUp className="h-8 w-8 text-slate-600" />
                <p className="text-sm font-medium text-slate-400">
                  Connect MongoDB to see live metrics
                </p>
                <p className="text-xs text-slate-600 max-w-xs">
                  Add{" "}
                  <code className="text-cyan-500 bg-cyan-500/10 px-1.5 py-0.5 rounded text-[10px]">
                    MONGODB_URI
                  </code>{" "}
                  and{" "}
                  <code className="text-cyan-500 bg-cyan-500/10 px-1.5 py-0.5 rounded text-[10px]">
                    JWT_SECRET
                  </code>{" "}
                  to your environment.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* ── Main Grid ── */}
      <section className="grid gap-6 xl:grid-cols-2">

        {/* Recent Events */}
        <Card className="border-white/[0.07] bg-white/[0.025]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Recent Events
                </p>
                <CardTitle className="mt-1 text-lg font-semibold text-white">
                  Upcoming &amp; Active
                </CardTitle>
              </div>
              <Link
                href="/admin/events"
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View all
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {snapshot?.recentEvents.length ? (
              snapshot.recentEvents.map((event) => {
                const eventDate = new Date(event.date);
                const isUpcoming = eventDate > now;
                return (
                  <div
                    key={event.id}
                    className="group flex items-start gap-3 rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-200"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 border border-cyan-400/20">
                      <Calendar className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {event.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Clock className="h-3 w-3" />
                          {formatShortDate(event.date)}
                        </span>
                      </div>
                    </div>
                    <Badge
                      className={
                        isUpcoming
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400 text-[10px] shrink-0"
                          : "border-slate-500/30 bg-white/[0.04] text-slate-500 text-[10px] shrink-0"
                      }
                      variant="outline"
                    >
                      {isUpcoming ? "Upcoming" : "Past"}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Calendar className="h-7 w-7 text-slate-700" />
                <p className="text-sm text-slate-500">No events yet.</p>
                <Link
                  href="/admin/events"
                  className="text-xs text-cyan-400 hover:underline"
                >
                  Create your first event →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gallery Folders */}
        <Card className="border-white/[0.07] bg-white/[0.025]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Gallery
                </p>
                <CardTitle className="mt-1 text-lg font-semibold text-white">
                  Folder Organization
                </CardTitle>
              </div>
              <Link
                href="/admin/gallery"
                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                View all
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 pt-0">
            {snapshot?.galleryFolders.length ? (
              snapshot.galleryFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="group flex flex-col gap-2 rounded-xl border border-white/[0.05] bg-white/[0.03] p-4 hover:bg-white/[0.06] hover:border-violet-400/20 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-400/10 border border-violet-400/20">
                      <FolderOpen className="h-4 w-4 text-violet-400" />
                    </div>
                    <span className="flex items-center gap-1 text-[10px] text-slate-600">
                      <ImageIcon className="h-2.5 w-2.5" />
                      {folder.photoCount}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white leading-tight line-clamp-1">
                      {folder.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {folder.location}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 flex flex-col items-center gap-2 py-10 text-center">
                <FolderOpen className="h-7 w-7 text-slate-700" />
                <p className="text-sm text-slate-500">
                  Folders will appear after photos are registered.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── My Profile Card ── */}
      {snapshot?.profile && (
        <section>
          <Card className="border-white/[0.07] bg-white/[0.025]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                    Your Profile
                  </p>
                  <CardTitle className="mt-1 text-lg font-semibold text-white">
                    Studio Identity
                  </CardTitle>
                </div>
                <Link
                  href="/admin/profile"
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Edit profile
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-xl font-bold text-cyan-400">
                  {snapshot.profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={snapshot.profile.avatarUrl}
                      alt={snapshot.profile.name}
                      className="h-14 w-14 rounded-2xl object-cover"
                    />
                  ) : (
                    snapshot.profile.name?.charAt(0)?.toUpperCase() ?? "P"
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-white truncate">
                    {snapshot.profile.name}
                  </p>
                  <p className="text-sm text-slate-400 truncate">
                    {snapshot.profile.studioName || "No studio name set"}
                  </p>
                  {snapshot.profile.specialization && (
                    <Badge
                      className="mt-1.5 border-cyan-400/20 bg-cyan-400/10 text-cyan-400 text-[10px]"
                      variant="outline"
                    >
                      {snapshot.profile.specialization}
                    </Badge>
                  )}
                </div>

                {/* Location */}
                {snapshot.profile.studioLocation && (
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                    <MapPin className="h-3.5 w-3.5" />
                    {snapshot.profile.studioLocation}
                  </div>
                )}
              </div>

              {snapshot.profile.bio && (
                <p className="mt-4 text-sm text-slate-500 leading-relaxed line-clamp-2 border-t border-white/[0.05] pt-4">
                  {snapshot.profile.bio}
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

