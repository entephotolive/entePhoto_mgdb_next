/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QrCode } from "lucide-react";
import bg from "@/assets/1st.jpg";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function HomePage() {
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const normalizedCode = code.trim();

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error: any) {
      console.log("error", error);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;

    if (stream instanceof MediaStream) {
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  return (
    <div
      className="relative flex h-screen w-full items-center justify-center overflow-hidden text-white"
      style={{
        backgroundImage: `url(${bg.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>

      <div className="relative z-10 w-[380px] rounded-3xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 p-8 shadow-2xl backdrop-blur-2xl">
        <div className="mx-auto mb-5 h-20 w-20 overflow-hidden rounded-2xl border border-white/20">
          <img
            src="/logo.jpeg"
            className="h-full w-full object-cover"
            alt="Ente photo logo"
          />
        </div>

        <h1 className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-center text-3xl font-semibold text-transparent">
          Ente photo
        </h1>

        <p className="mt-2 mb-6 text-center text-sm text-gray-400">
          Your digital lens for the moments that matter.
        </p>

        <p className="mb-2 text-[10px] tracking-widest text-cyan-400">
          ENTER EVENT CODE
        </p>

        <div className="relative mb-6">
          <input
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="e.g. CELESTIAL-2024"
            className="w-full rounded-full border border-white/10 bg-black/50 px-5 py-4 pr-12 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />

          <Dialog
            open={open}
            onOpenChange={(value) => {
              setOpen(value);
              if (!value) {
                stopCamera();
              } else {
                setTimeout(openCamera, 200);
              }
            }}
          >
            <DialogTrigger asChild>
              <div className="absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer text-cyan-400 transition hover:scale-110">
                <QrCode size={18} />
              </div>
            </DialogTrigger>

            <DialogContent className="border border-white/20 bg-black/90 text-white sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-center">Scan QR Code</DialogTitle>
                <DialogDescription className="sr-only">
                  Preview of selected gallery image
                </DialogDescription>
              </DialogHeader>

              <div className="relative mt-4 h-64 w-full">
                <video
                  ref={videoRef}
                  autoPlay
                  className="h-full w-full rounded-xl object-cover"
                />

                <div className="absolute inset-0 rounded-xl border-2 border-cyan-400"></div>
                <div className="absolute top-0 left-0 h-6 w-6 border-t-4 border-l-4 border-cyan-400"></div>
                <div className="absolute top-0 right-0 h-6 w-6 border-t-4 border-r-4 border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 h-6 w-6 border-b-4 border-l-4 border-cyan-400"></div>
                <div className="absolute right-0 bottom-0 h-6 w-6 border-r-4 border-b-4 border-cyan-400"></div>
              </div>

              <p className="mt-4 text-center text-xs text-white/60">
                Align QR within frame to scan
              </p>
            </DialogContent>
          </Dialog>
        </div>

        <button
          onClick={() => {
            if (!normalizedCode) {
              return;
            }
            router.push(`/event/${encodeURIComponent(normalizedCode)}/scan`);
          }}
          disabled={!normalizedCode}
          aria-disabled={!normalizedCode}
          className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 py-4 font-medium text-black transition duration-300 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
        >
          Join Ceremony →
        </button>

        <div className="mt-8 text-center text-xs text-gray-500">
          <div className="border-t border-white/10 pt-4">
            
             <div      className="mb-2 block text-[10px] tracking-widest hover:text-cyan-400 transition-colors">
            
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
  );
}
