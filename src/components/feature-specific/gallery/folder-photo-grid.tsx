/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Camera, X, ZoomIn, Loader2, Trash2, Users } from "lucide-react";
import type { PhotoItem } from "@/lib/services/photo.service";
import {
  deletePhotoAction,
  getFolderPhotosPage,
} from "@/app/photographer/(panel)/gallery/[slug]/action";
import { useGlobalUpload } from "@/hooks/use-global-upload";
import { applyWatermark } from "@/lib/utils/watermark";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Active-window helper ───────────────────────────────────────────────────
function isEventActive(eventDate: string | undefined): boolean {
  if (!eventDate) return false;
  const now = Date.now();
  const eventTime = new Date(eventDate).getTime();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  return now >= eventTime && now <= eventTime + TWENTY_FOUR_HOURS;
}

interface FolderPhotoGridProps {
  initialPhotos?: PhotoItem[];
  photos?: PhotoItem[];
  initialCursor?: string | null;
  folderId: string;
  eventId: string;
  eventTitle: string;
  /** ISO date string of the event – used to enforce the 24-hour upload window */
  eventDate?: string;
  userId: string;
  folderName?: string;
}

export function FolderPhotoGrid({
  initialPhotos,
  photos: photosProp,
  initialCursor = null,
  folderId,
  eventId,
  eventTitle,
  eventDate,
  userId,
  folderName = "",
}: FolderPhotoGridProps) {
  const router = useRouter();
  const [photos, setPhotos] = useState<PhotoItem[]>(
    initialPhotos ?? photosProp ?? [],
  );
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isPending, startTransition] = useTransition();

  const [lightbox, setLightbox] = useState<PhotoItem | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<PhotoItem | null>(null);
  const [showInactiveWarning, setShowInactiveWarning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { items, addFiles, removeFile, completedCount } = useGlobalUpload();

  // Resync state when navigating between different folders/events
  const folderKey = `${eventId}:${folderId}`;
  const prevFolderKeyRef = useRef(folderKey);
  useEffect(() => {
    if (prevFolderKeyRef.current !== folderKey) {
      prevFolderKeyRef.current = folderKey;
      setPhotos(initialPhotos ?? photosProp ?? []);
      setCursor(initialCursor);
    }
  }, [folderKey, initialPhotos, photosProp, initialCursor]);

  // Merge any new photos from server refreshes (e.g. after upload) without blowing away pagination
  useEffect(() => {
    const freshPhotos = initialPhotos ?? photosProp;
    if (freshPhotos && freshPhotos.length > 0) {
      setPhotos((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newPhotos = freshPhotos.filter((p) => !existingIds.has(p.id));
        if (newPhotos.length > 0) {
          const combined = [...newPhotos, ...prev];
          combined.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          return combined;
        }
        return prev;
      });
    }
  }, [initialPhotos, photosProp]);

  // ─── IntersectionObserver for Infinite Scroll ────────────────────────────
  useEffect(() => {
    if (!cursor || isPending) return;
    const observerTarget = sentinelRef.current;
    if (!observerTarget) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && cursor && !isPending) {
          startTransition(async () => {
            const res = await getFolderPhotosPage(folderId, eventId, cursor);
            if (res && res.photos) {
              setPhotos((prev) => {
                const existingIds = new Set(prev.map((p) => p.id));
                const fresh = res.photos.filter((p) => !existingIds.has(p.id));
                return [...prev, ...fresh];
              });
              setCursor(res.nextCursor);
            }
          });
        }
      },
      { rootMargin: "250px" },
    );

    observer.observe(observerTarget);
    return () => observer.disconnect();
  }, [cursor, isPending, folderId, eventId]);

  // ─── Refresh gallery after a successful upload ────────────────────────────
  const lastCompletedRef = useRef(completedCount);
  useEffect(() => {
    if (completedCount > lastCompletedRef.current) {
      lastCompletedRef.current = completedCount;
      router.refresh();
    }
  }, [completedCount, router]);

  // ─── Upload handler – blocks if event is outside its 24-hour window ───────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    if (!isEventActive(eventDate)) {
      setShowInactiveWarning(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const filesToUpload = Array.from(e.target.files);
    const isCover = folderName.toLowerCase() === "cover photo";

    if (isCover && filesToUpload.length > 0) {
      try {
        const watermarkedFile = await applyWatermark(
          filesToUpload[0],
          "/name_logo.png",
        );
        filesToUpload[0] = watermarkedFile;
      } catch (err) {
        console.error("Failed to apply watermark", err);
      }
    }

    addFiles(filesToUpload, {
      eventId,
      eventName: eventTitle,
      uploadedBy: userId,
      folderId: folderId === "all" ? undefined : folderId,
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Delete confirmation handler (Optimistic state update) ───────────────
  const handleDeleteConfirm = async () => {
    if (!photoToDelete) return;
    setIsDeleting(true);
    const deletedId = photoToDelete.id;
    const res = await deletePhotoAction(deletedId);
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== deletedId));
      setPhotoToDelete(null);
      setLightbox(null);
    }
    setIsDeleting(false);
  };

  const active = isEventActive(eventDate);
  const isCoverPhotoFolder = folderName.toLowerCase() === "cover photo";
  const hideUploadBar =
    isCoverPhotoFolder && (photos.length > 0 || items.length > 0);

  return (
    <div>
      {/* ── Upload Bar ── */}
      {folderId !== "all" && !hideUploadBar && (
        <div className="mb-8 flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={!isCoverPhotoFolder}
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
            title={
              active
                ? "Upload photos to this folder"
                : "Event is not active – uploads are disabled"
            }
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
                      <Loader2
                        size={32}
                        className="mb-2 animate-spin text-cyan-400"
                      />
                      <span className="text-sm font-bold text-white">
                        {item.progress}%
                      </span>
                    </>
                  ) : item.status === "failed" ? (
                    <>
                      <X size={32} className="mb-2 text-rose-400" />
                      <span className="px-2 text-center text-[10px] font-bold uppercase text-rose-400">
                        {item.error}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-bold uppercase text-slate-300">
                      Queued
                    </span>
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

          {/* Existing photos — ONLY Zoom icon on hover */}
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative mb-4 break-inside-avoid overflow-hidden rounded-[24px] border border-white/5 bg-[#141416] transition-all duration-300 hover:scale-[1.02] hover:border-white/20 shadow-xl"
            >
              <div className="relative">
                <img
                  src={photo.url}
                  alt="Gallery photo"
                  className="w-full object-cover block"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => setLightbox(photo)}
                    className="rounded-full bg-white/10 p-4 backdrop-blur-xl border border-white/20 transition-transform hover:scale-110 shadow-lg"
                    title="Zoom Photo"
                  >
                    <ZoomIn size={24} className="text-white" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Skeleton placeholders while fetching next page */}
          {isPending && (
            <>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="mb-4 break-inside-avoid overflow-hidden rounded-[24px] border border-white/5 bg-[#141416]"
                >
                  <Skeleton className="h-64 w-full rounded-[24px] bg-white/5" />
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Scroll Sentinel & End of Feed Indicator ── */}
      {cursor ? (
        <div
          ref={sentinelRef}
          className="my-8 flex h-12 w-full items-center justify-center"
        >
          {isPending && (
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-400/80">
              <Loader2 size={14} className="animate-spin" /> Loading captures...
            </span>
          )}
        </div>
      ) : (
        photos.length > 0 && (
          <div className="py-12 text-center text-xs font-bold uppercase tracking-widest text-slate-600">
            You&apos;ve reached the end of the gallery
          </div>
        )
      )}

      {/* ── Lightbox Modal ── */}
      <Dialog
        open={!!lightbox}
        onOpenChange={(open) => !open && setLightbox(null)}
      >
        <DialogContent showCloseButton={false} className="flex flex-col items-center justify-between max-w-[95vw] w-full md:max-w-5xl max-h-[92vh] rounded-[32px] border border-white/10 bg-[#0d0d0f]/90 p-4 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] backdrop-blur-3xl outline-none">
          {lightbox && (
            <div className="flex flex-col items-center justify-between w-full h-full gap-4">
              {/* Header / Title */}
              <div className="flex items-center justify-between w-full pb-3 border-b border-white/10 px-2">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
                    Captured Moment
                  </h3>
                  <p className="text-xs text-slate-400">{eventTitle}</p>
                </div>
                <button
                  onClick={() => setLightbox(null)}
                  className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                  title="Close Lightbox"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Center Image Display */}
              <div className="relative flex w-full flex-1 min-h-0 justify-center items-center rounded-2xl bg-black/50 ring-1 ring-white/10 overflow-hidden p-2">
                <img
                  src={lightbox.url}
                  alt="Gallery photo"
                  className="max-h-[62vh] md:max-h-[68vh] w-auto max-w-full object-contain rounded-lg shadow-2xl"
                />
              </div>

              {/* Bottom Actions Bar with Delete Button */}
              <TooltipProvider delayDuration={150}>
                <div className="flex items-center gap-4 rounded-full border border-white/15 bg-white/10 px-6 py-2.5 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] backdrop-blur-2xl transition-all">
                  
                  {/* Face Count Display */}
                  <div className="flex items-center gap-2 pr-2 text-white/90">
                    <Users size={18} className="text-cyan-400" />
                    <span className="text-sm font-semibold">
                      {lightbox.faceCount ?? 0} {(lightbox.faceCount === 1) ? 'Face' : 'Faces'}
                    </span>
                  </div>
                  
                  <div className="w-[1px] h-6 bg-white/20 mx-1"></div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="danger"
                        size="icon"
                        onClick={() => setPhotoToDelete(lightbox)}
                        className="rounded-full h-11 w-11 bg-rose-500/80 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all hover:scale-105 hover:bg-rose-600"
                      >
                        <Trash2 size={20} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="border border-white/20 bg-black/80 text-white text-xs backdrop-blur-xl"
                    >
                      <p>Delete Photo</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Modal ── */}
      <Dialog
        open={!!photoToDelete}
        onOpenChange={(open) => !open && !isDeleting && setPhotoToDelete(null)}
      >
        <DialogContent className="bg-[#141416] border-white/10 text-white sm:max-w-[420px] rounded-3xl p-6 shadow-panel">
          <DialogHeader className="text-center sm:text-left">
            <div className="mx-auto sm:mx-0 w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-3">
              <AlertCircle size={24} className="text-rose-400" />
            </div>
            <DialogTitle className="text-xl font-bold text-white">
              Delete Photo?
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm leading-relaxed mt-1">
              Are you sure you want to delete this photo from the gallery? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPhotoToDelete(null)}
              disabled={isDeleting}
              className="bg-transparent border-white/10 text-white hover:bg-white/10 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-rose-500 hover:bg-rose-600 text-white border-0 rounded-xl shadow-lg shadow-rose-500/20"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Photo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <h3 className="mb-1 text-lg font-bold text-white">
                Event is Inactive
              </h3>
              <p className="text-sm leading-relaxed text-slate-400">
                Photos can only be uploaded during the event&apos;s active
                24-hour window. This event is currently outside that window.
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
