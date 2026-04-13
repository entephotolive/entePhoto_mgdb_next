"use client";

import { Bell, Search } from "lucide-react";
import type { ReactNode } from "react";
import { SessionUser } from "@/types";
import { DesktopSidebar } from "@/components/shared/desktop-sidebar";
import { MobileBottomNav } from "@/components/shared/mobile-bottom-nav";
import { GlobalUploadProgress } from "@/components/feature-specific/uploads/global-upload-progress";
import { BrandMark } from "./brand-mark";
import Link from "next/link";
import Image from "next/image";

interface DashboardShellProps {
  user: SessionUser;
  children: ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  return (
    <div className="flex flex-1 text-slate-300 overflow-hidden font-sans selection:bg-cyan-500/30 h-screen">
      {/* ── Desktop Sidebar (lg+) ── */}
      <DesktopSidebar user={user} />

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="px-4 sm:px-6 lg:px-10 py-3 lg:py-5 flex items-center justify-between shrink-0 sticky top-0 z-10 bg-background/60 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center gap-3">
            {/* Brand mark — mobile only */}
            <div className="lg:hidden flex items-center gap-2">
              <Link
                href="/"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Image
                  src="/logo.jpeg"
                  alt="Ente photo Logo"
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                  priority
                />
                <span className="text-sm font-bold text-cyan-400 tracking-tight">
                  Ente photo
                </span>
              </Link>
            </div>

            {/* Search input — sm+ only */}
            <div className="relative group hidden sm:flex items-center">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors"
                size={14}
              />
              <input
                type="text"
                placeholder="Search events or media..."
                className="bg-white/5 border border-white/5 rounded-full py-[7px] pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 w-48 lg:w-64 transition-all text-slate-200 placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <button
              className="hover:text-slate-200 transition-colors bg-white/5 p-2 rounded-full"
              aria-label="Notifications"
            >
              <Bell size={17} />
            </button>
            {/* User avatar chip — mobile header */}
            <div className="lg:hidden w-8 h-8 rounded-full bg-slate-800 border border-white/10 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Scrollable page content */}
        {/* pb-24 on mobile = clears the 64px bottom nav + some breathing room */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 pt-4 lg:pt-4 pb-24 lg:pb-10">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Tab Bar ── */}
      <MobileBottomNav />
      {/* Global widget mounted here so it's over all routes */}
      <GlobalUploadProgress />
    </div>
  );
}
