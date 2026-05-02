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
    console.error("Direct fetch failed, falling back to proxy download:", error);
    
    // Fallback: use our server-side proxy route to avoid CORS issues and force download
    const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name || "photo.jpg")}`;
    
    const a = document.createElement("a");
    a.href = proxyUrl;
    a.download = name || "photo.jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
      <DialogContent className="flex flex-col gap-4 max-w-[95vw] w-full md:max-w-5xl rounded-[32px] border border-white/10 bg-white/5 p-4 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-3xl outline-none">
        <DialogHeader className="w-full text-left space-y-1 pb-2 border-b border-white/10">
          <DialogTitle className="text-xl md:text-2xl font-bold tracking-tight text-white drop-shadow-md">
            Captured Moment
          </DialogTitle>
          <DialogDescription className="text-sm md:text-base text-white/70">
            A timeless frame from your live event collection, preserved in premium clarity.
          </DialogDescription>
        </DialogHeader>

        {photo && (
          <div className="flex flex-col items-center gap-5 w-full">
            {/* Image Container */}
            <div className="relative flex w-full justify-center items-center rounded-2xl bg-black/40 ring-1 ring-white/10 backdrop-blur-md overflow-hidden shadow-inner">
              <img
                src={photo.url}
                alt={photo.name}
                className="max-h-[68vh] w-auto object-contain"
              />
            </div>

            {/* Actions Bar */}
            <TooltipProvider delayDuration={200}>
              <div className="flex items-center gap-4 rounded-full border border-white/20 bg-white/10 px-6 py-2.5 shadow-[0_4px_24px_0_rgba(0,0,0,0.3)] backdrop-blur-2xl transition-all">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => triggerShare(photo.url, photo.name)}
                      className="rounded-full h-11 w-11 text-zinc-200 transition-all hover:scale-105 hover:bg-white/20 hover:text-white"
                    >
                      <Share2 size={20} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="border border-white/20 bg-black/50 text-white rounded-lg px-3 py-1.5 text-xs font-medium backdrop-blur-xl"
                  >
                    <p>Share</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      onClick={() => triggerDownload(photo.url, photo.name)}
                      className="rounded-full h-11 w-11 bg-cyan-400 text-black shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all hover:scale-105 hover:bg-cyan-300"
                    >
                      <Download size={20} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="border border-white/20 bg-black/50 text-white rounded-lg px-3 py-1.5 text-xs font-medium backdrop-blur-xl"
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
