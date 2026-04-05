import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full appearance-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-sky-300/60 focus:outline-none focus:ring-2 focus:ring-sky-300/20",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);

Select.displayName = "Select";
