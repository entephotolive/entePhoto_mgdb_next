"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/app/next-api/api-client";
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";

type ScanStatus = "idle" | "scanning" | "success" | "error";
const SCAN_ATTENDEE_SESSION_KEY = "scan_attendee_id";

export default function FaceScanPage() {
  const params = useParams();
  const eid = params?.eid;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      if (typeof window === "undefined") return;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
        return;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error: any) {
        if (error.name === "NotAllowedError") {
          setErrorMsg(
            "Camera permission denied. Please allow camera access and refresh.",
          );
          setStatus("error");
        } else if (error.name === "NotFoundError") {
          setErrorMsg("No camera found on this device.");
          setStatus("error");
        } else {
          setErrorMsg("Could not start camera. Please try again.");
          setStatus("error");
        }
      }
    }

    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleScan = async () => {
    if (!videoRef.current) return;
    setStatus("scanning");
    setErrorMsg("");

    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 480;
      canvas.height = videoRef.current.videoHeight || 640;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Canvas context unavailable");

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const imageFile = new File([blob], "scanned_face.jpg", {
        type: "image/jpeg",
      });

      const formData = new FormData();
      formData.append("image", imageFile);
      if (eid) {
        formData.append("event_id", Array.isArray(eid) ? eid[0] : eid);
      }

      const apiResponse = await api.post("/api/scan-face/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const attendeeId = apiResponse.data?.attendee_id ?? apiResponse.data?.id;
      if (!attendeeId) {
        throw new Error(
          "Scan succeeded but attendee id was missing from response.",
        );
      }

      // Persist scan event stats to MongoDB asynchronously
      const eventIdStr = Array.isArray(eid) ? eid[0] : eid;
      if (eventIdStr) {
        fetch("/next-api/scan-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: eventIdStr,
            attendeeId: String(attendeeId),
          }),
        }).catch((err) => console.error("Failed to persist scan event:", err));
      }

      sessionStorage.setItem(SCAN_ATTENDEE_SESSION_KEY, String(attendeeId));
      localStorage.setItem(SCAN_ATTENDEE_SESSION_KEY, String(attendeeId));
      document.cookie = `${SCAN_ATTENDEE_SESSION_KEY}=${attendeeId}; path=/; max-age=18000;`;
      document.cookie = `scan_response=${attendeeId}; path=/; max-age=18000;`;
      setStatus("success");

      setTimeout(() => {
        window.location.href = `/event/${eid}/live`;
      }, 1800);
    } catch (error: any) {
      console.error("Scan failed:", error);
      const detail =
        error?.response?.data?.details?.event_id?.[0] ||
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        "Could not match your face. Please try again.";
      setErrorMsg(detail);
      setStatus("error");
    }
  };

  const isScanning = status === "scanning";

  return (
    <div className="relative min-h-[100dvh] w-full text-white bg-slate-950 overflow-hidden select-none flex flex-col justify-between">
      {/* Animations and reduced-motion considerations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes handBounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.35s ease-out forwards;
        }
        .animate-hand-bounce {
          animation: handBounce 1.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-hand-bounce {
            animation: none;
          }
          .animate-fade-in {
            animation: none;
          }
        }
      `}</style>

      {/* Full-screen background video feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="fixed inset-0 h-full w-full object-cover scale-x-[-1] opacity-100 z-0"
      />

      {/* Soft minimal background vignette tint */}
      <div
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          background:
            "radial-gradient(circle at center, transparent 40%, rgba(15, 23, 42, 0.45) 85%)",
        }}
      />

      {/* Minimal Header / Navbar */}
      <header className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm sm:max-w-md flex items-center justify-between rounded-full bg-slate-950/40 backdrop-blur-md border border-white/10 px-4 py-2 text-white shadow-sm">
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full"
        >
          <img
            src="/LOGO_B.png"
            className="h-7 sm:h-8 w-auto rounded-full object-cover shadow-sm transition-transform group-hover:scale-105"
            alt="Ente Photo"
          />
          <span className="text-xs sm:text-sm font-medium tracking-tight text-white drop-shadow-sm">
            Ente Photo
          </span>
        </Link>

        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-[11px] sm:text-xs font-medium">
            Camera Ready
          </span>
        </div>
      </header>

      {/* Simple, Thin Face Frame Overlay */}
      <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center p-4">
        <div
          className="relative flex items-center justify-center transition-all duration-300"
          style={{
            width: "min(74vw, 280px)",
            height: "min(98vw, 370px)",
            maxHeight: "50vh",
          }}
        >
          <div
            className={`absolute inset-0 rounded-[50%/40%] border transition-colors duration-300 ${
              status === "success"
                ? "border-emerald-400/90 shadow-sm"
                : status === "error"
                  ? "border-rose-400/90 shadow-sm"
                  : status === "scanning"
                    ? "border-indigo-400/90 animate-pulse"
                    : "border-white/40"
            }`}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-30 flex flex-1 flex-col items-center justify-between pt-20 pb-6 sm:pt-24 px-4 text-center max-w-md mx-auto w-full">
        {/* Top Header */}
        <div className="mt-2 sm:mt-4 space-y-1 animate-fade-in">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white drop-shadow-sm">
            Find Your Photos
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 drop-shadow-sm">
            Position your face inside the guide
          </p>
        </div>

        {/* Center Status Messaging (Scanning, Success, Error) */}
        <div className="my-auto py-4 flex flex-col items-center justify-center gap-3 w-full">
          {status === "scanning" && (
            <div className="animate-fade-in flex items-center gap-2.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 px-4 py-2.5 text-slate-100 shadow-md">
              <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
              <span className="text-xs sm:text-sm font-medium">
                Hold still, finding you…
              </span>
            </div>
          )}

          {status === "success" && (
            <div className="animate-fade-in flex items-center gap-2.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-emerald-500/30 px-4 py-2.5 text-emerald-300 shadow-md">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs sm:text-sm font-medium">
                Got it! Taking you to your photos 🎉
              </span>
            </div>
          )}

          {status === "error" && (
            <div className="animate-fade-in flex max-w-xs flex-col items-center gap-1.5 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-rose-500/30 p-3.5 text-rose-200 shadow-md">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>Hmm, we couldn't find a match — let's try again</span>
              </div>
              {errorMsg && (
                <p className="text-[11px] sm:text-xs text-slate-300 text-center">
                  {errorMsg}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Bottom Controls with Bouncing Hand Cue */}
        <div className="flex flex-col items-center gap-2.5 w-full max-w-xs sm:max-w-sm pb-[max(1rem,env(safe-area-inset-bottom))] animate-fade-in">
          {/* Bouncing Hand Cue (idle status only) */}
          {status === "idle" && (
            <div
              className="flex flex-col items-center gap-1 animate-hand-bounce transition-opacity duration-300"
              aria-hidden="true"
            >
              <span className="text-2xl select-none">👇</span>
            </div>
          )}

          {/* Conversational Status Hint */}
          <p className="text-xs sm:text-sm font-medium text-slate-200 text-center drop-shadow-sm">
            {status === "idle" && "Ready when you are — tap Start Scan"}
            {status === "scanning" && "Searching your photos..."}
            {status === "success" && "Redirecting to your gallery..."}
            {status === "error" && "Tap below to try again"}
          </p>

          {/* CTA Scan Button */}
          <button
            onClick={
              status === "error"
                ? () => {
                    setStatus("idle");
                    setErrorMsg("");
                  }
                : handleScan
            }
            disabled={isScanning || status === "success"}
            className={`w-full min-h-[48px] sm:min-h-[50px] px-6 rounded-2xl font-medium text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:opacity-60 disabled:pointer-events-none ${
              status === "error"
                ? "bg-rose-500 hover:bg-rose-600 text-white"
                : status === "success"
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-900 hover:bg-slate-100"
            }`}
          >
            {isScanning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-slate-700" />
                <span>Finding you…</span>
              </>
            ) : status === "success" ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-white" />
                <span>Got it!</span>
              </>
            ) : status === "error" ? (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>Retry Scan</span>
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 text-slate-700" />
                <span>Start Scan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


