"use client";

import { useState, useEffect } from "react";
import { ZoomIn } from "lucide-react";
import { PhotoLightbox, type LightboxPhoto } from "@/components/ui/photo-lightbox";

interface MatchedPhoto {
  image_id: number | string;
  image_url: string;
  image_name: string;
}

export function MyPhotosGrid() {
  const [photos, setPhotos] = useState<MatchedPhoto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxPhoto | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("matched_images");
      if (saved) setPhotos(JSON.parse(saved));
    } catch {}
    setLoaded(true);
  }, []);

  if (!loaded) {
    // Skeleton while reading localStorage
    return (
      <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="mb-4 break-inside-avoid rounded-[24px] bg-white/5 animate-pulse"
            style={{ height: `${180 + (i % 3) * 60}px` }}
          />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="max-w-xl rounded-3xl border border-white/10 bg-white/5 px-8 py-14 text-center backdrop-blur-xl">
          <div className="mb-5 text-6xl">🪪</div>
          <h2 className="mb-3 text-3xl font-bold text-white">No Photos Yet</h2>
          <p className="mx-auto max-w-md text-sm leading-7 text-gray-300 md:text-base">
            Go to the Live Feed and scan your face to find your matched photos. They will appear here automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
        {photos.map((photo) => (
          <div
            key={String(photo.image_id)}
            className="group relative mb-4 break-inside-avoid overflow-hidden rounded-[24px] border-2 border-cyan-400/50 bg-[#141416] transition-all duration-300 hover:scale-[1.02] shadow-xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.image_url}
              alt={photo.image_name}
              loading="lazy"
              className="w-full object-cover block"
            />
            <div className="absolute top-3 right-3 rounded-md bg-cyan-500 px-2 py-1 text-[10px] font-bold text-white tracking-widest">
              MATCH
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() =>
                  setLightbox({ url: photo.image_url, name: photo.image_name })
                }
                className="rounded-full bg-white/10 p-4 backdrop-blur-xl border border-white/20 transition-transform hover:scale-110"
              >
                <ZoomIn size={24} className="text-white" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <PhotoLightbox photo={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
