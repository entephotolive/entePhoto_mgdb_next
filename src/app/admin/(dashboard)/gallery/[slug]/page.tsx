import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Images } from "lucide-react";
import { requireSession } from "@/lib/services/auth.service";
import { listPhotosByFolder, getFolderMeta } from "@/lib/services/photo.service";
import { getEventById } from "@/lib/services/event.service";
import { FolderPhotoGrid } from "@/components/feature-specific/gallery/folder-photo-grid";

interface FolderPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ eventId?: string }>;
}

export default async function FolderDetailPage({
  params,
  searchParams,
}: FolderPageProps) {
  const session = await requireSession();
  const { slug } = await params;
  const { eventId } = await searchParams;

  // slug is the folderId (or "all")
  const folderId = slug;

  // We need an eventId to resolve the "all" pseudo-folder
  // If none is given in query params we fallback gracefully
  const resolvedEventId = eventId ?? "";

  const [meta, photos, event] = await Promise.all([
    getFolderMeta(folderId, resolvedEventId).catch(() => null),
    resolvedEventId || folderId !== "all"
      ? listPhotosByFolder(folderId, resolvedEventId).catch(() => [])
      : Promise.resolve([]),
    resolvedEventId ? getEventById(resolvedEventId).catch(() => null) : Promise.resolve(null),
  ]);

  if (!meta && folderId !== "all") {
    notFound();
  }

  const folderName = meta?.name ?? "All Photos";
  const photoCount = meta?.photoCount ?? photos.length;
  const canonicalEventId = meta?.eventId ?? resolvedEventId;
  const eventTitle = (event && typeof event !== "string" && !("error" in event)) ? event.title : "event";

  return (
    <div className="min-h-screen">
      {/* ── Breadcrumb ── */}
      <nav className="mb-8 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        <Link
          href="/admin/gallery"
          className="transition-colors hover:text-slate-300"
        >
          Gallery
        </Link>
        <ChevronRight size={12} className="text-slate-700" />
        <span className="text-cyan-400">{folderName}</span>
      </nav>

      {/* ── Page Header ── */}
      <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="mb-2 text-5xl font-black tracking-tight text-white">
            {folderName}
          </h1>
          <div className="flex items-center gap-2 text-slate-500">
            <Images size={14} className="opacity-60" />
            <span className="text-sm font-medium">
              {photoCount.toLocaleString()} Photos
            </span>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mb-8 h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent" />

      {/* ── Photo Grid (Client Island) ── */}
      <FolderPhotoGrid
        photos={photos}
        folderId={folderId}
        eventId={canonicalEventId}
        eventTitle={eventTitle}
        userId={session.id}
      />
    </div>
  );
}
