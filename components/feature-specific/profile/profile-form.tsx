"use client";

import { useCallback, useState, useTransition } from "react";
import {
  MapPin,
  Lock,
  ChevronDown,
  CheckCircle,
  XCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AvatarUpload } from "@/components/feature-specific/profile/avatar-upload";
import { SpecializationTags } from "@/components/feature-specific/profile/specialization-tags";
import { updateProfile, uploadProfileImage } from "@/app/(dashboard)/profile/action";
import { ProfileData, SPECIALIZATION_OPTIONS } from "@/types";

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  if (!toast) return null;
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-panel border text-sm font-medium",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
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

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Input styles helper ──────────────────────────────────────────────────────
const inputClass = cn(
  "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200",
  "placeholder:text-slate-600 outline-none transition-all duration-200",
  "focus:border-cyan-500/50 focus:shadow-[0_0_0_1px_rgba(34,211,238,0.2)] focus:bg-white/8"
);

// ─── ProfileForm ──────────────────────────────────────────────────────────────
interface ProfileFormProps {
  initialData: ProfileData;
  userId: string;
}

export function ProfileForm({ initialData, userId }: ProfileFormProps) {
  // Form state
  const [name, setName] = useState(initialData.name ?? "");
  const [studioName, setStudioName] = useState(initialData.studioName ?? "");
  const [studioLocation, setStudioLocation] = useState(initialData.studioLocation ?? "");
  const [specialization, setSpecialization] = useState(initialData.specialization ?? "");
  const [specializations, setSpecializations] = useState<string[]>(
    initialData.specializations ?? []
  );
  const [bio, setBio] = useState(initialData.bio ?? "");

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl ?? "");
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [localAvatarPreview, setLocalAvatarPreview] = useState<string>("");
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Transitions & toast
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastState>(null);

  // Specialization dropdown open state
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Called when user picks a new avatar file
  function handleAvatarSelected(file: File, preview: string) {
    setPendingAvatarFile(file);
    setLocalAvatarPreview(preview);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      let finalAvatarUrl = avatarUrl;

      // Upload avatar first if one was selected
      if (pendingAvatarFile) {
        setAvatarUploading(true);
        const fd = new FormData();
        fd.append("file", pendingAvatarFile);
        const uploadResult = await uploadProfileImage(fd);
        setAvatarUploading(false);

        if (!uploadResult.ok) {
          showToast("error", uploadResult.error);
          return;
        }

        finalAvatarUrl = uploadResult.data.url;
        setAvatarUrl(finalAvatarUrl);
        setLocalAvatarPreview("");
        setPendingAvatarFile(null);
      }

      const result = await updateProfile(userId, {
        name,
        studioName,
        studioLocation,
        specialization,
        specializations,
        bio,
        avatarUrl: finalAvatarUrl,
      });

      if (result.ok) {
        showToast("success", "Profile updated successfully!");
      } else {
        showToast("error", result.error);
      }
    });
  }

  function handleCancel() {
    setName(initialData.name ?? "");
    setStudioName(initialData.studioName ?? "");
    setStudioLocation(initialData.studioLocation ?? "");
    setSpecialization(initialData.specialization ?? "");
    setSpecializations(initialData.specializations ?? []);
    setBio(initialData.bio ?? "");
    setAvatarUrl(initialData.avatarUrl ?? "");
    setLocalAvatarPreview("");
    setPendingAvatarFile(null);
  }

  const isSaving = isPending || avatarUploading;

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white/[0.03] border border-white/8 backdrop-blur-sm p-6 flex flex-col gap-6"
      >
        {/* Avatar */}
        <div className="flex justify-center pt-2">
          <AvatarUpload
            currentUrl={avatarUrl}
            previewUrl={localAvatarPreview}
            name={name}
            onFileSelected={handleAvatarSelected}
            uploading={avatarUploading}
          />
        </div>

        {/* Full Name */}
        <Field label="Full Name">
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className={inputClass}
            required
          />
        </Field>

        {/* Studio Location */}
        <Field label="Studio Location">
          <div className="relative">
            <MapPin
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              id="profile-studio-location"
              type="text"
              value={studioLocation}
              onChange={(e) => setStudioLocation(e.target.value)}
              placeholder="City, Country"
              className={cn(inputClass, "pl-9")}
            />
          </div>
        </Field>

        {/* Studio Specializations */}
        <Field label="Studio Specializations">
          <SpecializationTags
            value={specializations}
            onChange={setSpecializations}
          />
        </Field>

        {/* Studio Name */}
        <Field label="Studio Name">
          <input
            id="profile-studio-name"
            type="text"
            value={studioName}
            onChange={(e) => setStudioName(e.target.value)}
            placeholder="Your studio name"
            className={inputClass}
          />
        </Field>

        {/* Email — read only */}
        <Field label="Email Address">
          <div className="relative">
            <input
              id="profile-email"
              type="email"
              value={initialData.email}
              readOnly
              className={cn(
                inputClass,
                "pr-10 cursor-not-allowed opacity-60 select-none"
              )}
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">
              <Lock size={13} />
            </div>
          </div>
        </Field>

        {/* Specialization dropdown */}
        <Field label="Specialization">
          <div className="relative">
            <button
              type="button"
              id="profile-specialization"
              onClick={() => setDropdownOpen((v) => !v)}
              className={cn(
                inputClass,
                "flex items-center justify-between text-left",
                !specialization && "text-slate-600"
              )}
            >
              <span>{specialization || "Select specialization"}</span>
              <ChevronDown
                size={15}
                className={cn(
                  "text-slate-500 transition-transform duration-200",
                  dropdownOpen && "rotate-180"
                )}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-[#141416] border border-white/10 rounded-xl shadow-panel overflow-hidden">
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-500 hover:bg-white/5 transition-colors"
                  onClick={() => {
                    setSpecialization("");
                    setDropdownOpen(false);
                  }}
                >
                  None
                </button>
                {SPECIALIZATION_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setSpecialization(opt);
                      setDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-sm transition-colors",
                      specialization === opt
                        ? "text-cyan-400 bg-cyan-500/10"
                        : "text-slate-300 hover:bg-white/5"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>

        {/* Bio */}
        <Field label="Bio">
          <textarea
            id="profile-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell potential clients about your style and approach…"
            rows={4}
            maxLength={600}
            className={cn(inputClass, "resize-none leading-relaxed")}
          />
          <p className="text-right text-[10px] text-slate-600 -mt-1">
            {bio.length}/600
          </p>
        </Field>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSaving}
            id="profile-save-btn"
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-black",
              "bg-cyan-400 hover:bg-cyan-300 shadow-glow hover:shadow-glow-lg",
              "transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            )}
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              "Save Profile"
            )}
          </button>
        </div>
      </form>

      {/* Toast */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
