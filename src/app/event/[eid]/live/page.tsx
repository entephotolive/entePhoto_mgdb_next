"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { api } from "@/app/api/api-client";

interface MatchedPhoto {
  image_id: number | string;
  image_url: string;
  image_name: string;
  isNew?: boolean;
}

function getAttendeeFromCookie(): string | null {
  const cookies = document.cookie.split(";");
  const match = cookies.find((c) => c.trim().startsWith("scan_response="));
  if (!match) return null;
  try {
    const raw = decodeURIComponent(match.split("=")[1]);
    const data = JSON.parse(raw);
    return data.attendee_id || data.id || null;
  } catch {
    return null;
  }
}

export default function LiveFeedPage() {
  const params = useParams();
  const eid = Array.isArray(params?.eid) ? params.eid[0] : (params?.eid ?? "");

  const [photos, setPhotos] = useState<MatchedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<WebSocket | null>(null);

  // ─── Initial HTTP load ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!eid) return;

    const attendeeId = getAttendeeFromCookie();

    async function loadInitialPhotos() {
      try {
        const res = await api.get("/api/my-photos/", {
          params: {
            event_id: eid,
            ...(attendeeId ? { scan_id: attendeeId } : {}),
          },
        });

        const raw: any[] = res.data?.photos ?? res.data?.matched_images ?? [];
        setPhotos(
          raw.map((p) => ({
            image_id: p.id ?? p.image_id,
            image_url: p.url ?? p.image_url,
            image_name: p.image_name ?? `Photo ${p.id ?? p.image_id}`,
          }))
        );
      } catch {
        // Fallback to localStorage cache
        try {
          const cached = localStorage.getItem("matched_images");
          if (cached) setPhotos(JSON.parse(cached));
        } catch {}
      } finally {
        setLoading(false);
      }
    }

    loadInitialPhotos();
  }, [eid]);

  // Persist to localStorage whenever photos update
  useEffect(() => {
    if (!loading) {
      localStorage.setItem("matched_images", JSON.stringify(photos));
    }
  }, [photos, loading]);

  // ─── WebSocket subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!eid) return;

    const attendeeId = getAttendeeFromCookie();
    if (!attendeeId) return; // No identity — cannot subscribe to a private channel

    const wsBase = process.env.NEXT_PUBLIC_PYTHON_API_URL!.replace(/^http/, "ws").replace(/\/$/, "");
    const wsUrl = `${wsBase}/ws/matches/${eid}/${attendeeId}/`;

    function connect() {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new_photo" && data.photo) {
            const incoming: MatchedPhoto = {
              image_id: data.photo.image_id,
              image_url: data.photo.image_url,
              image_name: data.photo.image_name,
              isNew: true,
            };
            setPhotos((prev) => {
              // Deduplicate by image_id
              const exists = prev.some((p) => p.image_id === incoming.image_id);
              return exists ? prev : [incoming, ...prev];
            });

            // Remove the "isNew" highlight after the animation plays
            setTimeout(() => {
              setPhotos((prev) =>
                prev.map((p) =>
                  p.image_id === incoming.image_id ? { ...p, isNew: false } : p
                )
              );
            }, 2000);
          }
        } catch {}
      };

      ws.onclose = () => {
        // Auto-reconnect after 3 s if the component is still mounted
        reconnectTimer.current = window.setTimeout(connect, 3000);
      };
    }

    const reconnectTimer = { current: 0 };
    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      socketRef.current?.close();
    };
  }, [eid]);

  return (
    <Layout>
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 pt-32 pb-24">
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-bold md:text-5xl">The Live Moment</h1>
          <p className="text-sm text-gray-300 md:text-base">
            Every capture, shared instantly. Join the story in real-time.
          </p>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="columns-2 gap-5 space-y-5 md:columns-3 lg:columns-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="break-inside-avoid rounded-xl bg-white/5 animate-pulse"
                style={{ height: `${180 + (i % 3) * 60}px` }}
              />
            ))}
          </div>
        )}

        {/* Photos grid */}
        {!loading && photos.length > 0 && (
          <div className="mb-16">
            <h2 className="mb-6 text-2xl font-semibold text-cyan-400">
              Your Matched Photos
            </h2>

            <div className="columns-2 gap-5 space-y-5 md:columns-3 lg:columns-4">
              {photos.map((photo) => (
                <div
                  key={photo.image_id}
                  className={`group relative cursor-pointer overflow-hidden rounded-xl break-inside-avoid border-2 transition-all duration-700 ${
                    photo.isNew
                      ? "border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.5)] scale-[1.02]"
                      : "border-cyan-400/30"
                  }`}
                >
                  <img
                    src={photo.image_url}
                    alt={photo.image_name}
                    className="w-full rounded-xl transition duration-500 group-hover:scale-110"
                  />

                  <div className="absolute inset-0 bg-black/20 opacity-0 transition group-hover:opacity-100" />

                  {photo.isNew && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="rounded-full bg-cyan-500/90 px-3 py-1 text-xs font-bold text-white shadow-lg animate-bounce">
                        NEW ✨
                      </span>
                    </div>
                  )}

                  <Badge className="absolute top-3 right-3 bg-cyan-500 text-white text-[10px] uppercase tracking-widest">
                    MATCH
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && photos.length === 0 && (
          <div className="flex min-h-[420px] items-center justify-center">
            <div className="max-w-xl rounded-3xl border border-white/10 bg-white/5 px-8 py-14 text-center backdrop-blur-xl">
              <div className="mb-5 text-6xl">📷</div>

              <h2 className="mb-3 text-3xl font-bold text-white">
                No Photos Matched Yet
              </h2>

              <p className="mx-auto max-w-md text-sm leading-7 text-gray-300 md:text-base">
                We couldn&apos;t find any matched photos right now. Once the
                photographer uploads your photos, they will appear here
                instantly.
              </p>

              <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-5 py-2 text-sm text-cyan-400 border border-cyan-400/20">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                Listening for new photos…
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}