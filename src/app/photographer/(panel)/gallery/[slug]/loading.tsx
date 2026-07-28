import { Skeleton } from "@/components/ui/skeleton";

export default function GalleryFolderLoading() {
  return (
    <div className="min-h-screen">
      {/* ── Breadcrumb Skeleton ── */}
      <div className="mb-8 flex items-center gap-2">
        <Skeleton className="h-4 w-16 bg-white/5" />
        <span className="text-slate-700">/</span>
        <Skeleton className="h-4 w-28 bg-white/5" />
      </div>

      {/* ── Page Header Skeleton ── */}
      <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
        <div>
          <Skeleton className="mb-3 h-12 w-64 rounded-2xl bg-white/5" />
          <Skeleton className="h-4 w-28 rounded-lg bg-white/5" />
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mb-8 h-px bg-white/10" />

      {/* ── Upload Bar Skeleton ── */}
      <div className="mb-8">
        <Skeleton className="h-12 w-44 rounded-2xl bg-white/5" />
      </div>

      {/* ── Photo Grid Skeleton ── */}
      <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="mb-4 break-inside-avoid overflow-hidden rounded-[24px] border border-white/5 bg-[#141416]"
          >
            <Skeleton
              className="w-full bg-white/5 rounded-[24px]"
              style={{ height: `${200 + (i % 3) * 60}px` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
