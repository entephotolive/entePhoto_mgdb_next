"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path) => pathname === path;

  return (
    <>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl px-6 py-3 flex items-center justify-between bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg z-50">
        <Link
          href="/"
          className="flex items-center gap-2 cursor-pointer"
        >
          <img
            src="/logo.jpeg"
            className="w-10 h-10 rounded-full object-cover"
            alt="logo"
          />
          <span className="font-semibold text-white">Photo Ceremony</span>
        </Link>

        <div className="hidden md:flex items-center gap-4 text-base text-gray-300">
          <div className="flex items-center gap-2 text-sm text-red-400">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            LIVE
          </div>

          <Link
            href="/live"
            className={`px-4 py-2 rounded-full cursor-pointer transition ${
              isActive("/live")
                ? "bg-white/20 text-white scale-105"
                : "hover:bg-white/10 hover:scale-105"
            }`}
          >
            Live Feed
          </Link>

          <Link
            href="/gallery"
            className={`px-4 py-2 rounded-full cursor-pointer transition ${
              isActive("/gallery")
                ? "bg-white/20 text-white scale-105"
                : "hover:bg-white/10 hover:scale-105"
            }`}
          >
            Gallery
          </Link>

          <Link
            href="/studio"
            className={`px-4 py-2 rounded-full cursor-pointer transition ${
              isActive("/studio")
                ? "bg-white/20 text-white scale-105"
                : "hover:bg-white/10 hover:scale-105"
            }`}
          >
            Studio
          </Link>

          <div className="w-px h-6 bg-white/20 mx-2"></div>

          <div className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 border border-white/20 hover:bg-white/20 hover:scale-105 transition cursor-pointer">
            👤
          </div>
        </div>

        <button
          type="button"
          aria-label="Toggle navigation"
          className="md:hidden flex flex-col gap-1 cursor-pointer"
          onClick={() => setOpen(!open)}
        >
          <span className="w-6 h-[2px] bg-white"></span>
          <span className="w-6 h-[2px] bg-white"></span>
          <span className="w-6 h-[2px] bg-white"></span>
        </button>
      </div>

      <div
        className={`fixed top-20 right-4 w-48 transition-all duration-300 ${
          open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        } bg-black/80 backdrop-blur-xl border border-white/20 rounded-xl p-4 flex flex-col gap-4 text-sm z-50`}
      >
        <Link
          href="/live"
          onClick={() => setOpen(false)}
          className={`cursor-pointer ${
            isActive("/live") ? "text-white font-semibold" : "hover:text-white"
          }`}
        >
          Live Feed
        </Link>

        <Link
          href="/gallery"
          onClick={() => setOpen(false)}
          className={`cursor-pointer ${
            isActive("/gallery") ? "text-white font-semibold" : "hover:text-white"
          }`}
        >
          Gallery
        </Link>

        <Link
          href="/studio"
          onClick={() => setOpen(false)}
          className={`cursor-pointer ${
            isActive("/studio") ? "text-white font-semibold" : "hover:text-white"
          }`}
        >
          Studio
        </Link>

        <div className="flex items-center gap-2 text-red-400 mt-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          LIVE
        </div>
      </div>
    </>
  );
}
