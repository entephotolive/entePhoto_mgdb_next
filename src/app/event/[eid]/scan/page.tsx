"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import bg from "@/assets/1st.jpg";

export default function FaceScanPage() {
  const videoRef = useRef(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      // ✅ 1. Ensure browser
      if (typeof window === "undefined") return;

      // ✅ 2. Ensure API exists
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Camera API not supported in this browser");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error: any) {
        // ✅ 3. Differentiate errors
        if (error.name === "NotAllowedError") {
          console.error("Permission denied by user");
        } else if (error.name === "NotFoundError") {
          console.error("No camera device found");
        } else {
          console.error("Camera error:", error);
        }
      }
    }

    startCamera();

    return () => {
      // ✅ 4. Proper cleanup
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div
      className="relative min-h-screen text-white"
      style={{
        backgroundImage: `url(${bg.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

      <div className="fixed top-4 left-1/2 z-50 flex w-[95%] max-w-6xl -translate-x-1/2 items-center justify-between rounded-2xl border border-white/20 bg-white/10 px-4 py-2 shadow-lg backdrop-blur-xl sm:w-[85%] sm:px-6 sm:py-3 md:w-[70%] lg:w-[55%]">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <img
            src="/logo.jpeg"
            className="h-8 w-8 rounded-full object-cover sm:h-10 sm:w-10"
            alt="Ente photo logo"
          />
          <span className="text-sm font-semibold text-white sm:text-base">
            Ente photo
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
          <div className="hidden h-6 w-px bg-white/20 sm:block"></div>
          <div className="flex items-center gap-2 text-xs text-red-400 sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
            <span className="hidden sm:inline">Live</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Identity Discovery
        </h1>

        <p className="mb-10 text-sm text-gray-300">
          Biometric authentication active
        </p>

        <div className="relative flex h-72 w-72 items-center justify-center sm:h-80 sm:w-80">
          <div className="absolute h-full w-full rounded-2xl bg-cyan-400/10 blur-2xl"></div>

          <div className="relative flex h-56 w-56 items-center justify-center overflow-hidden rounded-2xl border border-cyan-400/30 bg-black/40 backdrop-blur sm:h-64 sm:w-64">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="absolute h-full w-full object-cover"
            />

            <div className="pointer-events-none absolute h-full w-full">
              <div className="absolute top-0 left-0 h-8 w-8 border-t-2 border-l-2 border-cyan-400"></div>
              <div className="absolute top-0 right-0 h-8 w-8 border-t-2 border-r-2 border-cyan-400"></div>
              <div className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-cyan-400"></div>
              <div className="absolute right-0 bottom-0 h-8 w-8 border-r-2 border-b-2 border-cyan-400"></div>
            </div>

            <div className="z-10 flex gap-3">
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></div>
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></div>
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></div>
            </div>

            <div className="absolute h-[70%] w-[70%] rounded-lg border border-cyan-400/20 border-dashed"></div>
          </div>

          <div className="absolute bottom-[-25px] rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-cyan-300 backdrop-blur">
            Align your face to find your moments
          </div>
        </div>

        <button className="mt-12 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-8 py-3 transition duration-300 hover:scale-105">
          Start Scan →
        </button>
      </div>
    </div>
  );
}
