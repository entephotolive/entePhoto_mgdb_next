/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Camera, X, ZoomIn, Loader2 } from "lucide-react";
import type { PhotoItem } from "@/lib/services/photo.service";
import { useGlobalUpload } from "@/hooks/use-global-upload";

// ─── Active-window helper (mirrors upload-workspace.tsx) ─────────────────────
function isEventActive(eventDate: string | undefined): boolean {
  if (!eventDate) return false;
  const now = Date.now();
  const eventTime = new Date(eventDate).getTime();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  return now >= eventTime && now <= eventTime + TWENTY_FOUR_HOURS;
}

interface FolderPhotoGridProps {
  photos: PhotoItem[];
  folderId: string;
  eventId: string;
  eventTitle: string;
  /** ISO date string of the event – used to enforce the 24-hour upload window */
  eventDate?: string;
  userId: string;
}

export function FolderPhotoGrid({
  photos,
  folderId,
  eventId,
  eventTitle,
  eventDate,
  userId,
}: FolderPhotoGridProps) {
  const router = useRouter();
  const [lightbox, setLightbox] = useState<PhotoItem | null>(null);
  const [showInactiveWarning, setShowInactiveWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { items, addFiles, removeFile, completedCount } = useGlobalUpload();

  // ─── Refresh gallery after a successful upload ────────────────────────────
  const lastCompletedRef = useRef(completedCount);
  useEffect(() => {
    if (completedCount > lastCompletedRef.current) {
      lastCompletedRef.current = completedCount;
      router.refresh();
    }
  }, [completedCount, router]);

  // ─── Upload handler – blocks if event is outside its 24-hour window ───────
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    if (!isEventActive(eventDate)) {
      setShowInactiveWarning(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    addFiles(e.target.files, {
      eventId,
      eventName: eventTitle,
      uploadedBy: userId,
      folderId: folderId === "all" ? undefined : folderId,
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const active = isEventActive(eventDate);

  return (
    <div>
      {/* ── Upload Bar ── */}
      {folderId !== "all" && (
        <div className="mb-8 flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
            id="photo-upload-input"
          />
          <label
            htmlFor="photo-upload-input"
            className={`flex cursor-pointer items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold transition-all active:scale-95 ${
              active
                ? "bg-cyan-400 text-black shadow-[0_0_24px_rgba(34,211,238,0.35)] hover:bg-cyan-300 hover:shadow-[0_0_32px_rgba(34,211,238,0.5)]"
                : "cursor-not-allowed bg-slate-700 text-slate-400 opacity-60 shadow-none"
            }`}
            title={active ? "Upload photos to this folder" : "Event is not active – uploads are disabled"}
          >
            <Camera size={16} />
            ADD TO FOLDER
            {!active && (
              <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                (Inactive)
              </span>
            )}
          </label>
        </div>
      )}

      {/* ── Photo Grid ── */}
      {photos.length === 0 && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[32px] border border-white/5 bg-white/[0.02] py-24 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
            <Camera size={36} className="text-slate-600" />
          </div>
          <p className="text-lg font-semibold text-slate-500">No photos yet</p>
          <p className="text-sm text-slate-600">
            {folderId === "all"
              ? "This event's gallery is currently empty."
              : "Upload the first photo to this folder using the button above."}
          </p>
        </div>
      ) : (
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
          {/* Ongoing uploads */}
          {items.map((item) => {
            if (item.status === "completed") return null;
            return (
              <div
                key={item.id}
                className="group relative mb-4 break-inside-avoid overflow-hidden rounded-[20px] border border-white/5 bg-[#141416]"
              >
                <img
                  src={item.preview}
                  className="w-full object-cover opacity-60"
                  alt="Queue upload item"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                  {item.status === "uploading" ? (
                    <>
                      <Loader2 size={32} className="mb-2 animate-spin text-cyan-400" />
                      <span className="text-sm font-bold text-white">{item.progress}%</span>
                    </>
                  ) : item.status === "failed" ? (
                    <>
                      <X size={32} className="mb-2 text-rose-400" />
                      <span className="px-2 text-center text-[10px] font-bold uppercase text-rose-400">
                        {item.error}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-bold uppercase text-slate-300">Queued</span>
                  )}
                </div>
                {item.status !== "uploading" && (
                  <button
                    onClick={() => removeFile(item.id)}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white hover:bg-rose-500"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Existing photos */}
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative mb-4 break-inside-avoid overflow-hidden rounded-[20px] border border-white/5 bg-[#141416] transition-all duration-300 hover:scale-[1.02] hover:border-white/10"
            >
              <div className="relative">
                <img
                  src={photo.url}
                  alt="Gallery photo"
                  className="w-full object-cover"
                  loading="lazy"
                  style={{ display: "block" }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => setLightbox(photo)}
                    className="rounded-full bg-white/20 p-3 backdrop-blur-sm transition-transform hover:scale-110"
                  >
                    <ZoomIn size={20} className="text-white" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            <X size={20} />
          </button>
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.url}
              alt="Gallery photo"
              className="max-h-[90vh] w-auto rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* ── Inactive Event Warning Modal ── */}
      {showInactiveWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowInactiveWarning(false)}
          />
          <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/10 bg-[#141416] p-6 text-center shadow-panel animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <AlertCircle size={24} className="text-amber-400" />
            </div>
            <div>
              <h3 className="mb-1 text-lg font-bold text-white">Event is Inactive</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                Photos can only be uploaded during the event&apos;s active 24-hour window.
                This event is currently outside that window.
              </p>
            </div>
            <div className="mt-2">
              <button
                onClick={() => setShowInactiveWarning(false)}
                className="w-full rounded-xl bg-white/10 py-2.5 font-semibold text-white transition-colors hover:bg-white/20"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
