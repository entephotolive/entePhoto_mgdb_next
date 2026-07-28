import { Skeleton } from "@/components/ui/skeleton";

export default function UploadsLoading() {
  return (
    <div className="space-y-8 pb-32">
      {/* ── Page Header Skeleton ── */}
      <div>
        <Skeleton className="mb-2 h-3 w-24 rounded bg-white/5" />
        <Skeleton className="h-10 w-72 rounded-xl bg-white/5" />
      </div>

      {/* ── Event Selector Skeleton ── */}
      <section className="flex flex-col md:flex-row md:items-end justify-end gap-4">
        <div className="flex flex-col w-full md:w-auto md:items-end gap-2">
          <Skeleton className="h-3 w-36 rounded bg-white/5" />
          <Skeleton className="h-11 w-64 rounded-2xl bg-white/5" />
        </div>
      </section>

      {/* ── Dropzone Skeleton ── */}
      <Skeleton className="h-64 sm:h-80 w-full rounded-[32px] sm:rounded-[40px] bg-white/[0.03]" />

      {/* ── Queue Skeleton Section ── */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-4 w-32 rounded bg-white/5" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/5 rounded-[32px] p-2 overflow-hidden"
            >
              <Skeleton className="aspect-square rounded-[26px] mb-3 bg-white/5" />
              <div className="px-3 pb-3 space-y-2">
                <Skeleton className="h-3 w-3/4 bg-white/5 rounded" />
                <Skeleton className="h-3 w-1/2 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
