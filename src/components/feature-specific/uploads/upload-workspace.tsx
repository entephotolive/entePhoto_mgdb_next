/* eslint-disable @next/next/no-img-element */
"use client";

import {
  AlertCircle,
  ImageIcon,
  UploadCloud,
  X,
  RefreshCw,
  Loader2,
} from "lucide-react";
import React, { useRef, useState, useEffect, useMemo, useCallback, memo } from "react";
import { useGlobalUpload } from "@/hooks/use-global-upload";
import { useUploadStore } from "@/store/upload-store";
import { EventListItem } from "@/types";
import { EventSelectDropdown } from "@/components/shared/event-select-dropdown";
import { EVENT_UPLOAD_WINDOW_MS, MAX_UPLOAD_SIZE_MB } from "@/lib/utils/upload-constants";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderPhotoGrid } from "@/components/feature-specific/gallery/folder-photo-grid";
import { getFolderPhotosPage } from "@/app/photographer/(panel)/gallery/[slug]/action";
import type { PhotoItem } from "@/lib/services/photo.service";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

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

  if (!item) return null;

  const isCompressing =
    item.status === "queued" ||
    (item.status === "uploading" && (item.progress || 0) === 0);

  return (
    <div className="relative group bg-white/5 border border-white/5 rounded-[32px] p-2 overflow-hidden transition-all hover:bg-white/[0.08] hover:scale-[1.02]">
      <div className="aspect-square rounded-[26px] overflow-hidden relative mb-3 bg-black/20">
        {isCompressing ? (
          <Skeleton className="w-full h-full absolute inset-0 bg-white/5" />
        ) : (
          <img
            src={item.preview}
            alt={item.file.name}
            className="w-full h-full object-cover"
          />
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

        {item.status === "failed" && (
          <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center flex-col p-4 backdrop-blur-sm z-10">
            <div className="w-10 h-10 rounded-full border-2 border-rose-500/50 flex items-center justify-center mb-2">
              <AlertCircle className="text-rose-500" size={20} />
            </div>
            <p className="text-[10px] font-bold text-rose-100/80 uppercase tracking-tighter text-center mb-2">
              {item.error || "Upload failed"}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRetry(item.id);
              }}
              className="bg-rose-500/80 hover:bg-rose-500 text-white rounded-full p-2 transition-colors shadow-lg shadow-black/20"
              title="Retry Upload"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        )}

        {item.status !== "completed" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
            className="absolute top-3 right-3 w-8 h-8 bg-black/40 hover:bg-rose-500/80 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all scale-0 group-hover:scale-100 border border-white/10 z-20"
            title="Remove file"
          >
            <X size={14} />
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
  const [initialData, setInitialData] = useState<{
    photos: PhotoItem[];
    cursor: string | null;
  } | null>(null);

  // We only show the skeleton on initial mount or event change.
  // For background refreshes (like completedCount changes), we keep the current data
  // on screen until the new data arrives, avoiding a full skeleton flash.
  useEffect(() => {
    if (!eventId) return;
    let active = true;

    // Only nullify if we don't have data yet (first load of this event)
    setInitialData((prev) => (prev ? prev : null));

    getFolderPhotosPage("all", eventId).then((res) => {
      if (active) {
        setInitialData({ photos: res.photos, cursor: res.nextCursor });
      }
    });

    return () => {
      active = false;
    };
  }, [eventId, completedCount]);

  if (!initialData) {
    return (
      <div className="mt-16 border-t border-white/5 pt-12">
        <h3 className="text-xl font-bold text-white mb-6">Recent Uploads</h3>
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`ws-skeleton-${i}`}
              className="mb-4 break-inside-avoid overflow-hidden rounded-[24px] border border-white/5 bg-[#141416]"
            >
              <Skeleton className="h-64 w-full rounded-[24px] bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-16 border-t border-white/5 pt-12">
      <h3 className="text-xl font-bold text-white mb-6">Recent Uploads</h3>
      <FolderPhotoGrid
        initialPhotos={initialData.photos}
        initialCursor={initialData.cursor}
        folderId="all"
        eventId={eventId}
        eventTitle={eventTitle}
        eventDate={eventDate}
        userId={userId}
        folderName="All Photos"
      />
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

  const {
    addFiles,
    removeFile,
    clearAll,
    isUploading,
    setUploadContext,
    retryUpload,
    completedCount,
  } = useGlobalUpload();

  // Select item IDs as a joined string so UploadWorkspace ONLY re-renders
  // when files are added or removed, NOT on individual item progress updates.
  const itemIdsStr = useUploadStore(
    useCallback((s) => s.items.map((i) => i.id).join(","), []),
  );
  const itemIds = useMemo(
    () => (itemIdsStr ? itemIdsStr.split(",") : []),
    [itemIdsStr],
  );

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

  const rowCount = Math.ceil(itemIds.length / columns);
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
      if (document.visibilityState === "visible") {
        const storeItems = useUploadStore.getState().items;
        const interruptedItems = storeItems.filter((i) => i.status === "uploading");
        if (interruptedItems.length > 0) {
          interruptedItems.forEach((item) => {
            retryUpload(item.id);
          });
        }
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
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
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
        <h3 className="text-base sm:text-xl font-semibold text-slate-200 mb-1 relative z-10 flex items-center gap-2">
          {isUploading ? "Processing & Uploading batch..." : "Drag & Drop photos here"}
        </h3>
        <p className="text-slate-500 text-sm mb-8 relative z-10">
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Queue ({itemIds.length} files)
            </h4>
            {isUploading && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
                <Loader2 size={12} className="animate-spin" /> Processing batch
              </span>
            )}
          </div>
          {itemIds.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] font-bold text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 uppercase tracking-widest"
            >
              <X size={12} /> Clear all
            </button>
          )}
        </div>

        {itemIds.length > 0 && (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const startIndex = virtualRow.index * columns;
              const rowItems = itemIds.slice(startIndex, startIndex + columns);

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
                  {rowItems.map((id) => (
                    <UploadQueueItemCard
                      key={id}
                      id={id}
                      onRemove={removeFile}
                      onRetry={retryUpload}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-8 mt-6">
        <div className="flex-1 w-full md:w-auto">
          {itemIds.length > 0 && (
            <p className="text-xs text-slate-500 italic">
              {itemIds.length} files queued. Click &quot;START UPLOAD&quot; on the
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
