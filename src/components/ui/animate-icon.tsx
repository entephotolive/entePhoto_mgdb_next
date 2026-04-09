import * as React from "react";
import { cn } from "@/lib/utils";

export interface AnimateIconProps extends React.HTMLAttributes<HTMLDivElement> {
  animateOnHover?: boolean;
}

const AnimateIcon = React.forwardRef<HTMLDivElement, AnimateIconProps>(
  ({ className, animateOnHover = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex transition-transform duration-200",
          animateOnHover && "hover:scale-110 hover:rotate-6 active:scale-95",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AnimateIcon.displayName = "AnimateIcon";

export { AnimateIcon };