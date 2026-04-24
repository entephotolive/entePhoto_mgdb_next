"use client";

import Navbar from "@/components/Navbar";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { api } from "@/app/api/api-client";
import { useParams } from "next/navigation";

export default function LiveFeedPage() {
  const params = useParams();
  const eid = params?.eid;
  const [matchedImages, setMatchedImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPhotos() {
      if (!eid) return;

      // Get scan_id from cookies
      const cookies = document.cookie.split(";");
      const scanResponseCookie = cookies.find((c) =>
        c.trim().startsWith("scan_response=")
      );

      let scanId = null;

      if (scanResponseCookie) {
        try {
          const cookieValue = decodeURIComponent(
            scanResponseCookie.split("=")[1]
          );
          const data = JSON.parse(cookieValue);
          scanId = data.id || data.attendee_id;
        } catch (e) {
          console.error("Failed to parse scan_response cookie", e);
        }
      }

      try {
        const res = await api.get("/api/my-photos/", {
          params: {
            event_id: eid,
            scan_id: scanId,
          },
        });

        const data = res.data;
        const photos = data.photos || data.matched_images;

        if (photos && Array.isArray(photos)) {
          const mapped = photos.map((p: any) => ({
            image_id: p.id || p.image_id,
            image_url: p.url || p.image_url,
            image_name: p.image_name || `Photo ${p.id || p.image_id}`,
          }));

          setMatchedImages(mapped);
          localStorage.setItem("matched_images", JSON.stringify(mapped));
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error("Failed to fetch from /api/my-photos/", e);
      }

      // fallback localStorage
      const savedMatches = localStorage.getItem("matched_images");

      if (savedMatches) {
        try {
          setMatchedImages(JSON.parse(savedMatches));
        } catch (e) {
          console.error("Failed to parse matched images", e);
        }
      }

      setLoading(false);
    }

    fetchPhotos();
  }, [eid]);

  return (
    <Layout>
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 pt-32 pb-24">
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-bold md:text-5xl">
            The Live Moment
          </h1>

          <p className="text-sm text-gray-300 md:text-base">
            Every capture, shared instantly. Join the story in real-time.
          </p>
        </div>

        {/* Photos Found */}
        {!loading && matchedImages.length > 0 && (
          <div className="mb-16">
            <h2 className="mb-6 text-2xl font-semibold text-cyan-400">
              Your Matched Photos
            </h2>

            <div className="columns-2 gap-5 space-y-5 md:columns-3 lg:columns-4">
              {matchedImages.map((image) => (
                <div
                  key={image.image_id}
                  className="group relative cursor-pointer overflow-hidden rounded-xl break-inside-avoid border-2 border-cyan-400/50"
                >
                  <img
                    src={image.image_url}
                    alt={image.image_name}
                    className="w-full rounded-xl transition duration-500 group-hover:scale-110"
                  />

                  <div className="absolute inset-0 bg-black/20 opacity-0 transition group-hover:opacity-100"></div>

                  <Badge
                    className="absolute top-3 right-3 bg-cyan-500 text-white text-[10px] uppercase tracking-widest"
                  >
                    MATCH
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Photos Found */}
        {!loading && matchedImages.length === 0 && (
          <div className="flex min-h-[420px] items-center justify-center">
            <div className="max-w-xl rounded-3xl border border-white/10 bg-white/5 px-8 py-14 text-center backdrop-blur-xl">
              <div className="mb-5 text-6xl">📷</div>

              <h2 className="mb-3 text-3xl font-bold text-white">
                No Photos Matched Yet
              </h2>

              <p className="mx-auto max-w-md text-sm leading-7 text-gray-300 md:text-base">
                We couldn't find any matched photos right now. Please make sure
                the photographer has uploaded your photos. Once uploaded, they
                will appear here instantly.
              </p>

              <div className="mt-8 inline-block rounded-full bg-cyan-500/10 px-5 py-2 text-sm text-cyan-400 border border-cyan-400/20">
                Waiting for new uploads...
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}