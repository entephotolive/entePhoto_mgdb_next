"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

interface PublicPhotoGridProps {
  photos: any[];
}

export function PublicPhotoGrid({ photos }: PublicPhotoGridProps) {
  const [lightbox, setLightbox] = useState<any | null>(null);

  if (photos.length === 0) {
    return (
      <div className="py-20 text-center border border-dashed border-white/10 rounded-[40px] bg-white/[0.02]">
        <p className="text-white/40 font-medium">This folder is currently empty.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="group relative mb-4 break-inside-avoid overflow-hidden rounded-[24px] border border-white/5 bg-[#141416] transition-all duration-300 hover:scale-[1.02] hover:border-white/20 shadow-xl"
          >
            <div className="relative">
              <Image
                src={photo.url}
                alt="Gallery photo"
                width={500}
                height={500}
                className="w-full object-cover"
                style={{ display: "block" }}
              />

              {/* Hover Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex-col gap-3">
                <button
                  onClick={() => setLightbox(photo)}
                  className="rounded-full bg-white/10 p-4 backdrop-blur-xl border border-white/20 transition-transform hover:scale-110"
                >
                  <ZoomIn size={24} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
          <DialogContent className="flex max-w-[95vw] items-center justify-center rounded-[32px] border-white/10 bg-black/95 p-2 shadow-2xl backdrop-blur-3xl md:max-w-6xl md:p-4 outline-none">
            <DialogDescription className="sr-only">
              Full screen photo preview
            </DialogDescription>
            <div className="relative w-full h-full flex items-center justify-center">
                <img
                    src={lightbox.url}
                    className="max-h-[85vh] w-auto rounded-2xl object-contain"
                    alt="Gallery preview"
                />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
