"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ZoomIn, RefreshCw } from "lucide-react";
import {
  PhotoLightbox,
  type LightboxPhoto,
} from "@/components/ui/photo-lightbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { PhotoItem } from "@/lib/services/photo.service";

interface PublicPhotoGridProps {
  /** First page of photos rendered by the server (SSR). */
  initialPhotos: PhotoItem[];
  /** Cursor for the second page — null if the first page was the last. */
  initialCursor: string | null;
  folderId: string;
  eventId: string;
}

const SKELETON_COUNT = 8;

export function PublicPhotoGrid({
  initialPhotos,
  initialCursor,
  folderId,
  eventId,
}: PublicPhotoGridProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialCursor !== null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxPhoto | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Track the current folder key so stale fetches are ignored on navigation.
  const folderKeyRef = useRef(`${eventId}:${folderId}`);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset all state when the folder/event changes (e.g. user navigates).
  useEffect(() => {
    const key = `${eventId}:${folderId}`;
    if (folderKeyRef.current !== key) {
      folderKeyRef.current = key;
      abortControllerRef.current?.abort();
      setPhotos(initialPhotos);
      setCursor(initialCursor);
      setHasMore(initialCursor !== null);
      setIsLoading(false);
      setFetchError(false);
    }
  }, [eventId, folderId, initialPhotos, initialCursor]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const fetchNextPage = useCallback(async () => {
    if (isLoading || !hasMore || !cursor) return;

    const currentKey = folderKeyRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setFetchError(false);

    try {
      const url = `/next-api/event/${eventId}/gallery/${folderId}/photos?cursor=${encodeURIComponent(cursor)}&limit=40`;
      const res = await fetch(url, { signal: controller.signal });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: {
        photos: PhotoItem[];
        nextCursor: string | null;
        hasMore: boolean;
      } = await res.json();

      // Discard result if the user navigated away during the fetch.
      if (folderKeyRef.current !== currentKey) return;

      setPhotos((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const fresh = data.photos.filter((p) => !existingIds.has(p.id));
        return [...prev, ...fresh];
      });
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err: any) {
      if (err?.name === "AbortError") return; // navigated away — ignore
      console.error("[PublicPhotoGrid] Failed to fetch next page:", err);
      if (folderKeyRef.current === currentKey) {
        setFetchError(true);
      }
    } finally {
      if (folderKeyRef.current === currentKey) {
        setIsLoading(false);
      }
    }
  }, [cursor, hasMore, isLoading, eventId, folderId]);

  // IntersectionObserver — fires when sentinel enters viewport.
  useEffect(() => {
    if (!hasMore || isLoading) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoading, fetchNextPage]);

  // ── Empty state ──────────────────────────────────────────────────────────
  if (photos.length === 0 && !isLoading) {
    return (
      <div className="py-20 text-center border border-dashed border-white/10 rounded-[40px] bg-white/[0.02]">
        <p className="text-white/40 font-medium">This folder is currently empty.</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Masonry photo grid ──────────────────────────────────────────── */}
      <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
        {photos.map((p) => (
          <div
            key={p.id}
            className="group relative mb-4 break-inside-avoid overflow-hidden rounded-[24px] border border-white/5 bg-[#141416] transition-all duration-300 hover:scale-[1.02] hover:border-white/20 shadow-xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt="Gallery photo"
              loading="lazy"
              className="w-full object-cover block"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => setLightbox({ url: p.url, name: `Photo ${p.id}` })}
                className="rounded-full bg-white/10 p-4 backdrop-blur-xl border border-white/20 transition-transform hover:scale-110"
              >
                <ZoomIn size={24} className="text-white" />
              </button>
            </div>
          </div>
        ))}

        {/* Skeleton placeholders while fetching the next page */}
        {isLoading &&
          Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="mb-4 break-inside-avoid overflow-hidden rounded-[24px] border border-white/5 bg-[#141416]"
            >
              <Skeleton
                className="w-full bg-white/5"
                style={{ height: `${180 + (i % 3) * 60}px` }}
              />
            </div>
          ))}
      </div>

      {/* ── Scroll sentinel — observed by IntersectionObserver ──────────── */}
      {hasMore && !fetchError && (
        <div ref={sentinelRef} className="h-10 w-full" aria-hidden />
      )}

      {/* ── Inline error + retry ────────────────────────────────────────── */}
      {fetchError && (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-white/40">Failed to load more photos.</p>
          <button
            onClick={() => {
              setFetchError(false);
              void fetchNextPage();
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {/* ── End of gallery indicator ────────────────────────────────────── */}
      {!hasMore && photos.length > 0 && (
        <div className="py-12 text-center text-xs font-bold uppercase tracking-widest text-slate-600">
          You&apos;ve reached the end of the gallery
        </div>
      )}

      <PhotoLightbox photo={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
