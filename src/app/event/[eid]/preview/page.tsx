"use client";

import Navbar from "@/components/Navbar";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Download, Flame, Heart, Info, Share2 } from "lucide-react";

export default function PhotoPreviewPage() {
  return (
    <Layout>
      <Navbar />

      <div className="flex flex-col items-center px-4 pt-28">
        <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl">
          <img
            src="/images/2.webp"
            className="h-[65vh] w-full rounded-3xl object-cover shadow-2xl md:h-[75vh]"
            alt="Photo preview"
          />

          <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6">
            <div className="relative">
              <TooltipProvider delayDuration={200}>
                <div className="absolute bottom-0 left-1/2 hidden -translate-x-1/2 items-center gap-4 rounded-full border border-white/20 bg-black/50 px-3 py-2 shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-xl md:flex">
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full text-white transition hover:scale-110 hover:bg-white/10 hover:text-gray-300">
                        <Share2 size={18} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="border-white/20 bg-black text-white"><p>Share</p></TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" className="ml-2 rounded-full bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.5)] transition hover:scale-110 hover:bg-cyan-300">
                        <Download size={18} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="border-white/20 bg-black text-white"><p>Download</p></TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center md:hidden">
          <div className="flex items-center gap-4 rounded-full border border-white/20 bg-black/50 px-4 py-2 shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            
            <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/10 hover:text-gray-300">
              <Share2 size={20} />
            </Button>
            
            <Button size="icon" className="ml-2 rounded-full bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.5)] hover:bg-cyan-300">
              <Download size={18} />
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
