"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import bg from "@/assets/1st.jpg";
import { api } from "@/app/api/api-client";

type ScanStatus = "idle" | "scanning" | "success" | "error";

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
      localStorage.setItem("user_scanned_photo", dataUrl);

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

      // Save cookie
      document.cookie = `scan_response=${encodeURIComponent(
        JSON.stringify(apiResponse.data),
      )}; path=/; max-age=${60 * 60 * 5}`;

      if (apiResponse.data?.matched_images) {
        localStorage.setItem(
          "matched_images",
          JSON.stringify(apiResponse.data.matched_images),
        );
      }

      setStatus("success");

      // Small delay so the user sees the success state, then redirect
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

  /* ─── border / glow colours driven by status ─────────────────────────── */
  const borderClass =
    status === "success"
      ? "border-emerald-400"
      : status === "error"
        ? "border-red-400"
        : "border-cyan-400/30";

  const glowClass =
    status === "success"
      ? "bg-emerald-400/10"
      : status === "error"
        ? "bg-red-400/10"
        : "bg-cyan-400/10";

  return (
    <div
      className="relative min-h-screen text-white"
      style={{
        backgroundImage: `url(${bg.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Navbar */}
      <div className="fixed top-4 left-1/2 z-50 flex w-[95%] max-w-6xl -translate-x-1/2 items-center justify-between rounded-2xl border border-white/20 bg-white/10 px-4 py-2 shadow-lg backdrop-blur-xl sm:w-[85%] sm:px-6 sm:py-3 md:w-[70%] lg:w-[55%]">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <img
            src="/logo.jpeg"
            className="h-8 w-auto rounded-full object-cover sm:h-10"
            alt="Ente photo logo"
          />
          <span className="text-sm font-semibold text-white sm:text-base">
            Ente photo
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
          <div className="hidden h-6 w-px bg-white/20 sm:block" />
          <div className="flex items-center gap-2 text-xs text-red-400 sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="hidden sm:inline">Live</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 text-center">
        {/* Title */}
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Identity Discovery
        </h1>
        <p className="mb-10 text-sm text-gray-300">
          Biometric authentication active
        </p>

        {/* Camera frame */}
        <div className="relative flex h-80 w-80 items-center justify-center sm:h-96 sm:w-96">
          <div
            className={`absolute h-full w-full rounded-[3rem] blur-3xl transition-colors duration-700 ${glowClass}`}
          />

          <div
            className={`relative flex h-64 w-64 items-center justify-center overflow-hidden rounded-[2.5rem] border-2 bg-black/40 backdrop-blur sm:h-80 sm:w-80 transition-all duration-700 ${borderClass}`}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="absolute h-full w-full object-cover"
            />

            {/* Corner brackets */}
            <div className="pointer-events-none absolute h-full w-full">
              <div className="absolute top-0 left-0 h-8 w-8 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute top-0 right-0 h-8 w-8 border-t-2 border-r-2 border-cyan-400" />
              <div className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute right-0 bottom-0 h-8 w-8 border-r-2 border-b-2 border-cyan-400" />
            </div>

            {/* Idle dots */}
            {status === "idle" && (
              <div className="z-10 flex gap-3">
                <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              </div>
            )}

            {/* Scanning overlay */}
            {status === "scanning" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/50 backdrop-blur-sm">
                <svg
                  className="h-10 w-10 animate-spin text-cyan-400"
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
                <span className="text-xs text-cyan-300 tracking-widest">
                  Analyzing…
                </span>
              </div>
            )}

            {/* Success overlay */}
            {status === "success" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-emerald-900/60 backdrop-blur-sm">
                <svg
                  className="h-12 w-12 text-emerald-400"
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
                <span className="text-xs font-semibold text-emerald-300 tracking-widest">
                  face detected ✓
                </span>
              </div>
            )}

            {/* Error overlay */}
            {status === "error" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-red-900/60 backdrop-blur-sm px-3">
                <svg
                  className="h-10 w-10 text-red-400"
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
                <span className="text-[10px] leading-4 text-red-300 text-center">
                  {errorMsg}
                </span>
              </div>
            )}

            <div className="absolute h-[70%] w-[70%] rounded-lg border border-cyan-400/20 border-dashed" />
          </div>

          {/* Hint pill */}
          <div className="absolute bottom-[-28px] rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-cyan-300 backdrop-blur">
            {status === "success"
              ? "Redirecting to your gallery…"
              : status === "error"
                ? "Tap below to retry"
                : "Align your face to find your moments"}
          </div>
        </div>

        {/* CTA button */}
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
          className={`mt-14 rounded-full px-8 py-3 font-medium transition duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed
            ${
              status === "error"
                ? "bg-gradient-to-r from-red-500 to-orange-400"
                : "bg-gradient-to-r from-pink-500 to-orange-400"
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
  );
}
