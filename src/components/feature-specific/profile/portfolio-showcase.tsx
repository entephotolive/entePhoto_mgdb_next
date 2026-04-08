"use client";

import { useOptimistic, useRef, useTransition, useState, useCallback } from "react";
import { Plus, Upload, Info, Trash2, X, CheckCircle, XCircle } from "lucide-react";
import { addPortfolioMoment, deletePortfolioMoment } from "@/app/admin/(dashboard)/profile/action";
import { compressImage, PRESET_3MB } from "@/lib/utils/compress-image";
import { PortfolioMoment } from "@/types";
import { cn } from "@/lib/utils/cn";

// ─── Inline toast ─────────────────────────────────────────────────────────────
type ToastState = { type: "success" | "error"; message: string } | null;

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  if (!toast) return null;
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-panel border text-sm font-medium",
        toast.type === "success"
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          : "bg-red-500/10 border-red-500/30 text-red-300"
      )}
    >
      {toast.type === "success" ? (
        <CheckCircle size={16} className="shrink-0" />
      ) : (
        <XCircle size={16} className="shrink-0" />
      )}
      <span>{toast.message}</span>
      <button
        onClick={onDismiss}
        className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Delete confirmation modal ────────────────────────────────────────────────
function DeleteModal({
  open,
  onConfirm,
  onCancel,
  pending,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      {/* Modal */}
      <div className="relative bg-[#141416] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-panel flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Delete Moment?</h3>
            <p className="text-slate-500 text-xs mt-0.5">
              This will permanently remove the image from your portfolio and Cloudinary.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            {pending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Moment card ──────────────────────────────────────────────────────────────
function MomentCard({
  moment,
  onDelete,
  deleting,
}: {
  moment: PortfolioMoment;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative aspect-[4/5] rounded-2xl overflow-hidden bg-slate-900 transition-opacity",
        deleting && "opacity-40 pointer-events-none"
      )}
    >
      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={moment.url}
        alt={moment.caption || "Portfolio moment"}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

      {/* Caption */}
      {moment.caption && (
        <p className="absolute bottom-3 left-3 right-9 text-[11px] text-white/80 font-medium leading-tight line-clamp-2">
          {moment.caption}
        </p>
      )}

      {/* Delete button — appears on hover */}
      <button
        type="button"
        onClick={() => onDelete(moment.id)}
        disabled={deleting}
        aria-label="Delete moment"
        className={cn(
          "absolute top-2.5 right-2.5 w-8 h-8 rounded-full",
          "bg-black/60 backdrop-blur-sm border border-white/10",
          "flex items-center justify-center",
          "text-slate-400 hover:text-red-400 hover:bg-red-500/20 hover:border-red-500/40",
          "opacity-0 group-hover:opacity-100 transition-all duration-200",
          "disabled:opacity-40"
        )}
      >
        {deleting ? (
          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Trash2 size={13} />
        )}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface PortfolioShowcaseProps {
  userId: string;
  initialMoments: PortfolioMoment[];
}

type OptimisticAction =
  | { type: "add"; moment: PortfolioMoment }
  | { type: "delete"; id: string };

export function PortfolioShowcase({ userId, initialMoments }: PortfolioShowcaseProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [isCompressing, setIsCompressing] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  // Which moment is being confirmed for deletion
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Which moment is actively being deleted (after confirm)
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);

  const [optimisticMoments, dispatchOptimistic] = useOptimistic(
    initialMoments,
    (state: PortfolioMoment[], action: OptimisticAction) => {
      if (action.type === "add") return [action.moment, ...state];
      if (action.type === "delete") return state.filter((m) => m.id !== action.id);
      return state;
    }
  );

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Upload handler ──────────────────────────────────────────────────────────
  // Fix for "Body exceeded 1 MB limit":
  //   Raw photographer images are 3–25 MB. Next.js Server Actions cap at 1 MB.
  //   PRESET_3MB compresses client-side (Canvas → WebP ≤ 1920px, 90% quality)
  //   so the FormData payload is ≤1–3 MB before it ever hits the server.
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset so the same file can be re-selected

    // ── Step 1: compress on the client (targets ≤ 3 MB) ──────────────────────
    setIsCompressing(true);
    let compressed: File;
    try {
      compressed = await compressImage(file, PRESET_3MB);
    } catch {
      showToast("error", "Could not compress this image. Please try another file.");
      setIsCompressing(false);
      return;
    }
    setIsCompressing(false);

    // ── Step 2: optimistic UI + server upload ────────────────────────────────
    const tempId   = `temp-${Date.now()}`;
    const localUrl = URL.createObjectURL(compressed);

    startTransition(async () => {
      dispatchOptimistic({
        type: "add",
        moment: { id: tempId, url: localUrl, publicId: "", caption: "" },
      });

      const fd = new FormData();
      fd.append("file", compressed);

      const result = await addPortfolioMoment(userId, fd);

      if (!result.ok) {
        showToast("error", "error" in result ? result.error : "Portfolio upload failed.");
        // Optimistic item reverts automatically when the transition ends
      } else {
        showToast("success", "Moment added to your portfolio!");
      }

      URL.revokeObjectURL(localUrl);
    });
  }

  // ── Delete handler (two-step: confirm → execute) ────────────────────────────
  function handleDeleteClick(id: string) {
    setDeletingId(id);
  }

  function handleDeleteConfirm() {
    if (!deletingId) return;
    const idToDelete = deletingId;
    setDeletingId(null);
    setDeletePendingId(idToDelete);

    startTransition(async () => {
      dispatchOptimistic({ type: "delete", id: idToDelete });

      const result = await deletePortfolioMoment(idToDelete, userId);
      setDeletePendingId(null);

      if (!result.ok) {
        showToast("error", "error" in result ? result.error : "Failed to delete moment.");
      } else {
        showToast("success", "Moment deleted successfully.");
      }
    });
  }

  // Disable all upload triggers while compressing OR while the server action is pending
  const isBusy  = isCompressing || isPending;
  const isEmpty = optimisticMoments.length === 0;

  return (
    <>
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Great Moments</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showcase your best shots from previous ceremonies.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 hover:shadow-glow transition-all duration-200 shrink-0 disabled:opacity-50"
          >
            {isCompressing ? (
              <span className="w-3.5 h-3.5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
            ) : (
              <Plus size={15} />
            )}
            {isCompressing ? "Compressing…" : "Add New Moment"}
          </button>
        </div>

        {/* Empty state */}
        {isEmpty && !isBusy && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-dashed border-white/15 flex items-center justify-center">
              <Upload size={22} className="text-slate-600" />
            </div>
            <p className="text-sm text-slate-500 font-medium">No moments yet</p>
            <p className="text-xs text-slate-600 max-w-[200px]">
              Upload your first portfolio image to showcase your work.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
            >
              + Upload an image
            </button>
          </div>
        )}

        {/* Grid */}
        {!isEmpty && (
          <div className="grid grid-cols-3 gap-3">
            {optimisticMoments.map((moment) => (
              <MomentCard
                key={moment.id}
                moment={moment}
                onDelete={handleDeleteClick}
                deleting={deletePendingId === moment.id}
              />
            ))}

            {/* Upload placeholder card */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              className="group relative aspect-[4/5] rounded-2xl border-2 border-dashed border-white/15 hover:border-cyan-500/40 flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:bg-cyan-500/5 disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-cyan-500/10 flex items-center justify-center transition-colors">
                {isBusy ? (
                  <span className="w-5 h-5 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
                ) : (
                  <Upload size={18} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                )}
              </div>
              <span className="text-[11px] text-slate-600 group-hover:text-slate-400 font-medium transition-colors uppercase tracking-wider">
                {isCompressing ? "Compressing…" : isPending ? "Uploading…" : "Upload"}
              </span>
            </button>
          </div>
        )}

        {/* Info tip */}
        <div className="flex items-start gap-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/15 p-3.5">
          <Info size={14} className="text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Your portfolio images are displayed in high resolution. For best results, use{" "}
            <span className="text-cyan-400 font-medium">4:5 aspect ratio</span> images with
            a minimum width of 1200px. These will be visible to potential clients on your public
            profile.
          </p>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Delete confirmation modal */}
      <DeleteModal
        open={deletingId !== null}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingId(null)}
        pending={deletePendingId !== null}
      />

      {/* Toast */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
