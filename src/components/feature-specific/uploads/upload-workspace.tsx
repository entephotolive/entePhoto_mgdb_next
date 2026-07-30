/* eslint-disable @next/next/no-img-element */
"use client";

import {
  AlertCircle,
  ImageIcon,
  UploadCloud,
  X,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Check,
} from "lucide-react";
import React, { useRef, useState, useEffect, useMemo, useCallback, memo } from "react";
import { useGlobalUpload } from "@/hooks/use-global-upload";
import { useUploadStore } from "@/store/upload-store";
import { EventListItem } from "@/types";
import { EventSelectDropdown } from "@/components/shared/event-select-dropdown";
import { EVENT_UPLOAD_WINDOW_MS, MAX_UPLOAD_SIZE_MB } from "@/lib/utils/upload-constants";
import { Skeleton } from "@/components/ui/skeleton";
import { getFolderPhotosPage } from "@/app/photographer/(panel)/gallery/[slug]/action";
import type { PhotoItem } from "@/lib/services/photo.service";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  detectInAppBrowser,
  openInSystemBrowser,
  type InAppBrowserResult,
} from "@/lib/utils/in-app-browser";

interface UploadWorkspaceProps {
  events: EventListItem[];
  userId: string;
}

interface QueueItemCardProps {
  id: string;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}

/**
 * Fine-grained Memoized Queue Item Card.
 * Subscribes ONLY to its own item in the Zustand store.
 * When File #37 updates progress from 40% to 50%, only card #37 re-renders;
 * cards #1-36 and #38-50 do NOT re-render.
 */
const UploadQueueItemCard = memo(function UploadQueueItemCard({
  id,
  onRemove,
  onRetry,
}: QueueItemCardProps) {
  const item = useUploadStore(
    useCallback((s) => s.items.find((i) => i.id === id), [id]),
  );

  useEffect(() => {
    if (!item) return;
    if (item.status === "completed" || item.status === "duplicate") {
      console.log(`[UploadQueue] timer started for item ${item.id} (${item.file.name})`);
      const timer = setTimeout(() => {
        console.log(`[UploadQueue] timer fired, removing item ${item.id} (${item.file.name})`);
        useUploadStore.getState().markItemFlashed(item.id);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [item?.id, item?.status]);

  if (!item) return null;

  const isCompressing =
    item.status === "queued" ||
    (item.status === "uploading" && (item.progress || 0) === 0);

  const showSkeleton = isCompressing;
  const isCompletedOrDuplicate =
    item.status === "completed" || item.status === "duplicate";

  return (
    <div className="relative group bg-white/5 border border-white/5 rounded-[32px] p-2 overflow-hidden transition-all hover:bg-white/[0.08] hover:scale-[1.02]">
      <div className="aspect-square rounded-[26px] overflow-hidden relative mb-3 bg-black/20">
        {showSkeleton ? (
          <Skeleton className="w-full h-full absolute inset-0 bg-white/5" />
        ) : item.preview ? (
          <img
            src={item.preview}
            alt={item.file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full absolute inset-0 bg-white/5 flex flex-col items-center justify-center p-3 text-center">
            <ImageIcon className="text-slate-500 mb-1" size={24} />
            <span className="text-[10px] text-slate-400 font-medium truncate max-w-full px-1">
              {item.file.name}
            </span>
          </div>
        )}

        {/* Success Flash Overlay for completed / duplicate items (~600ms) */}
        {isCompletedOrDuplicate && (
          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center flex-col p-3 backdrop-blur-sm z-10 animate-in fade-in duration-200">
            <div className="w-10 h-10 rounded-full border-2 border-emerald-400 bg-emerald-500/30 flex items-center justify-center mb-1 shrink-0">
              <Check className="text-emerald-400" size={20} />
            </div>
            <p className="text-[11px] font-bold text-emerald-300 text-center uppercase tracking-wider">
              {item.status === "completed" ? "Uploaded ✓" : "Duplicate"}
            </p>
          </div>
        )}

        {item.status === "uploading" && !isCompressing && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center flex-col p-4 backdrop-blur-sm">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  className="text-white/10 stroke-current"
                  strokeWidth="4"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                />
                <circle
                  className="text-cyan-400 stroke-current transition-all duration-300"
                  strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={
                    2 * Math.PI * 40 * (1 - (item.progress || 0) / 100)
                  }
                  strokeLinecap="round"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                {item.progress}%
              </span>
            </div>
          </div>
        )}

        {item.status === "paused" && (
          <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center flex-col p-3 backdrop-blur-sm z-10">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500/50 flex items-center justify-center mb-1.5 shrink-0">
              <RefreshCw className="text-amber-400 animate-spin" size={16} />
            </div>
            <p
              className="text-[11px] font-semibold text-amber-100/90 text-center mb-2 line-clamp-3 leading-tight"
              title={item.error || "Paused while backgrounded"}
            >
              {item.error || "Paused — resuming..."}
            </p>
          </div>
        )}

        {item.status === "failed" && (
          <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center flex-col p-3 backdrop-blur-sm z-10">
            <div className="w-8 h-8 rounded-full border-2 border-rose-500/50 flex items-center justify-center mb-1.5 shrink-0">
              <AlertCircle className="text-rose-500" size={16} />
            </div>
            {/* M18: min 11px, line-clamp-3, title for full message on long-press / hover */}
            <p
              className="text-[11px] font-semibold text-rose-100/90 text-center mb-2 line-clamp-3 leading-tight"
              title={item.error || "Upload failed"}
            >
              {item.error || "Upload failed"}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRetry(item.id);
              }}
              className="bg-rose-500/80 hover:bg-rose-500 active:bg-rose-600 text-white rounded-full p-2 transition-colors shadow-lg shadow-black/20"
              title="Retry Upload"
              aria-label="Retry upload"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        )}

        {!isCompletedOrDuplicate && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
            className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 bg-black/50 hover:bg-rose-500/80 active:bg-rose-600 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 z-20 transition-all
              opacity-60 hover:opacity-100 active:opacity-100
              sm:scale-0 sm:opacity-0 sm:group-hover:scale-100 sm:group-hover:opacity-100"
            title="Remove file"
            aria-label="Remove file"
          >
            <X size={13} />
          </button>
        )}
      </div>
      <div className="px-3 pb-3">
        <div className="flex justify-between items-start mb-1">
          <p className="text-xs font-semibold text-slate-200 truncate pr-2">
            {item.file.name}
          </p>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-[10px] text-slate-500 font-medium">
            {(item.file.size / (1024 * 1024)).toFixed(1)} MB
          </p>
          <span
            className={`text-[10px] font-bold uppercase tracking-tighter ${
              item.status === "completed"
                ? "text-cyan-400"
                : item.status === "failed"
                  ? "text-rose-400"
                  : item.status === "duplicate"
                    ? "text-amber-400"
                    : item.status === "uploading"
                      ? "text-sky-300 animate-pulse"
                      : "text-slate-500"
            }`}
          >
            {item.status}
          </span>
        </div>
      </div>
    </div>
  );
});

/**
 * Returns true ONLY when uploads are permitted for the given event.
 */
function isEventActive(event: EventListItem | undefined): boolean {
  if (!event || !event.date) return false;
  const now = Date.now();
  const eventTime = new Date(event.date).getTime();
  return now >= eventTime && now <= eventTime + EVENT_UPLOAD_WINDOW_MS;
}

function RecentUploadsGrid({
  eventId,
  eventTitle,
  eventDate,
  userId,
  completedCount,
}: {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  userId: string;
  completedCount: number;
}) {
  const [photos, setPhotos] = useState<PhotoItem[] | null>(null);

  useEffect(() => {
    if (!eventId) return;
    let active = true;

    getFolderPhotosPage("all", eventId, null).then((res) => {
      if (active) {
        // Only keep the latest 10
        setPhotos(res.photos.slice(0, 10));
      }
    });

    return () => {
      active = false;
    };
  }, [eventId, completedCount]);

  if (photos === null) {
    return (
      <div className="mt-16 border-t border-white/5 pt-12">
        <h3 className="text-xl font-bold text-white mb-6">Recent Uploads</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={`ws-skeleton-${i}`}
              className="aspect-square overflow-hidden rounded-[20px] border border-white/5 bg-[#141416]"
            >
              <Skeleton className="h-full w-full rounded-[20px] bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (photos.length === 0) return null;

  return (
    <div className="mt-16 border-t border-white/5 pt-12">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Recent Uploads</h3>
        <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest">
          Latest {photos.length} photo{photos.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="aspect-square overflow-hidden rounded-[20px] border border-white/5 bg-[#141416] transition-transform hover:scale-[1.03]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt="Recent upload"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function UploadWorkspace({ events, userId }: UploadWorkspaceProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showInactiveWarning, setShowInactiveWarning] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);
  
  const QUEUE_PAGE_SIZE = 24;
  const [visibleLimit, setVisibleLimit] = useState(QUEUE_PAGE_SIZE);
  const completedTimestampsRef = useRef<Map<string, number>>(new Map());
  const [flashTick, setFlashTick] = useState(0);

  // ── In-app browser detection ──────────────────────────────────────────────
  // Detected synchronously once on mount. UA sniffing is the only reliable
  // approach here — in-app browsers present as Safari/Chrome but inject
  // proprietary UA tokens.
  const [inAppBrowser, setInAppBrowser] = useState<InAppBrowserResult>(
    { isInAppBrowser: false, appName: null }
  );
  const [openBrowserResult, setOpenBrowserResult] = useState<
    "opened" | "copied" | "failed" | null
  >(null);

  useEffect(() => {
    setInAppBrowser(detectInAppBrowser());
  }, []);

  const {
    addFiles,
    removeFile,
    clearAll,
    isUploading,
    setUploadContext,
    retryUpload,
    completedCount,
  } = useGlobalUpload();

  const items = useUploadStore((s) => s.items);
  const flashedItemIds = useUploadStore((s) => s.flashedItemIds);
  const ensurePreview = useUploadStore((s) => s.ensurePreview);
  const revokePreview = useUploadStore((s) => s.revokePreview);

  // Renderable items: active queue items (queued, uploading, paused, failed) OR completed/duplicate items before the 600ms timer fires
  const renderableItems = useMemo(() => {
    return items.filter((item) => !flashedItemIds.includes(item.id));
  }, [items, flashedItemIds]);

  // Bounded page window of visible items (backfills automatically as completed items leave renderableItems)
  const visibleRenderableItems = useMemo(() => {
    return renderableItems.slice(0, visibleLimit);
  }, [renderableItems, visibleLimit]);

  const hiddenCount = Math.max(0, renderableItems.length - visibleLimit);

  // Lazy preview management: attach preview blob URLs to visible page, revoke for hidden
  useEffect(() => {
    const visibleSet = new Set(visibleRenderableItems.map((i) => i.id));
    visibleRenderableItems.forEach((item) => {
      if (!item.preview && item.status !== "completed" && item.status !== "duplicate") {
        ensurePreview(item.id);
      }
    });
    items.forEach((item) => {
      if (!visibleSet.has(item.id) && item.preview) {
        revokePreview(item.id);
      }
    });
  }, [visibleRenderableItems, items, ensurePreview, revokePreview]);

  const [columns, setColumns] = useState(2);

  useEffect(() => {
    const updateCols = () => {
      if (window.innerWidth >= 1024) setColumns(4);
      else setColumns(2);
    };
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, []);

  const rowCount = Math.ceil(visibleRenderableItems.length / columns);
  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => (columns === 4 ? 320 : 220),
    overscan: 3,
  });

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (a.date && b.date) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return 0;
    });
  }, [events]);

  useEffect(() => {
    if (isInitialized || sortedEvents.length === 0) return;
    
    const storedEventId = localStorage.getItem("photo-ceremony-selected-event-id");
    const isValidStored = storedEventId && sortedEvents.some(e => e.id === storedEventId);

    const idToSelect = isValidStored ? storedEventId : sortedEvents[0].id;
    
    setSelectedEventId(idToSelect);
    const ev = sortedEvents.find(e => e.id === idToSelect);
    if (ev) {
      setUploadContext({
        eventId: idToSelect,
        eventName: ev.title || "event",
        uploadedBy: userId,
      });
    }
    localStorage.setItem("photo-ceremony-selected-event-id", idToSelect);
    setIsInitialized(true);
  }, [isInitialized, sortedEvents, userId, setUploadContext]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const storeItems = useUploadStore.getState().items;

      if (document.visibilityState === "hidden") {
        // App/tab backgrounded or screen locked — mark in-flight items as 'paused'
        // so the UI displays a paused badge instead of letting them error out from a killed socket.
        const uploadingItems = storeItems.filter((i) => i.status === "uploading");
        uploadingItems.forEach((item) => {
          useUploadStore.getState()._updateItem(item.id, {
            status: "paused",
            error: "Paused while backgrounded — resuming...",
          });
        });
        return;
      }

      if (document.visibilityState === "visible") {
        // App/tab foregrounded or screen unlocked — auto-resume any paused or interrupted items.
        const itemsToResume = storeItems.filter(
          (i) => i.status === "paused" || i.status === "uploading",
        );
        if (itemsToResume.length === 0) return;

        itemsToResume.forEach((item) => {
          retryUpload(item.id);
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [retryUpload]);

  const handleEventChange = (newId: string) => {
    setSelectedEventId(newId);
    localStorage.setItem("photo-ceremony-selected-event-id", newId);
    const selectedEvent = sortedEvents.find((e) => e.id === newId);
    if (selectedEvent) {
      setUploadContext({
        eventId: newId,
        eventName: selectedEvent.title || "event",
        uploadedBy: userId,
      });
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-48 sm:pb-32">

      {/* ── In-App Browser Warning Banner ── */}
      {inAppBrowser.isInAppBrowser && (
        <div className="relative flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-4 text-sm">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-400" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-300 leading-snug">
              {inAppBrowser.appName
                ? `You're using ${inAppBrowser.appName}'s browser`
                : "You're using an in-app browser"}
            </p>
            <p className="mt-1 text-xs text-amber-200/70 leading-relaxed">
              This browser only allows selecting{" "}
              <span className="font-bold">one photo at a time</span>. Open in
              Safari or Chrome to select multiple photos at once.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  const result = await openInSystemBrowser();
                  setOpenBrowserResult(result);
                  if (result === "copied") {
                    setTimeout(() => setOpenBrowserResult(null), 3000);
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-bold text-black transition-all hover:bg-amber-300 active:scale-95"
              >
                <ExternalLink size={12} />
                Open in browser
              </button>
              {openBrowserResult === "copied" && (
                <span className="text-xs font-semibold text-amber-300 animate-in fade-in">
                  Link copied to clipboard ✓
                </span>
              )}
              {openBrowserResult === "failed" && (
                <span className="text-xs text-amber-200/70">
                  Couldn't open — copy this URL manually.
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      <section className="mb-6 sm:mb-10 flex flex-col md:flex-row md:items-end justify-end gap-4 sm:gap-6">
        <div className="flex flex-col w-full md:w-auto md:items-end">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-cyan-500/80 mb-2">
            Select Event to Upload
          </label>
          {!isInitialized && events.length > 0 ? (
            <Skeleton className="h-11 w-64 rounded-2xl bg-white/5" />
          ) : (
            <EventSelectDropdown 
              events={sortedEvents}
              value={selectedEventId}
              onChange={handleEventChange}
              isLoading={!isInitialized && events.length > 0}
            />
          )}
        </div>
      </section>

      <div
        onClick={() => {
          if (events.length === 0) {
            setShowWarning(true);
            return;
          }
          const selectedEvent = events.find((e) => e.id === selectedEventId);
          if (selectedEvent && !isEventActive(selectedEvent)) {
            setShowInactiveWarning(true);
            return;
          }
          inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (events.length > 0 && isInitialized && selectedEventId) {
            setIsDragging(true);
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (events.length === 0) {
            setShowWarning(true);
            return;
          }
          if (!isInitialized || !selectedEventId) {
            return;
          }
          const selectedEvent = events.find((e) => e.id === selectedEventId);
          if (selectedEvent && !isEventActive(selectedEvent)) {
            setShowInactiveWarning(true);
            return;
          }
          addFiles(event.dataTransfer.files, {
            eventId: selectedEventId,
            eventName: selectedEvent?.title || "event",
            uploadedBy: userId,
          });
        }}
        className={`w-full h-52 sm:h-80 border-2 border-dashed rounded-[24px] sm:rounded-[40px] flex flex-col items-center justify-center group transition-all cursor-pointer relative overflow-hidden ${
          isDragging
            ? "border-cyan-400 bg-cyan-400/10 scale-[1.02]"
            : "border-white/10 hover:border-cyan-500/30 bg-gradient-to-b from-white/[0.02] to-transparent"
        }`}
      >
        {/* M04: DO NOT add a `capture` attribute here (e.g., capture="environment").
             Omitting capture ensures mobile Safari & Android Chrome show the full native picker
             allowing users to choose existing photos from their Photo Library, take a new photo,
             or select files from iCloud/Google Drive. Adding capture forces camera-only capture. */}
        {/* M15: accept uses image/* as the primary wildcard (works on all browsers).
             The explicit MIME types image/jpeg etc. are redundant but harmless on desktop.
             .heic/.heif extension hints are specifically for iOS Safari's file picker, which
             uses extensions rather than MIME types for HEIC. The image/heic + image/heif
             MIME entries have no effect on Android Chrome (which ignores non-standard MIMEs
             and respects only image/* and the extension hints). */}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.heic,.heif"
          className="hidden"
          onChange={(event) => {
            if (event.target.files) {
              const selectedEvent = events.find(
                (e) => e.id === selectedEventId,
              );
              if (selectedEvent && !isEventActive(selectedEvent)) {
                setShowInactiveWarning(true);
                // clear the input so it can be selected again if needed
                if (inputRef.current) inputRef.current.value = "";
                return;
              }
              addFiles(event.target.files, {
                eventId: selectedEventId,
                eventName: selectedEvent?.title || "event",
                uploadedBy: userId,
              });
            }
          }}
        />
        <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform relative z-10">
          {isUploading ? (
            <Loader2 className="text-cyan-400 animate-spin" size={32} />
          ) : (
            <UploadCloud className="text-cyan-400" size={32} />
          )}
        </div>
        {/* M03: Mobile CTA — distinct from desktop drag-and-drop copy.
             Hidden on sm+ (desktop shows "Drag & Drop" / "click to browse").
             Mobile has no drag-and-drop from Photos, so needs its own clear affordance. */}
        <div className="sm:hidden flex flex-col items-center gap-1 relative z-10 mb-2">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
            <ImageIcon size={18} className="shrink-0" />
            Tap to select photos
          </div>
          <p className="text-xs text-slate-500 text-center">
            Choose from your photo library
          </p>
        </div>

        {/* Desktop CTA — hidden on mobile */}
        <h3 className="hidden sm:flex text-base sm:text-xl font-semibold text-slate-200 mb-1 relative z-10 items-center gap-2">
          {isUploading ? "Processing & Uploading batch..." : "Drag & Drop photos here"}
        </h3>
        <p className="hidden sm:block text-slate-500 text-sm mb-8 relative z-10">
          {isUploading ? (
            <span className="text-cyan-400 animate-pulse">Upload in progress — feel free to add more photos</span>
          ) : (
            <>
              or{" "}
              <span className="text-cyan-400 hover:underline">
                click to browse files
              </span>
            </>
          )}
        </p>
        <div className="flex flex-wrap justify-center gap-4 sm:gap-8 relative z-10">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <AlertCircle size={14} className="opacity-50" />
            Max File Size: {MAX_UPLOAD_SIZE_MB}MB
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <ImageIcon size={14} className="opacity-50" />
            Supported Formats: JPG, PNG, WebP, HEIC
          </div>
        </div>
      </div>

      <section className="mt-8 sm:mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Queue ({renderableItems.length} active / {items.length} total)
            </h4>
            {isUploading && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
                <Loader2 size={12} className="animate-spin" /> Processing batch
              </span>
            )}
            {/* M20 & M19: Data usage estimate & micro-copy */}
            {items.length > 0 && (() => {
              const totalRawBytes = items.reduce((sum, item) => sum + (item.file?.size || 0), 0);
              const totalRawMb = (totalRawBytes / (1024 * 1024)).toFixed(1);
              // Estimated compressed size (~70% reduction or max ~1.5MB per photo)
              const estCompressedMb = ((totalRawBytes * 0.3) / (1024 * 1024)).toFixed(1);

              return (
                <span
                  className="text-[10px] font-medium text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10"
                  title="Photos are compressed client-side before uploading to save mobile bandwidth"
                >
                  Est. upload: ~{estCompressedMb} MB <span className="text-slate-500">(from {totalRawMb} MB raw)</span>
                </span>
              );
            })()}
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] font-bold text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 uppercase tracking-widest"
            >
              <X size={12} /> Clear all
            </button>
          )}
        </div>

        {visibleRenderableItems.length > 0 && (() => {
          const visibleRows = Math.ceil(visibleRenderableItems.length / columns);
          const visibleVirtualItems = virtualizer.getVirtualItems().filter(
            (vr) => vr.index < visibleRows,
          );
          const visibleHeight = visibleVirtualItems.length > 0
            ? visibleVirtualItems[visibleVirtualItems.length - 1].end
            : 0;

          return (
            <>
              <div
                style={{
                  height: `${visibleHeight}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {visibleVirtualItems.map((virtualRow) => {
                  const startIndex = virtualRow.index * columns;
                  const rowItems = visibleRenderableItems.slice(startIndex, startIndex + columns);

                  return (
                    <div
                      key={virtualRow.index}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {rowItems.map((item) => (
                        <UploadQueueItemCard
                          key={item.id}
                          id={item.id}
                          onRemove={removeFile}
                          onRetry={retryUpload}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Show more / pagination button */}
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setVisibleLimit((prev) => prev + QUEUE_PAGE_SIZE)}
                  className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                >
                  <ChevronDown size={16} /> Show {Math.min(QUEUE_PAGE_SIZE, hiddenCount)} more ({hiddenCount} remaining)
                </button>
              )}
            </>
          );
        })()}
      </section>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-8 mt-6">
        <div className="flex-1 w-full md:w-auto">
          {renderableItems.length > 0 && (
            <p className="text-xs text-slate-500 italic">
              {renderableItems.length} files in active queue. Click &quot;START UPLOAD&quot; on the
              widget to begin.
            </p>
          )}
        </div>
      </div>

      {/* ── Recent Uploads Grid ── */}
      {selectedEventId && (
        <RecentUploadsGrid
          eventId={selectedEventId}
          eventTitle={events.find((e) => e.id === selectedEventId)?.title || "Event"}
          eventDate={events.find((e) => e.id === selectedEventId)?.date || ""}
          userId={userId}
          completedCount={completedCount}
        />
      )}

      {/* Warning Modal for No Events */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowWarning(false)}
          />
          <div className="relative bg-[#141416] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-panel flex flex-col gap-4 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-1">
              <AlertCircle size={24} className="text-rose-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-1">
                No Events Found
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                You need to create an event first before you can upload photos.
                Please go to your events dashboard to set one up.
              </p>
            </div>
            <div className="mt-2">
              <button
                onClick={() => setShowWarning(false)}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal for Inactive Event */}
      {showInactiveWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowInactiveWarning(false)}
          />
          <div className="relative bg-[#141416] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-panel flex flex-col gap-4 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-1">
              <AlertCircle size={24} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-1">
                Event is Inactive
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                This event is marked as inactive. Uploads are rejected for
                inactive events.
              </p>
            </div>
            <div className="mt-2">
              <button
                onClick={() => setShowInactiveWarning(false)}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 rounded-xl transition-colors"
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
