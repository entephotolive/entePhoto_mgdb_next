"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNavItems } from "@/lib/utils/constants";
import { cn } from "@/lib/utils/cn";
import { BrandMark } from "@/components/shared/brand-mark";
import { SessionUser } from "@/types";

interface DesktopSidebarProps {
  user: SessionUser;
}

export function DesktopSidebar({ user }: DesktopSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 border-r border-white/5 flex-col p-6 bg-black/20 backdrop-blur-3xl shrink-0 sticky top-0 h-screen">
      <BrandMark />
      <div className="flex-1 overflow-y-auto overflow-x-hidden pt-4">
        <nav className="space-y-1">
          {dashboardNavItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border-r-2 border-cyan-400"
                    : "hover:bg-white/5 text-slate-500 hover:text-slate-200"
                )}
              >
                <span className={cn(
                  "transition-colors",
                  isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
                )}>
                  <Icon size={20} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="flex items-center gap-3 p-2 bg-white/5 rounded-2xl hover:bg-white/10 transition cursor-default">
          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-slate-800 text-cyan-400 font-bold shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">{user.name}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
