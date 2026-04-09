"use client";

import QRCode from "react-qr-code";
import { useRef, useState } from "react";
import { Download, Copy, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface QRGeneratorProps {
  eventId: string;
  eventTitle: string;
}

const APP_URL = window.location.origin;


export function QRGenerator({ eventId, eventTitle }: QRGeneratorProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const eventUrl = `${APP_URL}/event/${eventId}/scan`;

 

  const handleCopy = async () => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    // Clone and add white background for export
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const blob = new Blob([clone.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${eventTitle.toLowerCase().replace(/\s+/g, "-")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* QR Code frame */}
      <div className="relative group">
        {/* Glow ring */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-cyan-500/40 via-sky-500/20 to-transparent blur-lg opacity-70 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Card */}
        <div
          ref={qrRef}
          className="relative bg-white rounded-2xl p-5 shadow-2xl"
        >
          <QRCode
            value={eventUrl}
            size={180}
            bgColor="#ffffff"
            fgColor="#020617"
            level="H"
            style={{ display: "block" }}
          />
        </div>
      </div>

      {/* Label */}
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 text-center">
        Scan to open Event
      </p>

      {/* URL pill */}
      <div className="flex items-center w-full gap-2 rounded-xl bg-white/5 border border-white/[0.07] px-3 py-2.5">
        <code className="flex-1 text-[11px] text-cyan-400 truncate font-mono">
          {eventUrl}
        </code>
        <button
          onClick={handleCopy}
          title="Copy link"
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-all",
            copied
              ? "text-emerald-400"
              : "text-slate-500 hover:text-white hover:bg-white/10"
          )}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
        <a
          href={eventUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in new tab"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-500 hover:text-white hover:bg-white/10 transition-all"
        >
          <ExternalLink size={13} />
        </a>
      </div>

      {/* Actions */}
      <button
        onClick={handleDownload}
        className="flex items-center gap-2 w-full justify-center py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/20 transition-all"
      >
        <Download size={14} />
        Download QR Code
      </button>
    </div>
  );
}
