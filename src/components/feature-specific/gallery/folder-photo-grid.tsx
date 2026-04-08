"use client";

import { useState, useRef, useTransition } from "react";
import Image from "next/image";
import { Camera, Clock, X, ZoomIn, Upload, Loader2 } from "lucide-react";
import type { PhotoItem } from "@/lib/services/photo.service";
import { useFileUpload } from "@/hooks/use-file-upload";

interface FolderPhotoGridProps {
  photos: PhotoItem[];
  folderId: string;
  eventId: string;
  userId: string;
}

export function FolderPhotoGrid({ photos: initialPhotos, folderId, eventId, userId }: FolderPhotoGridProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos);
  const [lightbox, setLightbox] = useState<PhotoItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { items, addFiles, removeFile, clearAll, overallProgress, completedCount, startUpload, isUploading } = useFileUpload();

  // ─── Upload Handler ────────────────────────────────────────────
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };



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
          {items.length === 0 || completedCount === items.length ? (
            <label
              htmlFor="photo-upload-input"
              className={`flex cursor-pointer items-center gap-2 rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-bold text-black shadow-[0_0_24px_rgba(34,211,238,0.35)] transition-all hover:bg-cyan-300 hover:shadow-[0_0_32px_rgba(34,211,238,0.5)] active:scale-95`}
            >
              <Camera size={16} />
              UPLOAD TO FOLDER
            </label>
          ) : (
            <>
              <button
                onClick={() => startUpload(eventId, "upload", userId, folderId)}
                disabled={isUploading}
                className={`flex cursor-pointer items-center gap-2 rounded-2xl bg-emerald-400 px-6 py-3 text-sm font-bold text-black shadow-[0_0_24px_rgba(52,211,153,0.35)] transition-all hover:bg-emerald-300 hover:shadow-[0_0_32px_rgba(52,211,153,0.5)] active:scale-95 ${isUploading ? "opacity-60 pointer-events-none" : ""}`}
              >
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {isUploading ? `UPLOADING (${overallProgress}%)` : `START UPLOAD (${items.length - completedCount})`}
              </button>
              
              {!isUploading && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white"
                >
                  CANCEL
                </button>
              )}
            </>
          )}

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
              <div key={item.id} className="group relative mb-4 break-inside-avoid overflow-hidden rounded-[20px] border border-white/5 bg-[#141416]">
                <img src={item.preview} className="w-full object-cover opacity-60" />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                  {item.status === "uploading" ? (
                    <>
                      <Loader2 size={32} className="text-cyan-400 animate-spin mb-2" />
                      <span className="text-sm font-bold text-white">{item.progress}%</span>
                    </>
                  ) : item.status === "failed" ? (
                    <>
                      <X size={32} className="text-rose-400 mb-2" />
                      <span className="text-[10px] font-bold text-rose-400 text-center px-2 uppercase">{item.error}</span>
                    </>
                  ) : (
                    <span className="text-xs font-bold text-slate-300 uppercase">Queued</span>
                  )}
                </div>
                {item.status !== "uploading" && (
                  <button onClick={() => removeFile(item.id)} className="absolute top-2 right-2 bg-black/60 rounded-full p-2 text-white hover:bg-rose-500">
                    <X size={14} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Existing photos */}
          {photos.map((photo) => {
            return (
              <div
                key={photo.id}
                className="group relative mb-4 break-inside-avoid overflow-hidden rounded-[20px] border border-white/5 bg-[#141416] transition-all duration-300 hover:scale-[1.02] hover:border-white/10"
              >
                {/* Photo */}
                <div className="relative">
                  <Image
                    src={photo.url}
                    alt="Gallery photo"
                    width={400}
                    height={400}
                    className="w-full object-cover"
                    style={{ display: "block" }}
                  />

                  {/* Hover Overlay */}
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
            );
          })}
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
            <Image
              src={lightbox.url}
              alt="Gallery photo"
              width={1200}
              height={1200}
              className="max-h-[90vh] w-auto rounded-2xl object-contain shadow-2xl"
              priority
            />
          </div>
        </div>
      )}
    </div>
  );
}
