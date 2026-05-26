/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandMark } from "@/components/shared/brand-mark";
import {
  updatePhotographerPhone,
  getPhotographerPendingInfo,
} from "@/app/photographer/pending-actions";
import { Phone, Clock, CheckCircle2, Edit2, X } from "lucide-react";

// ─── Pending Modal ────────────────────────────────────────────────────────────
function PendingModal({ onClose }: { onClose?: () => void }) {
  const [phone, setPhone] = useState("");
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [confirmedPhone, setConfirmedPhone] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch existing phone number from DB on mount
  useEffect(() => {
    getPhotographerPendingInfo().then((info) => {
      if (info?.phoneNumber) {
        setSavedPhone(info.phoneNumber);
      } else {
        setIsEditing(true); // No phone yet → open form immediately
      }
    }).catch(() => {
      // Session may not exist yet — keep editing mode open
      setIsEditing(true);
    });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const result = await updatePhotographerPhone(phone);

        // Verify the server actually returned the saved value
        if (!result.phoneNumber) {
          throw new Error(
            "Server did not confirm the phone number was saved. Please try again."
          );
        }

        setSavedPhone(result.phoneNumber);
        setConfirmedPhone(result.phoneNumber); // track confirmed value separately
        setIsEditing(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      } catch (err: any) {
        setError(err.message || "Failed to save phone number.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#081b24] shadow-2xl">
        {/* Top accent gradient */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

        <div className="p-8">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <Clock className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Approval Pending
                </h2>
                <p className="text-sm text-slate-400">
                  Your account is under review
                </p>
              </div>
            </div>
          </div>

          {/* Info banner */}
          <div className="mb-6 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
            <p className="text-sm leading-relaxed text-slate-300">
              👋 Thank you for registering!{" "}
              <span className="font-semibold text-amber-400">
                The admin will contact you as soon as possible
              </span>{" "}
              to activate your account. Please provide your phone number below
              so we can reach you.
            </p>
          </div>

          {/* Phone section */}
          {savedPhone && !isEditing ? (
            <div className="mb-6">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-cyan-400" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Contact Number
                    </p>
                    <p className="font-semibold text-white">{savedPhone}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPhone(savedPhone);
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit
                </button>
              </div>

              {success && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    Saved!{" "}
                    <span className="font-bold">{confirmedPhone}</span>{" "}
                    has been recorded and the admin has been notified.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mb-6 space-y-3">
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  required
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                />
              </div>

              {error && (
                <p className="text-xs text-rose-400">{error}</p>
              )}

              <div className="flex gap-2">
                {savedPhone && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex h-11 items-center gap-1.5 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-400 transition hover:bg-white/5"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                )}
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-11 flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
                    </div>
                  ) : (
                    "Save Phone Number"
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Footer note */}
          <p className="text-center text-xs text-slate-500">
            You will receive a confirmation once your account is approved.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Inner Form (uses useSearchParams) ───────────────────────────────────────
function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);

  useEffect(() => {
    const urlError = searchParams.get("error");
    const pending = searchParams.get("pending");
    if (urlError) setError(urlError);
    if (pending === "true") setShowPendingModal(true);
  }, [searchParams]);

  async function handleGoogleSignIn() {
    setError(null);
    setIsPending(true);
    try {
      window.location.href = "/api/auth/photographer";
    } catch {
      setError("Failed to initialize Google Sign-In.");
      setIsPending(false);
    }
  }

  return (
    <>
      <Card
        variant="glass"
        className="w-full border-white/10 p-8 shadow-2xl backdrop-blur-2xl transition-all duration-500 hover:border-white/20"
      >
        <div className="flex flex-col items-center">
          <BrandMark />

          <div className="mt-2 space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Photographer Portal
            </h1>
            <p className="text-sm font-medium text-slate-400">
              Sign in to access your dashboard
            </p>
          </div>
        </div>

        <div className="mt-10 space-y-6">
          {error ? (
            <div className="rounded-lg bg-rose-500/10 p-3 text-center text-sm font-medium text-rose-400 border border-rose-500/20">
              {error}
            </div>
          ) : null}

          <Button
            className="relative h-12 w-full overflow-hidden rounded-xl bg-white text-slate-950 font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
            onClick={handleGoogleSignIn}
            disabled={isPending}
          >
            {isPending ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                <span>Redirecting...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <svg className="h-5 w-5" viewBox="0 0 48 48">
                  <path
                    fill="#FFC107"
                    d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                  />
                </svg>
                <span>Continue with Google</span>
              </div>
            )}
          </Button>
          <p className="text-center text-xs text-slate-500 uppercase tracking-widest font-semibold">
            Secure Access
          </p>
        </div>
      </Card>

      {showPendingModal && <PendingModal onClose={() => setShowPendingModal(false)} />}
    </>
  );
}

// ─── Public Export (wrapped in Suspense for useSearchParams) ─────────────────
export function LoginForm() {
  return (
    <Suspense>
      <LoginFormInner />
    </Suspense>
  );
}
