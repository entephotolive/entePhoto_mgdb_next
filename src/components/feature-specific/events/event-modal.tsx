"use client";

import { useRef, useState, useTransition } from "react";
import { X, Calendar, MapPin, Tag, Plus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createEventAction } from "@/app/(dashboard)/events/event.actions";

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  createdBy: string;
}



export function EventModal({ open, onClose, createdBy }: EventModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function handleClose() {
    if (isPending) return;
    formRef.current?.reset();
    setFeedback(null);
    onClose();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);

    const formData = new FormData(e.currentTarget);
    formData.set("createdBy", createdBy);

    startTransition(async () => {
      const result = await createEventAction(formData);
      if (result.success) {
        setFeedback({ type: "success", message: result.message });
        setTimeout(() => {
          handleClose();
          // Reload page to reflect new data (server component revalidation)
          window.location.reload();
        }, 1200);
      } else {
        setFeedback({ type: "error", message: "error" in result ? result.error : "Failed to create event." });
      }
    });
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className={cn(
            "relative w-full max-w-lg rounded-2xl border border-white/10",
            "bg-[#0f1117] shadow-2xl shadow-black/60",
            "animate-in fade-in zoom-in-95 duration-200"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <Plus size={16} className="text-cyan-400" />
              </div>
              <div>
                <h2 id="modal-title" className="text-base font-semibold text-white">
                  Add New Event
                </h2>
                <p className="text-xs text-slate-500">Fill in the event details below</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isPending}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form ref={formRef} onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            {/* Event Title */}
            <div className="space-y-1.5">
              <label htmlFor="evt-title" className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                <Tag size={11} />
                Event Title
              </label>
              <Input
                id="evt-title"
                name="title"
                placeholder="e.g. Starlight Wedding Gala"
                required
                minLength={3}
                disabled={isPending}
                className="focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/40"
              />
            </div>

            {/* Date & Time */}
            <div className="space-y-1.5">
              <label htmlFor="evt-date" className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                <Calendar size={11} />
                Date &amp; Time
              </label>
              <Input
                id="evt-date"
                name="date"
                type="datetime-local"
                required
                disabled={isPending}
                className="focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/40 [color-scheme:dark]"
              />
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label htmlFor="evt-location" className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                <MapPin size={11} />
                Location
              </label>
              <Input
                id="evt-location"
                name="location"
                placeholder="e.g. Grand Ballroom, Mumbai"
                required
                minLength={2}
                disabled={isPending}
                className="focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/40"
              />
            </div>


            {/* Feedback */}
            {feedback && (
              <div
                className={cn(
                  "flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm border",
                  feedback.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                )}
              >
                {feedback.type === "success"
                  ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                  : <AlertCircle size={15} className="mt-0.5 shrink-0" />
                }
                {feedback.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.06]">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-cyan-500 text-black hover:bg-cyan-400 font-semibold min-w-[120px]"
              >
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    Create Event
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
