import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentAdminSession } from "@/lib/services/auth.service";
import { ShieldCheck, Users, LayoutDashboard, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/feature-specific/auth/logout-button";

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
      {/* Sidebar / Navigation */}
      <nav className="fixed left-0 top-0 h-full w-64 border-r border-white/5 bg-[#081b24] p-6 hidden md:block">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">Admin Portal</span>
        </div>

        <div className="space-y-2">
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Users className="h-5 w-5" />
            Photographers
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </div>

        <div className="absolute bottom-10 left-6 right-6">
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3">
            <div className="h-8 w-8 rounded-full bg-emerald-500/20" />
            <div className="overflow-hidden">
              <p className="truncate text-sm font-medium">{session.name}</p>
              <p className="truncate text-xs text-slate-500">{session.email}</p>
            </div>
          </div>
          <LogoutButton redirectPath="/admin/login" />
        </div>
      </nav>

      {/* Main Content */}
      <main className="md:pl-64">
        <div className="mx-auto max-w-7xl p-6 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
