"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { api } from "@/app/api/api-client";
import { PhotoLightbox, type LightboxPhoto } from "@/components/ui/photo-lightbox";

const SCAN_ATTENDEE_SESSION_KEY = "scan_attendee_id";
const LIVE_POLL_INTERVAL_MS = 3000;

interface MatchedPhoto {
  image_id: number | string;
  image_url: string;
  image_name: string;
  isNew?: boolean;
}

function getAttendeeId(): string | null {
  try {
    const fromSession = sessionStorage.getItem(SCAN_ATTENDEE_SESSION_KEY);
    if (fromSession) return fromSession;
    
    const fromLocal = localStorage.getItem(SCAN_ATTENDEE_SESSION_KEY);
    if (fromLocal) return fromLocal;

    // Check cookie fallback
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(new RegExp('(^| )' + SCAN_ATTENDEE_SESSION_KEY + '=([^;]+)'));
      if (match) return match[2];
    }
    
    return null;
  } catch {
    return null;
  }
}

function normalizePhoto(photo: any): MatchedPhoto {
  return {
    image_id: photo.id ?? photo.image_id,
    image_url: photo.url ?? photo.image_url,
    image_name: photo.image_name ?? `Photo ${photo.id ?? photo.image_id}`,
  };
}

function mergeIncomingPhotos(
  current: MatchedPhoto[],
  incoming: MatchedPhoto[],
  markNew: boolean,
) {
  const existingIds = new Set(current.map((photo) => String(photo.image_id)));
  const fresh = incoming
    .filter((photo) => !existingIds.has(String(photo.image_id)))
    .map((photo) => (markNew ? { ...photo, isNew: true } : photo));

  if (fresh.length === 0) {
    return current;
  }

  return [...fresh, ...current];
}

export default function LiveFeedPage() {
  const params = useParams();
  const eid = Array.isArray(params?.eid) ? params.eid[0] : (params?.eid ?? "");

  const [photos, setPhotos] = useState<MatchedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<LightboxPhoto | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!photos.some((photo) => photo.isNew)) return;

    const timeoutId = window.setTimeout(() => {
      setPhotos((prev) =>
        prev.map((photo) => (photo.isNew ? { ...photo, isNew: false } : photo)),
      );
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [photos]);

  // Sync photos to localStorage for the gallery "My Photos" view
  useEffect(() => {
    try {
      if (photos.length > 0) {
        localStorage.setItem("matched_images", JSON.stringify(photos));
      }
    } catch (e) {
      console.error("[live-feed] Failed to sync photos to localStorage", e);
    }
  }, [photos]);

  // ─── WebSocket subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!eid) return;

    const attendeeId = getAttendeeId();
    if (!attendeeId) {
      console.warn("[live-feed] Missing attendee id. Scan flow must complete before live updates can start.");
      setLoading(false);
      return;
    }

    let pollTimerId = 0;
    let reconnectTimerId = 0;
    let closedByCleanup = false;

    async function fetchMatchedPhotos(markNew: boolean) {
      try {
        const res = await api.get("/api/my-photos/", {
          params: {
            event_id: eid,
            scan_id: attendeeId,
          },
        });

        const raw: any[] = res.data?.photos ?? res.data?.matched_images ?? [];
        const normalized = raw.map(normalizePhoto);
        setPhotos((prev) => (markNew ? mergeIncomingPhotos(prev, normalized, true) : normalized));
        console.info(`[live-feed] Fetched ${normalized.length} matched photo(s).`);
      } catch (error) {
        console.error("[live-feed] Failed to fetch matched photos.", error);
      } finally {
        setLoading(false);
      }
    }

    function schedulePolling() {
      window.clearInterval(pollTimerId);
      pollTimerId = window.setInterval(() => {
        void fetchMatchedPhotos(true);
      }, LIVE_POLL_INTERVAL_MS);
      console.info(`[live-feed] Polling fallback active every ${LIVE_POLL_INTERVAL_MS}ms.`);
    }

    let wsUrl = "";
    try {
      const apiBase = new URL(process.env.NEXT_PUBLIC_PYTHON_API_URL || window.location.origin);
      apiBase.protocol = apiBase.protocol === "https:" ? "wss:" : "ws:";
      apiBase.pathname = `/ws/matches/${eid}/${attendeeId}/`;
      apiBase.search = "";
      apiBase.hash = "";
      wsUrl = apiBase.toString();
    } catch (error) {
      console.error("[live-feed] Could not build websocket URL.", error);
      void fetchMatchedPhotos(false);
      schedulePolling();
      return;
    }

    async function connect() {
      await fetchMatchedPhotos(false);

      console.info(`[live-feed] Connecting websocket: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.info("[live-feed] Websocket connected.");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.debug("[live-feed] Websocket message received.", data);
          if (data.type === "new_photo" && data.photo) {
            const incoming = normalizePhoto(data.photo);
            setPhotos((prev) => mergeIncomingPhotos(prev, [incoming], true));
          } else {
            console.warn("[live-feed] Unhandled websocket payload.", data);
          }
        } catch (error) {
          console.error("[live-feed] Failed to parse websocket message.", error);
        }
      };

      ws.onerror = (event) => {
        console.error("[live-feed] Websocket error.", event);
        schedulePolling();
      };

      ws.onclose = () => {
        socketRef.current = null;
        if (closedByCleanup) return;
        console.warn("[live-feed] Websocket closed. Reconnecting in 3s.");
        schedulePolling();
        reconnectTimerId = window.setTimeout(() => {
          void connect();
        }, 3000);
      };
    }

    void connect();

    return () => {
      closedByCleanup = true;
      window.clearTimeout(reconnectTimerId);
      window.clearInterval(pollTimerId);
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
                  onClick={() =>
                    setLightbox({ url: photo.image_url, name: photo.image_name })
                  }
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
                photographer uploads your photos, they will appear here instantly.
              </p>

              <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-5 py-2 text-sm text-cyan-400 border border-cyan-400/20">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                Listening for new photos…
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox — opened when a photo card is clicked */}
      <PhotoLightbox photo={lightbox} onClose={() => setLightbox(null)} />
    </Layout>
  );
}
