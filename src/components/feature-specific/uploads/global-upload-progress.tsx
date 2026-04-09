"use client";

import { useEffect } from "react";
import {
  CopyIcon,
  Expand,
  Minimize2,
  X,
  AlertCircle,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Loader2,
  MousePointer2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGlobalUpload } from "@/hooks/use-global-upload";
import { Progress } from "@/components/ui/progress";

export function GlobalUploadProgress() {
  const {
    isWidgetVisible,
    isWidgetMinimised,
    isUploading,
    uploadStatus,
    currentFileName,
    overallProgress,
    completedCount,
    totalCount,
    setWidgetVisible,
    setWidgetMinimised,
    clearCompleted,
    clearAll,
    startUpload,
  } = useGlobalUpload();

  // ── Browser Leave Protection ────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading) {
        e.preventDefault();
        e.returnValue = "Upload in progress. Leaving may cancel your upload.";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isUploading]);

  if (!isWidgetVisible) return null;

  // ── Rendering helpers ───────────────────────────────────────────
  const getStatusIcon = () => {
    switch (uploadStatus) {
      case "uploading":
        return <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />;
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case "partial":
      case "failed":
        return <AlertCircle className="w-5 h-5 text-rose-400" />;
      default:
        return <CopyIcon className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case "uploading":
        return `Uploading ${currentFileName || "..."}`;
      case "success":
        return "All uploads complete!";
      case "partial":
        return "Finished with some errors";
      case "failed":
        return "Upload failed";
      default:
        return "Queued for upload";
    }
  };

  const handleClose = () => {
    if (isUploading) {
      // Prevent accidental closing while uploading, force minimize instead
      setWidgetMinimised(true);
      return;
    }
    clearAll();
    setWidgetVisible(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 w-full max-w-[360px] sm:max-w-sm px-4 sm:px-0 pointer-events-none"
      >
        <div className="bg-[#121214] border border-white/10 rounded-2xl sm:rounded-[1.5rem] p-4 sm:p-5 shadow-2xl flex flex-col gap-3 pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 w-[80%]">
              {getStatusIcon()}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-200 truncate">
                  {getStatusText()}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  {completedCount} OF {totalCount} FILES
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setWidgetMinimised(!isWidgetMinimised)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                {isWidgetMinimised ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>

              {!isUploading && (
                <button
                  onClick={handleClose}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar & Details (Collapsible) */}
          <AnimatePresence initial={false}>
            {!isWidgetMinimised && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-400">
                      {overallProgress}% Complete
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-300 relative"
                      style={{ width: `${overallProgress}%` }}
                    >
                      {isUploading && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions when done */}
                {!isUploading &&
                  ["success", "partial", "idle", "failed"].includes(uploadStatus) &&
                  totalCount > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/5 flex gap-2 w-full">
                      {uploadStatus === "idle" && (
                        <button
                          onClick={() => startUpload()}
                          className="flex-1 py-2 bg-cyan-400 hover:bg-cyan-300 text-black rounded-lg text-xs font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 group/btn"
                        >
                          START UPLOAD 
                          <MousePointer2
                            className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform"
                            size={14}
                          />
                        </button>
                      )}
                      
                      {completedCount > 0 && (
                        <button
                          onClick={clearCompleted}
                          className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold text-slate-300 transition-colors"
                        >
                          Clear Completed
                        </button>
                      )}

                      {uploadStatus !== "idle" && (
                        <button
                          onClick={handleClose}
                          className="flex-1 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-bold transition-colors"
                        >
                          Dismiss
                        </button>
                      )}

                      {uploadStatus === "idle" && completedCount === 0 && (
                        <button
                          onClick={handleClose}
                          className="flex-1 py-2 bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Cancel All
                        </button>
                      )}
                    </div>
                  )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
