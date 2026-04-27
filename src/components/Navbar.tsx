"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { Menu, X } from "lucide-react";
import { AnimateIcon } from "@/components/ui/animate-icon";

import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const eventMatch = pathname?.match(/^\/event\/([^/]+)/);
  const eventBasePath = eventMatch ? `/event/${eventMatch[1]}` : null;

  const navLinks = [
    {
      name: "Live Feed",
      href: eventBasePath ? `${eventBasePath}/live` : "/qr-scanner",
    },
    {
      name: "Gallery",
      href: eventBasePath ? `${eventBasePath}/gallery` : "/qr-scanner",
    },
    {
      name: "Studio",
      href: eventBasePath ? `${eventBasePath}/studio` : "/qr-scanner",
    },
  ];

  const isActive = (path: string) => pathname === path;
  const homeHref = eventBasePath ? `${eventBasePath}/live` : "/qr-scanner";

  return (
    <>
      {/* Main Navbar */}
      <header
        className={`fixed top-4 left-1/2 z-[60] w-[90%] max-w-5xl -translate-x-1/2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3 shadow-lg backdrop-blur-xl transition-all duration-300 ${
          open ? "opacity-60 scale-[0.98]" : ""
        }`}
      >
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <Link
            href={homeHref}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Image
              src="/logo.jpeg"
              alt="Ente photo Logo"
              width={40}
              height={40}
              className="rounded-full object-cover"
              style={{ width: "auto", height: "auto" }}
              priority
            />
            <span className="font-heading font-bold text-lg md:text-xl tracking-tight text-white drop-shadow-md">Ente photo</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6 text-[15px] text-gray-300">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`font-heading font-medium tracking-wide px-3 lg:px-4 py-2 rounded-full cursor-pointer transition ${
                  isActive(link.href)
                    ? "bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-105"
                    : "hover:bg-white/10 hover:text-white hover:scale-105"
                }`}
              >
                {link.name}
              </Link>
            ))}

            <div className="w-px h-6 bg-white/20 mx-2"></div>
            <div className="flex items-center gap-2 font-heading text-xs font-bold uppercase tracking-widest text-red-400">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
              LIVE
            </div>
          </div>

          {/* Mobile Toggle */}
          <button
            type="button"
            aria-label="Toggle Menu"
            onClick={() => setOpen((prev) => !prev)}
            className="z-50 md:hidden flex items-center justify-center cursor-pointer"
          >
            <AnimateIcon animateOnHover>
              {open ? (
                <X className="text-white h-7 w-7" />
              ) : (
                <Menu className="text-white h-7 w-7" />
              )}
            </AnimateIcon>
          </button>
        </nav>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xl"
            />

            {/* Sidebar */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 120 }}
              className="fixed right-0 top-0 z-50 flex h-full w-64 flex-col p-5 md:hidden"
            >
              <div className="mt-24 flex flex-col items-center gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`font-heading tracking-wide w-48 rounded-lg border border-white/20 px-4 py-2 text-center text-[15px] font-medium transition hover:scale-105 cursor-pointer ${
                      isActive(link.href)
                        ? "bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                        : "bg-white/10 text-gray-200 hover:bg-white/20 hover:text-white"
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}

                <div className="mt-2 flex items-center gap-2 font-heading text-[11px] font-bold uppercase tracking-widest text-red-400">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                  LIVE
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
