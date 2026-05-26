"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { LogoutButton } from "@/components/feature-specific/auth/logout-button";

// Nav items are defined here (client-side) so icons never cross the
// server→client serialization boundary.
const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Photographers", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

interface AdminMobileNavProps {
  session: { name: string; email: string };
}

export function AdminMobileNav({ session }: AdminMobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-out drawer */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-72 flex-col bg-[#081b24] border-l border-white/5 transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span className="font-bold">Admin Portal</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Admin chip + logout */}
        <div className="m-4 space-y-2 rounded-xl border border-white/5 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-400">
              {session.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{session.name}</p>
              <p className="truncate text-xs text-slate-500">{session.email}</p>
            </div>
          </div>
          <LogoutButton redirectPath="/admin/login" />
        </div>
      </aside>
    </>
  );
}
