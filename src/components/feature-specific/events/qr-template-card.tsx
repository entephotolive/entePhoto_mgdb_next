"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { PhotographerProfile } from "@/types";

const CARD_W = 720;
const CARD_H = 1200;
const PREVIEW_W = 200;
const PREVIEW_H = Math.round((PREVIEW_W / CARD_W) * CARD_H);
const PREVIEW_SCALE = PREVIEW_W / CARD_W;

const QR_SIZE = 230;
const LOGO_BOX_SIZE_WIDTH = 152; /* <-- TUNE THIS TO FIT PERFECTLY INSIDE THE GOLDEN BOX */
const LOGO_BOX_SIZE_HEIGHT = 137; /* <-- ↕️ REDUCED HEIGHT so it doesn't spill over the top and bottom golden lines */
const LOGO_INNER_RATIO = 1;

const BACKGROUND_SRC = "/template/qr-template2.png";


export interface QrTemplateCardProps {
  eventUrl: string;
  eventSlug: string;
  profile: PhotographerProfile;
}

async function appendQr(
  container: HTMLDivElement,
  url: string,
): Promise<void> {
  const { default: QrCodeStyling } = await import("qr-code-styling");

  const qr = new QrCodeStyling({
    width: QR_SIZE,
    height: QR_SIZE,
    type: "canvas",
    data: url,
    margin: 0,
    qrOptions: { errorCorrectionLevel: "H" },
    dotsOptions: {
      type: "rounded",
      color: "#0b1020",
    },
    cornersSquareOptions: {
      type: "extra-rounded",
      color: "#0b1020",
    },
    cornersDotOptions: {
      type: "dot",
      color: "#0b1020",
    },
    backgroundOptions: {
      color: "#fffdf8",
    },
  });

  container.innerHTML = "";
  qr.append(container);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function getLogoFallback(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "ST";
}

function CardCanvas({
  qrRef,
  profile,
  avatarSrc,
}: {
  qrRef: React.RefObject<HTMLDivElement | null>;
  profile: PhotographerProfile;
  avatarSrc: string;
}) {
  const displayName = profile.studioName.trim() || profile.name.trim() || "Studio";
  const displayEmail = profile.email.trim() || "hello@studio.com";
  const fallbackMark = getLogoFallback(displayName);

  return (
    <div
      className="relative overflow-hidden rounded-[38px] bg-[#05070d] text-white"
      style={{
        width: CARD_W,
        height: CARD_H,
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}
    >
      {/* ── Brute-force override to prevent ANY browser or OS-level forced outlines from being captured in the download ── */}
      <style>{`
        div, p, img, span {
          outline: none !important;
        }
      `}</style>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BACKGROUND_SRC}
        alt=""
        crossOrigin="anonymous"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,7,15,0.15)_0%,rgba(4,7,15,0.08)_26%,rgba(4,7,15,0.08)_74%,rgba(4,7,15,0.18)_100%)]" />

      {/* ── 1. QR Frame ── */}
      {/* ⬇️ ADJUST THE 'top', 'width', and 'height' BELOW TO FIT PERFECTLY INSIDE THE GOLDEN BOX ⬇️ */}
      <div
        className="absolute flex items-center justify-center border border-[#d0ab6d]/30 bg-[linear-gradient(180deg,rgba(255,253,248,0.99)_0%,rgba(246,240,228,0.98)_100%)] p-[10px] shadow-[0_24px_60px_rgba(0,0,0,0.24)] rounded-[4px]"
        style={{
          width: 265,  /* <-- CHANGE THIS TO MATCH THE EXACT WIDTH OF THE GOLDEN BOX */
          height: 247, /* <-- CHANGE THIS TO MATCH THE EXACT HEIGHT OF THE GOLDEN BOX */
          top: "13%",  /* <-- CHANGE THIS VALUE (Decrease to move UP, Increase to move DOWN) */
          left: "49.5%",
          transform: "translateX(-50%)",
        }}
      >
        <div
          ref={qrRef}
          className="flex items-center justify-center overflow-hidden bg-[#fffdf8] rounded-[2px] [&>canvas]:block [&>svg]:block"
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* ── 2. Studio Logo & Name ── */}
      {/* ⬇️ ADJUST THE 'top' AND 'paddingLeft' BELOW TO TUNE THE EXACT POSITION ⬇️ */}
      <div
        className="absolute w-full"
        style={{ 
          top: "57%",          /* <-- ↕️ CHANGE THIS TO MOVE UP/DOWN (Increase to move DOWN, Decrease to move UP) */
          paddingLeft: "85px", /* <-- ↔️ CHANGE THIS TO MOVE LEFT/RIGHT (Increase to move RIGHT, Decrease to move LEFT) */
          paddingRight: "58px",
        }}
      >
        <div className="flex w-full items-end gap-12">
          {/* Logo Container: Removed custom borders/radius to fit inside the baked-in golden box */}
          <div
            className="flex shrink-0 items-center justify-center overflow-hidden"
            style={{ width: LOGO_BOX_SIZE_WIDTH , height: LOGO_BOX_SIZE_HEIGHT }}
          >
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt={displayName}
                crossOrigin="anonymous"
                draggable={false}
                className="block object-cover" /* <-- CHANGED to object-cover so the image fills the rectangular box perfectly without gaps */
                style={{
                  width: `${LOGO_INNER_RATIO * 100}%`,
                  height: `${LOGO_INNER_RATIO * 100}%`,
                }}
              />
            ) : (
              <div className="flex h-[80%] w-[80%] items-center justify-center rounded-[10px] bg-black/10 text-[28px] font-semibold tracking-[0.12em] text-[#e4c58a]">
                {fallbackMark}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-end gap-1 pb-2"> {/* <-- TUNE THIS: change pb-2 to pb-0 for exact bottom, or pb-4 to lift higher */}
            <p className="truncate text-[32px] font-bold leading-tight tracking-normal text-white">
              {displayName}
            </p>
            <p className="truncate text-[22px] font-medium tracking-[0.02em] text-[#c0c2cc]">
              {displayEmail}
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Footer row ── */}
      {/* ⬇️ ADJUST THE 'bottom' PERCENTAGE BELOW TO MOVE THE FOOTER UP OR DOWN ⬇️ */}
      <div
        className="absolute w-full px-[58px]"
        style={{ 
          bottom: "6%" /* <-- CHANGE THIS VALUE (Increase to move UP, Decrease to move DOWN) */
        }}
      >
        <div className="relative z-10 flex items-center justify-between border-t border-[#d0ab6d]/20 pt-5">
          <p className="text-[12px] uppercase tracking-[0.34em] text-[#d0ab6d]">
            Premium Gallery Access
          </p>
          <p className="max-w-[210px] truncate text-right text-[11px] tracking-[0.08em] text-[rgba(236,238,244,0.58)]">
            📞+91 8848086285
          </p>
        </div>
      </div>
    </div>
  );
}

export function QrTemplateCard({ eventUrl, eventSlug, profile }: QrTemplateCardProps) {
  const previewQrRef = useRef<HTMLDivElement>(null);
  const exportQrRef = useRef<HTMLDivElement>(null);
  const exportCardRootRef = useRef<HTMLDivElement>(null);
  const qrBuildRef = useRef<Promise<void> | null>(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [isQrReady, setIsQrReady] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState(profile.avatarUrl.trim());

  useEffect(() => {
    let active = true;
    const source = profile.avatarUrl.trim();

    if (!source) {
      setAvatarSrc("");
      return;
    }

    if (source.startsWith("data:")) {
      setAvatarSrc(source);
      return;
    }

    const controller = new AbortController();

    const loadAvatar = async () => {
      try {
        const response = await fetch(source, {
          cache: "force-cache",
          mode: "cors",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Avatar fetch failed with ${response.status}`);
        }

        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);

        if (active) {
          setAvatarSrc(dataUrl);
        }
      } catch {
        if (active) {
          setAvatarSrc(source);
        }
      }
    };

    void loadAvatar();

    return () => {
      active = false;
      controller.abort();
    };
  }, [profile.avatarUrl]);

  useEffect(() => {
    let cancelled = false;
    setIsQrReady(false);

    const renderQr = async () => {
      const tasks: Promise<void>[] = [];

      if (previewQrRef.current) {
        tasks.push(appendQr(previewQrRef.current, eventUrl));
      }

      if (exportQrRef.current) {
        tasks.push(appendQr(exportQrRef.current, eventUrl));
      }

      await Promise.all(tasks);
      await waitForNextPaint();

      if (!cancelled) {
        setIsQrReady(true);
      }
    };

    qrBuildRef.current = renderQr();

    qrBuildRef.current.catch((error) => {
      console.error("[QrTemplateCard] QR render failed:", error);
      if (!cancelled) {
        setIsQrReady(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [eventUrl]);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);

    try {
      await qrBuildRef.current;
      await waitForNextPaint();
      const exportRoot = exportCardRootRef.current;

      if (!exportRoot) {
        throw new Error("Template component is not ready yet.");
      }

      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(exportRoot, {
        cacheBust: true,
        backgroundColor: "#05070d",
        pixelRatio: 1,
        canvasWidth: CARD_W,
        canvasHeight: CARD_H,
        width: CARD_W,
        height: CARD_H,
        skipAutoScale: true,
      });

      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = `qr-card-${eventSlug}.png`;
      anchor.rel = "noopener";
      anchor.click();
    } catch (error) {
      console.error("[QrTemplateCard] Export failed:", error);
    } finally {
      setIsDownloading(false);
    }
  }, [eventSlug]);

  return (
    <>
      <div
        className="pointer-events-none fixed -left-[9999px] top-0"
        aria-hidden="true"
      >
        <div ref={exportCardRootRef}>
          <CardCanvas
            qrRef={exportQrRef}
            profile={profile}
            avatarSrc={avatarSrc}
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div
          className="relative overflow-hidden rounded-xl border border-white/10 shadow-2xl"
          style={{
            width: PREVIEW_W,
            height: PREVIEW_H,
          }}
          aria-label="QR template preview"
        >
        
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: CARD_W,
              height: CARD_H,
              transform: `scale(${PREVIEW_SCALE})`,
            }}
          >
            <CardCanvas
              qrRef={previewQrRef}
              profile={profile}
              avatarSrc={avatarSrc}
            />
          </div>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Preview
        </p>

        <button
          id="qr-template-download-btn"
          onClick={handleDownload}
          disabled={isDownloading || !isQrReady}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-400 transition-all hover:bg-cyan-500/20 disabled:opacity-60"
          aria-label="Download QR card as PNG"
        >
          {isDownloading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Download size={12} />
          )}
          {isDownloading ? "Generating..." : isQrReady ? "Download Template" : "Preparing..."}
        </button>
      </div>
    </>
  );
}
