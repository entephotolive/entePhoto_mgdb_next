import * as React from "react";
import { cn } from "@/lib/utils/cn";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "outline" | "destructive" | string;

const variantStyles: Record<string, string> = {
  default: "bg-white text-slate-950",
  secondary: "bg-white/10 text-slate-300 border-white/10",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-400/10 text-amber-200 border-amber-400/20",
  outline: "bg-transparent text-slate-400 border-white/10",
  destructive: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
