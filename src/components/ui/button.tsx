import * as React from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-white text-slate-950 hover:bg-slate-100 shadow-sm",
  secondary:
    "bg-white/10 text-white hover:bg-white/15 border border-white/10",
  outline:
    "bg-transparent text-white border border-white/10 hover:bg-white/5",
  ghost:
    "bg-transparent text-slate-400 hover:bg-white/5 hover:text-white",
  danger:
    "bg-rose-500 text-white hover:bg-rose-600",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0b] disabled:pointer-events-none disabled:opacity-50 active:scale-95",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";
