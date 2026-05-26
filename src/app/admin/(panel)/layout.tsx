import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getCurrentAdminSession } from "@/lib/services/auth.service";
import {
  ShieldCheck,
  Users,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/feature-specific/auth/logout-button";
import { AdminMobileNav } from "@/components/feature-specific/auth/admin-mobile-nav";

// Server-side: icons are React components that cannot cross the server→client
// boundary as props. We keep NAV_ITEMS here only for the server-rendered sidebar.
const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Photographers", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getCurrentAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[#06131a] text-white">
      {/* ── Desktop Sidebar (server-rendered, icons are fine here) ──── */}
      <nav className="fixed left-0 top-0 hidden h-full w-64 flex-col border-r border-white/5 bg-[#081b24] md:flex">
        {/* Brand */}
        <div className="flex items-center gap-3 p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">Admin Portal</span>
        </div>

        {/* Links */}
        <div className="flex-1 space-y-1 px-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-400 transition-all hover:bg-white/5 hover:text-white"
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>

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
      </nav>

      {/* ── Mobile Top Bar ─────────────────────────────────────────── */}
      {/* AdminMobileNav is a Client Component — only pass serializable values */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-white/5 bg-[#081b24] px-4 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="font-bold tracking-tight">Admin Portal</span>
        </div>
        <AdminMobileNav session={{ name: session.name, email: session.email }} />
      </header>

      {/* ── Main Content ────────────────────────────────────────────── */}
      <main className="md:pl-64">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-20 sm:px-6 md:pt-6 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
