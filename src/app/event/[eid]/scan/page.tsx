"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/app/next-api/api-client";

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
    <div className="relative min-h-screen text-white bg-black overflow-hidden select-none">
      {/* Laser scan beam CSS animation */}
      <style jsx global>{`
        @keyframes scanBeam {
          0% {
            top: 12vh;
          }
          50% {
            top: 78vh;
          }
          100% {
            top: 12vh;
          }
        }
        .animate-scan-beam {
          animation: scanBeam 3.5s ease-in-out infinite;
        }
      `}</style>

      {/* Full-screen background camera view — 100% fluent & crisp */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="fixed inset-0 h-full w-full object-cover scale-x-[-1] opacity-100"
      />

      {/* Responsive Corner Light-Leak Overlay (Exactly matching sample image with clear center) */}
      <div
        className="pointer-events-none fixed inset-0 z-10 transition-opacity duration-500"
        style={{
          background: `
      radial-gradient(ellipse 3% 55% at -1% 46%, rgba(64, 138, 92, 100) 0%, transparent 70%),
      radial-gradient(ellipse 28% 9% at 63% -1%, rgba(224, 168, 42, 100) 0%, transparent 70%),
      radial-gradient(ellipse 34% 5% at 96% -1%, rgba(214, 92, 182, 0.48) 0%, transparent 70%),
      radial-gradient(ellipse 50% 50% at 1% 97%, rgba(255, 255, 255, 0.5) 0%, transparent 70%),
      radial-gradient(ellipse 36% 55% at 2% 46%, rgba(64, 138, 92, 0.55) 0%, transparent 70%),
      radial-gradient(ellipse 28% 22% at 63% 2%, rgba(224, 168, 42, 0.42) 0%, transparent 70%),
      radial-gradient(ellipse 34% 30% at 96% 6%, rgba(214, 92, 182, 0.48) 0%, transparent 70%),
      radial-gradient(circle 4% 30% at -1% 100%, rgba(78, 98, 208, 0.5) 0%, transparent 100%),
      radial-gradient(circle at 48% 44%, transparent 0%, transparent 32%, rgba(0,0,0,0.55) 68%, rgba(0,0,0,0.92) 100%)
    `,
        }}
      />
      {/* Glassmorphism Laser Scanner Line (Hidden during scanning) */}
      {!isScanning && (
        <div className="pointer-events-none fixed left-0 right-0 z-30 flex flex-col items-center animate-scan-beam">
          {/* Beam glow trail */}
          <div
            className={`h-10 w-full bg-gradient-to-b ${
              status === "success"
                ? "from-transparent via-emerald-500/5 to-emerald-400/25"
                : status === "error"
                  ? "from-transparent via-red-500/5 to-red-400/25"
                  : "from-transparent via-cyan-500/5 to-cyan-400/25"
            }`}
          />

          {/* Ultra-thin glassmorphism laser line */}
          <div
            className={`h-[1px] w-full backdrop-blur-md transition-colors duration-500 ${
              status === "success"
                ? "bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399,0_0_30px_#34d399]"
                : status === "error"
                  ? "bg-gradient-to-r from-transparent via-red-400 to-transparent shadow-[0_0_15px_#f87171,0_0_30px_#f87171]"
                  : "bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee,0_0_30px_#22d3ee]"
            }`}
          />
        </div>
      )}

      {/* Navbar */}
      <div className="fixed top-4 left-1/2 z-50 flex w-[95%] max-w-6xl -translate-x-1/2 items-center justify-between rounded-2xl border border-white/20 bg-white/10 px-4 py-2 shadow-lg backdrop-blur-xl sm:w-[85%] sm:px-6 sm:py-3 md:w-[70%] lg:w-[55%]">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <img
            src="/LOGO_B.png"
            className="h-10 w-auto rounded-full object-cover sm:h-10"
            alt="Ente photo logo"
          />
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
          <div className="hidden h-6 w-px bg-white/20 sm:block" />
          <div className="flex items-center gap-2 text-xs text-red-400 sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="hidden sm:inline">Live Scanner</span>
          </div>
        </div>
      </div>

      {/* Main content overlay */}
      <div className="relative z-40 flex min-h-screen flex-col items-center justify-between py-24 px-4 text-center">
        {/* Top Header */}
        <div className="mt-8">
          <h1 className="text-3xl font-semibold sm:text-4xl drop-shadow-md tracking-tight text-white">
            Identity Discovery
          </h1>
          <p className="mt-2 text-sm text-gray-200 drop-shadow">
            Biometric authentication active
          </p>
        </div>

        {/* Center Status Indicators (Floating Glassmorphism Pills) */}
        <div className="my-auto flex flex-col items-center justify-center gap-4">
          {status === "scanning" && (
            <div className="flex items-center gap-3 rounded-full border border-cyan-400/30 bg-black/60 px-6 py-3 text-cyan-300 backdrop-blur-xl shadow-[0_0_30px_rgba(34,211,238,0.25)] animate-pulse">
              <svg
                className="h-5 w-5 animate-spin text-cyan-400"
                xmlns="http://www.w3.org/2000/svg"
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
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
              <span className="text-sm font-semibold tracking-wider">
                Analyzing Biometric Features...
              </span>
            </div>
          )}

          {status === "success" && (
            <div className="flex items-center gap-3 rounded-full border border-emerald-400/40 bg-emerald-950/70 px-6 py-3 text-emerald-300 backdrop-blur-xl shadow-[0_0_30px_rgba(52,211,153,0.3)]">
              <svg
                className="h-6 w-6 text-emerald-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-sm font-semibold tracking-wider uppercase">
                Biometrics Verified • Redirecting...
              </span>
            </div>
          )}

          {status === "error" && (
            <div className="flex max-w-md flex-col items-center gap-2 rounded-2xl border border-red-400/40 bg-red-950/80 p-4 text-red-200 backdrop-blur-xl shadow-[0_0_30px_rgba(248,113,113,0.3)]">
              <svg
                className="h-8 w-8 text-red-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span className="text-xs text-red-300 text-center font-medium">
                {errorMsg}
              </span>
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          {/* Hint Pill */}
          <div className="rounded-full border border-white/20 bg-black/50 px-5 py-2 text-xs text-cyan-300 backdrop-blur-md shadow-lg">
            {status === "success"
              ? "Redirecting to your gallery…"
              : status === "error"
                ? "Tap below to retry scan"
                : "Look directly at the camera to discover your photos"}
          </div>

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
            className={`w-full rounded-full py-3.5 font-semibold text-base transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed
              ${
                status === "error"
                  ? "bg-gradient-to-r from-red-500 to-orange-400 text-white shadow-red-500/25"
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/30 hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]"
              }`}
          >
            {isScanning
              ? "Scanning…"
              : status === "success"
                ? "Matched ✓"
                : status === "error"
                  ? "Try Again →"
                  : "Start Scan →"}
          </button>
        </div>
      </div>
    </div>
  );
}
