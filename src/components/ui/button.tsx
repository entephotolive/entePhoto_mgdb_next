import * as React from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger" | string;
type ButtonSize = "default" | "sm" | "lg" | "icon" | "icon-sm" | string;

const variantStyles: Record<string, string> = {
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

const sizeStyles: Record<string, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-lg px-3 text-xs",
  lg: "h-11 px-6 text-sm",
  icon: "h-10 w-10 p-0",
  "icon-sm": "h-8 w-8 p-0",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0b] disabled:pointer-events-none disabled:opacity-50 active:scale-95",
        variantStyles[variant],
        sizeStyles[size] ?? sizeStyles.default,
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";
