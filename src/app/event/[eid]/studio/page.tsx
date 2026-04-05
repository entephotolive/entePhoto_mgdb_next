"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { studioData } from "@/data/studio.data";

export default function StudioPage() {
  const [api, setApi] = useState(null);

  useEffect(() => {
    if (!api) {
      return undefined;
    }

    const interval = setInterval(() => {
      api.scrollNext();
    }, 2500);

    return () => clearInterval(interval);
  }, [api]);

  return (
    <Layout>
      <Navbar />

      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 pt-28 md:grid-cols-2">
        <div>
          <Badge className="h-5 border-cyan-400/20 bg-cyan-400/10 px-2 py-0 text-[10px] tracking-widest text-cyan-400 uppercase">
            PREMIUM STUDIO
          </Badge>

          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
            Midnight
            <br />
            Aurora
          </h1>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
            Pioneering the “Celestial Darkroom” aesthetic. We don’t just capture
            photos; we architect light and atmosphere to immortalize the soul of
            every ceremony.
          </p>

          <div className="mt-6 flex gap-4">
            <Card className="h-28 w-40 border-white/10 bg-white/5">
              <CardHeader className="gap-1 p-4">
                <CardTitle className="text-sm text-white">
                  Celestial Lighting
                </CardTitle>
                <CardDescription className="text-xs text-white/60">
                  Atmospheric light sculpting.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="h-28 w-40 border-white/10 bg-white/5">
              <CardHeader className="gap-1 p-4">
                <CardTitle className="text-sm text-white">
                  Biometric Curation
                </CardTitle>
                <CardDescription className="text-xs text-white/60">
                  AI-driven emotional focus.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="mt-8 flex gap-8">
            <div>
              <h3 className="text-lg font-semibold">500+</h3>
              <p className="text-xs text-white/60">Ceremonies</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-pink-400">1M+</h3>
              <p className="text-xs text-white/60">Memories Captured</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold">100%</h3>
              <p className="text-xs text-white/60">Elite Rating</p>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <Button className="bg-white px-4 py-5 text-black transition-all duration-300 hover:scale-105 hover:bg-gray-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]">
              Book Consultation
            </Button>

            <Button className="bg-gradient-to-r from-cyan-400 to-purple-500 px-6 py-5 text-black transition-all duration-300 hover:scale-105 hover:brightness-110 hover:shadow-[0_0_25px_rgba(34,211,238,0.6)]">
              Visit our shop
            </Button>
          </div>
        </div>

        <div className="relative">
          <Carousel setApi={setApi} opts={{ loop: true }} className="w-full">
            <CarouselContent>
              {studioData.map((image) => (
                <CarouselItem key={image.id}>
                  <div className="relative mx-1 overflow-hidden rounded-3xl shadow-2xl">
                    <img
                      src={image.src}
                      className="h-[500px] w-full object-cover"
                      alt={image.title}
                    />

                    <div className="absolute bottom-6 left-6 rounded-full border border-white/20 bg-black/50 px-4 py-2 text-sm backdrop-blur-xl">
                      <p className="font-medium text-white">
                        {image.title}
                      </p>

                      <span className="text-xs text-cyan-400">
                        {image.subtitle}
                      </span>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </Layout>
  );
}
