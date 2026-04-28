"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QrCode, X, CheckCircle2 } from "lucide-react";
import jsQR from "jsqr";
import bg from "@/assets/1st.jpg";

/* --- helper ------------------------ */
function extractEventId(raw: string): string {
  try {
    const url = new URL(raw);
    const match = url.pathname.match(/\/event\/([^/]+)/);
    if (match) return match[1];
  } catch {
    // not a URL — use raw value
  }
  return raw.trim();
}

/* ─── QR Modal ─────────────────────────────────────────────────────────── */
function QrModal({
  onDetected,
  onClose,
}: {
  onDetected: (id: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState(false);

  /* tick – runs on every animation frame */
  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (result?.data) {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setDetected(true);
      const id = extractEventId(result.data);
      // brief pause so user sees the ✓ flash, then close
      setTimeout(() => onDetected(id), 900);
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [onDetected]);

  /* start camera on mount */
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        rafRef.current = requestAnimationFrame(tick);
      } catch (err: any) {
        if (!mounted) return;
        setError(
          err.name === "NotAllowedError"
            ? "Camera permission denied."
            : err.name === "NotFoundError"
              ? "No camera found on this device."
              : "Could not start camera.",
        );
      }
    }
    init();
    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [tick]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-[90vw] max-w-sm overflow-hidden rounded-3xl border border-white/20 bg-white/5 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">
              Scan QR Code
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Viewfinder */}
        <div className="relative h-72 w-full">
          <canvas ref={canvasRef} className="hidden" />

          {/* Live feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2  px-6 text-center text-red-400">
              <svg
                className="h-8 w-8"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              <p className="text-xs leading-5">{error}</p>
            </div>
          )}

          {/* Scanning crosshair */}
          {!error && !detected && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-48 w-48">
                {/* sweep line */}
                <div className="absolute inset-x-0 h-0.5 animate-[qrscan_2s_ease-in-out_infinite] bg-cyan-400/90 shadow-[0_0_10px_3px_rgba(34,211,238,0.5)]" />
                {/* brackets */}
                <div className="absolute top-0 left-0 h-7 w-7 border-t-2 border-l-2 border-cyan-400 rounded-tl-sm" />
                <div className="absolute top-0 right-0 h-7 w-7 border-t-2 border-r-2 border-cyan-400 rounded-tr-sm" />
                <div className="absolute bottom-0 left-0 h-7 w-7 border-b-2 border-l-2 border-cyan-400 rounded-bl-sm" />
                <div className="absolute bottom-0 right-0 h-7 w-7 border-b-2 border-r-2 border-cyan-400 rounded-br-sm" />
              </div>
            </div>
          )}

          {/* Success flash */}
          {detected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-emerald-900/80 backdrop-blur-sm">
              <CheckCircle2
                className="h-14 w-14 text-emerald-400"
                strokeWidth={1.5}
              />
              <p className="text-sm font-semibold text-emerald-300">
                QR Code Detected!
              </p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        {!detected && (
          <p className="px-5 py-4 text-center text-xs text-gray-400">
            {error
              ? "Close and try again."
              : "Point your camera at the event QR code."}
          </p>
        )}
      </div>

      {/* scan-line keyframe */}
      <style>{`
        @keyframes qrscan {
          0%   { top: 0%; }
          50%  { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  );
}

/* ─── Main page ────────────────────────────────────────────────────────── */
export default function QrScannerPage() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const normalizedCode = code.trim();

  const handleDetected = (id: string) => {
    setCode(id);
    setModalOpen(false);
  };

  const handleJoin = () => {
    if (!normalizedCode) return;
    router.push(`/event/${encodeURIComponent(normalizedCode)}/scan`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleJoin();
  };

  return (
    <>
      {modalOpen && (
        <QrModal
          onDetected={handleDetected}
          onClose={() => setModalOpen(false)}
        />
      )}

      <div
        className="relative flex h-screen w-full items-center justify-center overflow-hidden text-white"
        style={{
          backgroundImage: `url(${bg.src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

        {/* Card */}
        <div className="relative z-10 w-[380px] rounded-3xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 p-8 shadow-2xl backdrop-blur-2xl">
          {/* Logo */}
          <div className="mx-auto mb-5 h-20 w-20 overflow-hidden rounded-2xl border border-white/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpeg"
              className="h-full w-auto object-cover"
              alt="Ente photo logo"
            />
          </div>

          <h1 className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-center text-3xl font-semibold text-transparent">
            Ente photo
          </h1>
          <p className="mt-2 mb-6 text-center text-sm text-gray-400">
            Your digital lens for the moments that matter.
          </p>

          {/* Label */}
          <p className="mb-2 text-[10px] tracking-widest text-cyan-400">
            ENTER EVENT CODE
          </p>

          {/* Input + QR button */}
          <div className="relative mb-6">
            <input
              id="event-code-input"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. CELESTIAL-2024"
              className="w-full rounded-full border border-white/10 bg-black/50 px-5 py-4 pr-12 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />

            {/* QR icon button */}
            <button
              onClick={() => setModalOpen(true)}
              aria-label="Scan QR Code"
              className="absolute top-1/2 right-4 -translate-y-1/2 text-cyan-400 transition hover:scale-110 hover:text-cyan-300"
            >
              <QrCode className="h-[18px] w-[18px]" />
            </button>
          </div>

          {/* Join */}
          <button
            id="join-event-btn"
            onClick={handleJoin}
            disabled={!normalizedCode}
            aria-disabled={!normalizedCode}
            className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 py-4 font-medium text-black transition duration-300 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
          >
            Join Ceremony →
          </button>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-500">
            <div className="border-t border-white/10 pt-4">
              <div className="mb-2 block text-[10px] tracking-widest hover:text-cyan-400 transition-colors">
                AUTHORIZED ENTRY ONLY
              </div>
              <div className="flex justify-center gap-6 text-gray-400">
                <Link
                  href="/terms"
                  className="cursor-pointer hover:text-white transition-colors"
                >
                  Terms
                </Link>
                <Link
                  href="/privacy"
                  className="cursor-pointer hover:text-white transition-colors"
                >
                  Privacy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
