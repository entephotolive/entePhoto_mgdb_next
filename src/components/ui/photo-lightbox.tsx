"use client";

import { Download, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

export interface LightboxPhoto {
  url: string;
  name: string;
}

interface PhotoLightboxProps {
  photo: LightboxPhoto | null;
  onClose: () => void;
}

async function triggerDownload(url: string, name: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = name || "photo.jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.error("Failed to download photo:", error);
    // Fallback to the original method
    const a = document.createElement("a");
    a.href = url;
    a.download = name || "photo";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }
}

function triggerShare(url: string, name: string) {
  if (navigator.share) {
    navigator.share({ title: name, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).catch(() => {});
    alert("Link copied to clipboard!");
  }
}

export function PhotoLightbox({ photo, onClose }: PhotoLightboxProps) {
  return (
    <Dialog open={!!photo} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex flex-col max-w-[95vw] items-center justify-center rounded-[32px] border-white/10 bg-black/95 p-2 shadow-2xl backdrop-blur-3xl md:max-w-6xl md:p-4 outline-none">
        {/* Accessibility: required by Radix, visually hidden */}
        <DialogHeader className="items-start text-left space-y-2 pb-4 border-b border-white/10">
          <DialogTitle className="text-left text-xl md:text-2xl font-semibold tracking-tight text-white">
            Captured Moment
          </DialogTitle>

          <DialogDescription className="text-left text-sm md:text-base text-white/60 max-w-md leading-relaxed">
            A timeless frame from your live event collection, preserved in
            premium clarity.
          </DialogDescription>
        </DialogHeader>
        {photo && (
          <div className="flex flex-col items-center gap-4 w-full">
            <img
              src={photo.url}
              alt={photo.name}
              className="max-h-[78vh] w-auto rounded-2xl object-contain"
            />

            <TooltipProvider delayDuration={200}>
              <div className="flex items-center gap-3 rounded-full border border-white/20 bg-black/50 px-4 py-2 shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => triggerShare(photo.url, photo.name)}
                      className="rounded-full text-white transition hover:scale-110 hover:bg-white/10 hover:text-gray-300"
                    >
                      <Share2 size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="border-white/20 bg-black text-white"
                  >
                    <p>Share</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      onClick={() => triggerDownload(photo.url, photo.name)}
                      className="rounded-full bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.5)] transition hover:scale-110 hover:bg-cyan-300"
                    >
                      <Download size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="border-white/20 bg-black text-white"
                  >
                    <p>Download</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
