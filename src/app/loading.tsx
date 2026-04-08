import { Loader2 } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-5">
        
        {/* Animated Loader Container */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
          
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-lg">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        </div>

        {/* Text Section */}
        <div className="space-y-1 text-center">
          <h2 className="text-sm font-semibold tracking-wide text-foreground">
            Loading Experience
          </h2>
          <p className="text-xs text-muted-foreground">
            Please wait while we prepare everything...
          </p>
        </div>

      </div>
    </div>
  );
}