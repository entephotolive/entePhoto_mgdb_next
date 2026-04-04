import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface SceneBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  grid?: boolean;
  glows?: boolean;
  noise?: boolean;
  intensity?: "low" | "medium" | "high";
}

export function SceneBackground({
  grid = true,
  glows = true,
  noise = true,
  intensity = "medium",
  className,
  children,
  ...props
}: SceneBackgroundProps) {
  return (
    <div
      className={cn(
        "relative min-h-screen w-full overflow-hidden bg-background selection:bg-sky-500/30",
        className
      )}
      {...props}
    >
      {/* Static Background Wrapper */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* 1. Grid Layer */}
        {grid && (
          <div
            className={cn(
              "absolute inset-0 bg-page-grid",
              intensity === "low" ? "opacity-30" : intensity === "high" ? "opacity-100" : "opacity-70"
            )}
          />
        )}

        {/* 2. Aurora/Glow Layer */}
        {glows && (
          <div className="absolute inset-0 overflow-hidden">
            <div
              className={cn(
                "absolute -top-[10%] -left-[10%] h-[60%] w-[60%] rounded-full bg-sky-500/10 blur-[120px]",
                intensity === "low" && "opacity-50"
              )}
            />
            <div
              className={cn(
                "absolute top-[20%] -right-[10%] h-[50%] w-[50%] rounded-full bg-indigo-500/10 blur-[120px]",
                intensity === "low" && "opacity-50"
              )}
            />
            <div
              className={cn(
                "absolute -bottom-[10%] left-[20%] h-[40%] w-[60%] rounded-full bg-emerald-500/5 blur-[120px]",
                intensity === "low" && "opacity-50"
              )}
            />
          </div>
        )}


        {/* 4. Shape Layer (Decorative Rounds) */}
        <div className="absolute inset-0">
          {/* Soft blob version */}
          <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute top-[45%] left-[65%] h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>
      </div>


      {/* Content Container */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
