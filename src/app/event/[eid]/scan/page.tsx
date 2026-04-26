"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import bg from "@/assets/1st.jpg";
import { api } from "@/app/api/api-client";

export default function FaceScanPage() {
  const params = useParams();
  const eid = params?.eid;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);

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

  const handleScan = async () => {
    if (!videoRef.current) return;
    setIsScanning(true);

    try {
      // 1. Capture the frame from the video stream
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 480;
      canvas.height = videoRef.current.videoHeight || 640;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64 Data URL (JPEG format for smaller size)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        
        // 2. Save instantly to local storage
        localStorage.setItem("user_scanned_photo", dataUrl);

        // 3. Convert Data URL to File object for the API
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const imageFile = new File([blob], "scanned_face.jpg", { type: "image/jpeg" });

        // 4. Construct FormData to send to API
        const formData = new FormData();
        formData.append("image", imageFile);
        if (eid) {
          formData.append("event_id", Array.isArray(eid) ? eid[0] : eid);
        }

        // 5. Call the API directly
        const apiResponse = await api.post("/api/scan-face/", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        
        console.log("Scan successful:", apiResponse.data);
        
        // Save the response in a cookie
        document.cookie = `scan_response=${encodeURIComponent(JSON.stringify(apiResponse.data))}; path=/; max-age=${60 * 60 * 24 * 30}`;
        
        if (apiResponse.data?.matched_images) {
           localStorage.setItem("matched_images", JSON.stringify(apiResponse.data.matched_images));
        }
        
        // Redirect to the live gallery feed
        window.location.href = `/event/${eid}/live`;
      }
    } catch (error) {
      console.error("Failed to process scan:", error);
      alert("Failed to scan face. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

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
            className="h-8 w-auto rounded-full object-cover sm:h-10"
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

        <button 
          onClick={handleScan}
          disabled={isScanning}
          className="mt-12 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-8 py-3 transition duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
        >
          {isScanning ? "Scanning..." : "Start Scan →"}
        </button>
      </div>
    </div>
  );
}
