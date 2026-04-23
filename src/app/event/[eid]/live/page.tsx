"use client";

import Navbar from "@/components/Navbar";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { liveFeedData } from "@/data/livefeed.data";
import { useEffect, useState } from "react";

export default function LiveFeedPage() {
  const [matchedImages, setMatchedImages] = useState<any[]>([]);

  useEffect(() => {
    const savedMatches = localStorage.getItem("matched_images");
    if (savedMatches) {
      try {
        // eslint-disable-next-line
        setMatchedImages(JSON.parse(savedMatches));
      } catch (e) {
        console.error("Failed to parse matched images", e);
      }
    }
  }, []);

  return (
    <Layout>
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 pt-32 pb-24">
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-bold md:text-5xl">
            The Live Moment
          </h1>

          <p className="text-sm text-gray-300 md:text-base">
            Every capture, shared instantly. Join the story in real-time.
          </p>
        </div>

        {matchedImages.length > 0 && (
          <div className="mb-16">
            <h2 className="mb-6 text-2xl font-semibold text-cyan-400">Your Matched Photos</h2>
            <div className="columns-2 gap-5 space-y-5 md:columns-3 lg:columns-4">
              {matchedImages.map((image) => (
                <div
                  key={image.image_id}
                  className="group relative cursor-pointer overflow-hidden rounded-xl break-inside-avoid border-2 border-cyan-400/50"
                >
                  <img
                    src={image.image_url}
                    alt={image.image_name}
                    className="w-full rounded-xl transition duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 transition group-hover:opacity-100"></div>
                  <Badge
                    variant="default"
                    className="absolute top-3 right-3 text-[10px] uppercase tracking-widest bg-cyan-500 text-white"
                  >
                    MATCH
                  </Badge>
                </div>
              ))}
            </div>
            <div className="mt-12 h-px w-full bg-white/10" />
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-xl font-semibold">Live Feed</h2>
        </div>
        <div className="columns-2 gap-5 space-y-5 md:columns-3 lg:columns-4">
          {liveFeedData.map((image) => (
            <div
              key={image.id}
              className="group relative cursor-pointer overflow-hidden rounded-xl break-inside-avoid"
            >
              <img
                src={image.src}
                alt={image.caption}
                className="w-full rounded-xl transition duration-500 group-hover:scale-110"
              />

              <div className="absolute inset-0 bg-black/20 opacity-0 transition group-hover:opacity-100"></div>

              <Badge
                variant="destructive"
                className="absolute top-3 right-3 text-[10px] uppercase tracking-widest opacity-0 shadow-[0_0_10px_rgba(255,0,0,0.8)] transition animate-pulse group-hover:opacity-100"
              >
                LIVE
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
