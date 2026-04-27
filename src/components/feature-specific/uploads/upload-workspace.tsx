/* eslint-disable @next/next/no-img-element */
"use client";

import {
  AlertCircle,
  ImageIcon,
  UploadCloud,
  X,
} from "lucide-react";
import { useRef, useState, useEffect, useMemo } from "react";
import { useGlobalUpload } from "@/hooks/use-global-upload";
import { EventListItem } from "@/types";
import { EventSelectDropdown } from "@/components/shared/event-select-dropdown";

interface UploadWorkspaceProps {
  events: EventListItem[];
  userId: string;
}

function isEventActive(event: EventListItem | undefined): boolean {
  if (!event || !event.date) return false;
  const now = Date.now();
  const eventTime = new Date(event.date).getTime();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  return now >= eventTime && now <= eventTime + TWENTY_FOUR_HOURS;
}

export function UploadWorkspace({ events, userId }: UploadWorkspaceProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showWarning, setShowWarning] = useState(events.length === 0);
  const [showInactiveWarning, setShowInactiveWarning] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    items,
    addFiles,
    removeFile,
    clearAll,
    completedCount,
    isUploading,
    setUploadContext,
  } = useGlobalUpload();

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
      <section className="mb-6 sm:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-100 mb-2 sm:mb-3 tracking-tight">
            Upload Artifacts
          </h2>
          <p className="text-slate-500 max-w-md leading-relaxed">
            Infuse the gallery with new moments. Select your event and bring
            your vision into the digital darkroom.
          </p>
        </div>
        <div className="flex flex-col w-full md:w-auto md:items-end">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-cyan-500/80 mb-2">
            Select Event to Upload
          </label>
          <EventSelectDropdown 
            events={sortedEvents}
            value={selectedEventId}
            onChange={handleEventChange}
            isLoading={!isInitialized && events.length > 0}
          />
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
          if (events.length > 0) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (events.length === 0) {
            setShowWarning(true);
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
          accept="image/jpeg,image/png,image/webp"
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
          <UploadCloud className="text-cyan-400" size={32} />
        </div>
        <h3 className="text-base sm:text-xl font-semibold text-slate-200 mb-1 relative z-10">
          Drag & Drop photos here
        </h3>
        <p className="text-slate-500 text-sm mb-8 relative z-10">
          or{" "}
          <span className="text-cyan-400 hover:underline">
            click to browse files
          </span>
        </p>
        <div className="flex flex-wrap justify-center gap-4 sm:gap-8 relative z-10">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <AlertCircle size={14} className="opacity-50" />
            Max File Size: 15MB
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <ImageIcon size={14} className="opacity-50" />
            Supported Formats: JPG, PNG
          </div>
        </div>
      </div>

      <section className="mt-8 sm:mt-12">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Queue ({items.length} files)
          </h4>
          <button
            type="button"
            onClick={clearAll}
            className="text-[10px] font-bold text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 uppercase tracking-widest"
          >
            <X size={12} /> Clear all
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative group bg-white/5 border border-white/5 rounded-[32px] p-2 overflow-hidden transition-all hover:bg-white/[0.08] hover:scale-[1.02]"
            >
              <div className="aspect-square rounded-[26px] overflow-hidden relative mb-3">
                <img
                  src={item.preview}
                  alt={item.file.name}
                  className="w-full h-full object-cover"
                />

                {item.status === "uploading" && (
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
                          className="text-cyan-400 stroke-current transition-all duration-500"
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
                  <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center flex-col p-4 backdrop-blur-sm">
                    <div className="w-12 h-12 rounded-full border-2 border-rose-500/50 flex items-center justify-center mb-3">
                      <AlertCircle className="text-rose-500" size={24} />
                    </div>
                    <p className="text-[10px] font-bold text-rose-100/80 uppercase tracking-tighter text-center">
                      {item.error}
                    </p>
                  </div>
                )}

                {item.status !== "completed" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(item.id);
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
                          : "text-slate-500"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-8 mt-6">
        <div className="flex-1 w-full md:w-auto">
          {items.length > 0 && (
            <p className="text-xs text-slate-500 italic">
              {items.length} files queued. Click &quot;START UPLOAD&quot; on the
              widget to begin.
            </p>
          )}
        </div>
      </div>

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
