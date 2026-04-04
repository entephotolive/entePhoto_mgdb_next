"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNavItems } from "@/lib/utils/constants";
import { cn } from "@/lib/utils/cn";

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0d0d0f]/95 backdrop-blur-xl border-t border-white/[0.06]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch justify-around h-16">
        {dashboardNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-1 flex-col items-center justify-center gap-[3px] transition-all duration-200 group"
            >
              {/* Active top indicator line */}
              <span
                className={cn(
                  "absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full transition-all duration-300",
                  isActive
                    ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]"
                    : "bg-transparent"
                )}
              />

              {/* Icon container */}
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-cyan-400/10 text-cyan-400"
                    : "text-slate-500 group-hover:text-slate-300 group-hover:bg-white/5"
                )}
              >
                <Icon size={19} />
              </span>

              {/* Label */}
              <span
                className={cn(
                  "text-[9px] font-bold uppercase tracking-widest transition-colors duration-200",
                  isActive ? "text-cyan-400" : "text-slate-600 group-hover:text-slate-400"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
