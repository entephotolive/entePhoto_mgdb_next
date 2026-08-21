"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { api } from "@/app/next-api/api-client";
import {
  PhotoLightbox,
  type LightboxPhoto,
} from "@/components/ui/photo-lightbox";
import { getStudioByEventId } from "@/app/photographer/(panel)/profile/action";
import { StudioModal } from "@/components/feature-specific/studio-modal";
import type { ProfileData } from "@/types";
import { Camera } from "lucide-react";

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
    if (typeof document !== "undefined") {
      const match = document.cookie.match(
        new RegExp("(^| )" + SCAN_ATTENDEE_SESSION_KEY + "=([^;]+)"),
      );
      if (match) return match[2];
    }

    return null;
  } catch {
    return null;
  }
}

function normalizePhoto(photo: any): MatchedPhoto {
  const id = photo.id ?? photo.image_id;
  const rawUrl: string = photo.url ?? photo.image_url ?? "";

  // Extract extension from the URL path (strips query strings)
  const pathname = rawUrl.split("?")[0];
  const extMatch = pathname.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";

  return {
    image_id: id,
    image_url: rawUrl,
    image_name: `entephoto_${id}.${ext}`,
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
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({
    current: 0,
    total: 0,
  });
  const [showFeedbackCTA, setShowFeedbackCTA] = useState(false);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [studioModalOpen, setStudioModalOpen] = useState(true);

  useEffect(() => {
    if (!eid) return;
    setIsProfileLoading(true);
    getStudioByEventId(eid)
      .then((res) => {
        if (res && typeof res !== "string" && res.profile) {
          setProfile(res.profile);
        }
      })
      .finally(() => {
        setIsProfileLoading(false);
      });
  }, [eid]);

  const socketRef = useRef<WebSocket | null>(null);

  const handleDownloadAll = async () => {
    if (photos.length === 0 || downloadingAll) return;

    setDownloadingAll(true);
    setDownloadProgress({ current: 0, total: photos.length });

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      setDownloadProgress({ current: i + 1, total: photos.length });

      try {
        const response = await fetch(photo.image_url);
        if (!response.ok) {
          throw new Error(`HTTP error status: ${response.status}`);
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = photo.image_name || `photo_${photo.image_id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(objectUrl);
      } catch (error) {
        console.error(
          `[live-feed] Failed to download photo (id: ${photo.image_id}):`,
          error,
        );
      }

      if (i < photos.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    setDownloadingAll(false);
    setShowFeedbackCTA(true);
  };

  const handleShareFeedback = () => {
    const feedbackUrl = process.env.NEXT_PUBLIC_FEEDBACK_URL;
    if (!feedbackUrl) {
      console.warn(
        "[live-feed] NEXT_PUBLIC_FEEDBACK_URL environment variable is missing or undefined.",
      );
      return;
    }
    window.open(feedbackUrl, "_blank", "noopener,noreferrer");
  };


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
      console.warn(
        "[live-feed] Missing attendee id. Scan flow must complete before live updates can start.",
      );
      setLoading(false);
      return;
    }

    let pollTimerId: any = null;
    let reconnectTimerId: any = null;
    let closedByCleanup = false;

    async function fetchMatchedPhotos(markNew: boolean) {
      if (closedByCleanup) return;
      try {
        const res = await api.get("/api/my-photos/", {
          params: {
            event_id: eid,
            scan_id: attendeeId,
          },
        });

        const raw: any[] = res.data?.photos ?? res.data?.matched_images ?? [];
        const normalized = raw.map(normalizePhoto);
        setPhotos((prev) =>
          markNew ? mergeIncomingPhotos(prev, normalized, true) : normalized,
        );
        console.debug(
          `[live-feed] Polling: Synced ${normalized.length} photo(s).`,
        );
      } catch (error) {
        console.error("[live-feed] Polling failed.", error);
      } finally {
        setLoading(false);
      }
    }

    function startPolling() {
      if (pollTimerId) return;
      fetchMatchedPhotos(true); // Initial fetch
      pollTimerId = window.setInterval(() => {
        void fetchMatchedPhotos(true);
      }, LIVE_POLL_INTERVAL_MS);
      console.info(`[live-feed] Polling fallback started.`);
    }

    function stopPolling() {
      if (pollTimerId) {
        window.clearInterval(pollTimerId);
        pollTimerId = null;
        console.info(`[live-feed] Polling stopped.`);
      }
    }

    let wsUrl = "";
    try {
      const apiBase = new URL(
        process.env.NEXT_PUBLIC_PYTHON_API_URL || window.location.origin,
      );
      apiBase.protocol = apiBase.protocol === "https:" ? "wss:" : "ws:";
      apiBase.pathname = `/ws/matches/${eid}/${attendeeId}/`;
      wsUrl = apiBase.toString();
    } catch (error) {
      console.error("[live-feed] URL build failed.", error);
      startPolling();
      return;
    }

    async function connect() {
      if (closedByCleanup) return;

      console.info(`[live-feed] Attempting WebSocket: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.info("[live-feed] WebSocket connected ✓");
        stopPolling();
        // One-time sync on connect to catch anything missed during downtime
        fetchMatchedPhotos(false);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new_photo" && data.photo) {
            const incoming = normalizePhoto(data.photo);
            setPhotos((prev) => mergeIncomingPhotos(prev, [incoming], true));
            console.info("[live-feed] New photo received via WebSocket ✨");
          }
        } catch (error) {
          console.error("[live-feed] WS parse error.", error);
        }
      };

      ws.onerror = (event) => {
        console.error("[live-feed] WebSocket error.", event);
      };

      ws.onclose = (e) => {
        socketRef.current = null;
        if (closedByCleanup) return;

        console.warn(
          `[live-feed] WebSocket closed (${e.code}). Falling back to polling.`,
        );
        startPolling();

        // Retry connection in 5s
        reconnectTimerId = window.setTimeout(() => {
          console.info("[live-feed] Retrying WebSocket...");
          void connect();
        }, 5000);
      };
    }

    // Initial action: Fetch once, then try WebSocket
    void fetchMatchedPhotos(false).then(() => {
      void connect();
    });

    return () => {
      closedByCleanup = true;
      stopPolling();
      window.clearTimeout(reconnectTimerId);
      socketRef.current?.close();
    };
  }, [eid]);

  return (
    <Layout>
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 pt-32 pb-24">
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-4xl font-bold md:text-5xl">
            The Live Moment
          </h1>
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
            {/* Header Row: Title on Left, Download All on Right */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-cyan-400">
                  Your Matched Photos
                </h2>
                <span className="rounded-full bg-cyan-400/10 border border-cyan-400/20 px-3 py-0.5 text-xs font-semibold text-cyan-300">
                  {photos.length}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {showFeedbackCTA && (
                  <div className="inline-flex items-center gap-2.5 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 backdrop-blur-md">
                    <span className="text-xs text-gray-200">
                      Enjoying your photos?
                    </span>
                    <button
                      onClick={handleShareFeedback}
                      className="inline-flex items-center gap-1 rounded-full bg-cyan-400/20 px-3 py-0.5 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-400/30 hover:text-white border border-cyan-400/30"
                    >
                      Feedback ✨
                    </button>
                  </div>
                )}

                <button
                  onClick={handleDownloadAll}
                  disabled={downloadingAll}
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-black transition-all hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {downloadingAll ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin text-black"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>
                        Downloading {downloadProgress.current}/
                        {downloadProgress.total}…
                      </span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      <span>Download All ({photos.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="columns-2 gap-5 space-y-5 md:columns-3 lg:columns-4">
              {photos.map((photo) => (
                <div
                  key={photo.image_id}
                  onClick={() =>
                    setLightbox({
                      url: photo.image_url,
                      name: photo.image_name,
                    })
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

      {/* Lightbox — opened when a photo card is clicked */}
      <PhotoLightbox photo={lightbox} onClose={() => setLightbox(null)} />

      {/* Floating Fixed Camera Button for Studio Info */}
      <div className="fixed bottom-6 right-6 z-50 group">
        {/* Ambient neon gradient glow aura */}
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-400 opacity-70 blur-md transition-all duration-500 group-hover:opacity-100 group-hover:blur-lg group-hover:scale-110 animate-pulse" />

        <button
          onClick={() => setStudioModalOpen(true)}
          aria-label="Studio Profile"
          title={profile?.studioName || profile?.name || "Studio Profile"}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-slate-950/80 text-white backdrop-blur-xl border border-purple-500/40 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-2xl group-hover:border-cyan-400/80 group-hover:shadow-[0_0_25px_rgba(168,85,247,0.6)]"
        >
          {/* Camera icon with micro-interaction */}
          <Camera className="h-6 w-6 text-purple-300 transition-all duration-300 group-hover:text-cyan-300 group-hover:scale-110 group-hover:-rotate-12" />

          {/* Pulsing status dot */}
          
        </button>

        {/* Floating Tooltip on Hover */}
        <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 whitespace-nowrap">
          <div className="rounded-xl border border-purple-500/30 bg-slate-950/90 px-3.5 py-1.5 text-xs font-medium text-purple-200 shadow-xl backdrop-blur-md flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
            <span>{profile?.studioName || profile?.name || "Grand Events"} Studio</span>
          </div>
        </div>
      </div>

      {/* Studio Info Bottom Sheet Modal */}
      <StudioModal
        isOpen={studioModalOpen}
        onClose={() => setStudioModalOpen(false)}
        profile={profile}
        eventId={eid}
        isLoading={isProfileLoading}
      />
    </Layout>
  );
}
