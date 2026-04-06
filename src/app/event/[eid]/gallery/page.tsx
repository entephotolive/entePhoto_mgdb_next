"use client";

import Navbar from "@/components/Navbar";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { galleryData } from "@/data/gallery.data";

function ImageWithDialog({ src, altClass = "", children }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className={`relative overflow-hidden rounded-xl group cursor-pointer ${altClass}`}>
          {children}
        </div>
      </DialogTrigger>
      <DialogContent className="flex max-w-[95vw] items-center justify-center rounded-xl border-white/20 bg-black/90 p-2 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl md:max-w-5xl md:p-4">
        <DialogDescription className="sr-only">
          Preview of selected gallery image
        </DialogDescription>

        <img
          src={src}
          className="max-h-[85vh] w-auto rounded-lg object-contain shadow-2xl"
          alt="Gallery preview"
        />
      </DialogContent>
    </Dialog>
  );
}

export default function GalleryPage() {
  const smallImages = galleryData.filter((image) => image.type === "small");
  const gridImages = galleryData.filter((image) => image.type === "grid");
  const tallImage = galleryData.find((image) => image.type === "tall");
  const wideImage = galleryData.find((image) => image.type === "wide");

  return (
    <Layout>
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 pt-28 pb-24">
        <div className="mb-12">
          <Badge variant="outline" className="mb-6 border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] tracking-widest text-cyan-400 uppercase">
            Now capturing memories...
          </Badge>

          <h1 className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-3xl font-bold text-transparent md:text-5xl">
            Memories with you
          </h1>

          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/60 md:text-base">
            Your exclusive moments captured with you, framed for eternity in our digital darkroom.
          </p>
        </div>

        <div className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-3">
          {smallImages.map((image) => (
            <ImageWithDialog key={image.id} src={image.src}>
              <img
                src={image.src}
                className="h-64 w-full object-cover transition duration-700 group-hover:scale-110"
                alt=""
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 transition duration-500 group-hover:opacity-100"></div>
            </ImageWithDialog>
          ))}
        </div>

        <div className="mb-10 flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <h2 className="mb-2 text-2xl font-semibold tracking-wide">
              Featured Ceremony
            </h2>
            <p className="text-sm text-white/60">
              A blend of photography highlighting a few special couples.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {tallImage && (
            <ImageWithDialog src={tallImage.src}>
              <img
                src={tallImage.src}
                className="h-[450px] w-full object-cover transition duration-700 group-hover:scale-105"
                alt={tallImage.title}
              />
              <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6">
                <h3 className="text-lg font-semibold tracking-wide">{tallImage.title}</h3>
                <p className="mt-1 text-sm font-medium text-cyan-400">{tallImage.subtitle}</p>
              </div>
            </ImageWithDialog>
          )}

          <div className="grid grid-cols-2 gap-6 md:col-span-2">
            {gridImages.slice(0, 2).map((image) => (
              <ImageWithDialog key={image.id} src={image.src}>
                <img
                  src={image.src}
                  className="h-[213px] w-full object-cover transition duration-700 group-hover:scale-110"
                  alt=""
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 transition duration-500 group-hover:opacity-100"></div>
              </ImageWithDialog>
            ))}

            {wideImage && (
              <ImageWithDialog src={wideImage.src} altClass="col-span-2">
                <img
                  src={wideImage.src}
                  className="h-[213px] w-full object-cover transition duration-700 group-hover:scale-105"
                  alt={wideImage.title}
                />
                <div className="absolute inset-0 bg-black/40 transition duration-500 group-hover:bg-black/60"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
                <div className="absolute inset-0 flex flex-col justify-center p-8">
                  <span className="mb-2 text-xs font-medium tracking-widest text-cyan-400 uppercase">
                    {wideImage.subtitle}
                  </span>
                  <h3 className="max-w-[60%] text-2xl font-semibold leading-tight">
                    {wideImage.title}
                  </h3>
                </div>
              </ImageWithDialog>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
