"use client";

import { useState } from "react";
import { ZoomIn } from "lucide-react";
import { PhotoLightbox, type LightboxPhoto } from "@/components/ui/photo-lightbox";

interface Photo {
  id?: number | string;
  image_id?: number | string;
  url?: string;
  image_url?: string;
  image_name?: string;
}

interface PublicPhotoGridProps {
  photos: Photo[];
}

function toLightbox(p: Photo): LightboxPhoto {
  return {
    url: (p.url ?? p.image_url ?? "") as string,
    name: (p.image_name ?? `Photo ${p.id ?? p.image_id ?? ""}`) as string,
  };
}

export function PublicPhotoGrid({ photos }: PublicPhotoGridProps) {
  const [lightbox, setLightbox] = useState<LightboxPhoto | null>(null);

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
        {photos.map((p) => {
          const photo = toLightbox(p);
          const key = String(p.id ?? p.image_id ?? photo.url);
          return (
            <div
              key={key}
              className="group relative mb-4 break-inside-avoid overflow-hidden rounded-[24px] border border-white/5 bg-[#141416] transition-all duration-300 hover:scale-[1.02] hover:border-white/20 shadow-xl"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.name}
                loading="lazy"
                className="w-full object-cover block"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => setLightbox(photo)}
                  className="rounded-full bg-white/10 p-4 backdrop-blur-xl border border-white/20 transition-transform hover:scale-110"
                >
                  <ZoomIn size={24} className="text-white" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <PhotoLightbox photo={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
