"use client";

import { useCallback, useState, useTransition } from "react";
import {
  MapPin,
  Lock,
  ChevronDown,
  CheckCircle,
  XCircle,
  X,
  Plus,
  Trash2,
  Phone,
  Mail,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AvatarUpload } from "@/components/feature-specific/profile/avatar-upload";
import { SpecializationTags } from "@/components/feature-specific/profile/specialization-tags";
import {
  updateProfile,
  uploadProfileImage,
} from "@/app/photographer/(panel)/profile/action";
import { ProfileData, SPECIALIZATION_OPTIONS } from "@/types";

// ─── Social Media Icons ────────────────────────────────────────────────────────
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastState = {
  type: "success" | "error";
  message: string;
  detail?: string;
} | null;

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  if (!toast) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-panel border text-sm font-medium",
        "animate-in slide-in-from-bottom-4 fade-in duration-300 max-w-xs sm:max-w-sm md:max-w-md",
        toast.type === "success"
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          : "bg-red-500/10 border-red-500/30 text-red-300",
      )}
    >
      <div className="shrink-0 mt-0.5">
        {toast.type === "success" ? (
          <CheckCircle size={16} />
        ) : (
          <XCircle size={16} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="break-words leading-snug">{toast.message}</p>
        {toast.detail && (
          <p className="mt-1 text-[11px] opacity-70 break-words leading-relaxed font-normal">
            {toast.detail}
          </p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="ml-1 opacity-60 hover:opacity-100 transition-opacity shrink-0 mt-0.5"
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
  subtitle,
}: {
  label: string;
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          {label}
        </label>
        {subtitle && (
          <span className="text-[10px] text-slate-500">{subtitle}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Input styles helper ──────────────────────────────────────────────────────
const inputClass = cn(
  "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200",
  "placeholder:text-slate-600 outline-none transition-all duration-200",
  "focus:border-cyan-500/50 focus:shadow-[0_0_0_1px_rgba(34,211,238,0.2)] focus:bg-white/[0.08]",
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
  const [studioLocation, setStudioLocation] = useState(
    initialData.studioLocation ?? "",
  );
  const [specialization, setSpecialization] = useState(
    initialData.specialization ?? "",
  );
  const [specializations, setSpecializations] = useState<string[]>(
    initialData.specializations ?? [],
  );
  const [bio, setBio] = useState(initialData.bio ?? "");

  // Multiple phone numbers state
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>(() => {
    if (initialData.phoneNumbers && initialData.phoneNumbers.length > 0) {
      return initialData.phoneNumbers;
    }
    if (initialData.phoneNumber) {
      return [initialData.phoneNumber];
    }
    return [""];
  });

  // Additional secondary contact emails state
  const [emails, setEmails] = useState<string[]>(
    initialData.emails ?? [],
  );

  // Social media link states
  const [instagramUrl, setInstagramUrl] = useState(
    initialData.instagramUrl ?? "",
  );
  const [facebookUrl, setFacebookUrl] = useState(
    initialData.facebookUrl ?? "",
  );

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

  const showToast = useCallback(
    (type: "success" | "error", message: string, detail?: string) => {
      setToast({ type, message, detail });
      // Errors stay longer so the user has time to read them
      const duration = type === "error" ? 8000 : 5000;
      setTimeout(() => setToast(null), duration);
    },
    [],
  );

  // Called when user picks a new avatar file
  function handleAvatarSelected(file: File, preview: string) {
    setPendingAvatarFile(file);
    setLocalAvatarPreview(preview);
  }

  // ── Phone Numbers Helpers ──
  function handleAddPhoneNumber() {
    setPhoneNumbers((prev) => [...prev, ""]);
  }

  function handleUpdatePhoneNumber(index: number, val: string) {
    const cleaned = val.replace(/\D/g, "").slice(0, 10);
    setPhoneNumbers((prev) =>
      prev.map((item, i) => (i === index ? cleaned : item)),
    );
  }

  function handleRemovePhoneNumber(index: number) {
    setPhoneNumbers((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Secondary Emails Helpers ──
  function handleAddEmail() {
    setEmails((prev) => [...prev, ""]);
  }

  function handleUpdateEmail(index: number, val: string) {
    setEmails((prev) => prev.map((item, i) => (i === index ? val : item)));
  }

  function handleRemoveEmail(index: number) {
    setEmails((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validations
    const cleanPhones = phoneNumbers
      .map((p) => p.trim())
      .filter(Boolean);

    for (const phone of cleanPhones) {
      if (!/^\d{10}$/.test(phone)) {
        showToast(
          "error",
          `Invalid phone number format: "${phone}". Each phone number must be exactly 10 digits.`,
        );
        return;
      }
    }

    const cleanEmails = emails.map((e) => e.trim()).filter(Boolean);
    for (const em of cleanEmails) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        showToast("error", `Invalid secondary email format: "${em}"`);
        return;
      }
    }

    const cleanInsta = instagramUrl.trim();
    if (cleanInsta && !cleanInsta.startsWith("https://")) {
      showToast("error", "Instagram link must begin with https://");
      return;
    }

    const cleanFb = facebookUrl.trim();
    if (cleanFb && !cleanFb.startsWith("https://")) {
      showToast("error", "Facebook link must begin with https://");
      return;
    }

    startTransition(async () => {
      try {
        let finalAvatarUrl = avatarUrl;

        // ── Step 1: Upload avatar if one was selected ──
        if (pendingAvatarFile) {
          setAvatarUploading(true);
          const fd = new FormData();
          fd.append("file", pendingAvatarFile);
          const uploadResult = await uploadProfileImage(fd);
          setAvatarUploading(false);

          if (!uploadResult.ok) {
            showToast(
              "error",
              "Avatar upload failed.",
              "error" in uploadResult ? uploadResult.error : undefined,
            );
            return;
          }

          finalAvatarUrl = uploadResult.data.url;
          setAvatarUrl(finalAvatarUrl);
          setLocalAvatarPreview("");
          setPendingAvatarFile(null);
        }

        // ── Step 2: Save profile data ──
        const primaryPhone = cleanPhones[0] ?? "";

        const result = await updateProfile(userId, {
          name,
          studioName,
          studioLocation,
          specialization,
          specializations,
          bio,
          avatarUrl: finalAvatarUrl,
          phoneNumber: primaryPhone,
          phoneNumbers: cleanPhones,
          emails: cleanEmails,
          instagramUrl: cleanInsta,
          facebookUrl: cleanFb,
        });

        if (result.ok) {
          showToast("success", "Profile updated successfully!");
        } else {
          // result.error is the specific message from the server action
          showToast(
            "error",
            "Could not save your profile.",
            "error" in result ? result.error : undefined,
          );
        }

      } catch (unexpectedErr) {
        // Network failure, chunk error, or any uncaught exception
        setAvatarUploading(false);
        console.error("[ProfileForm] Unexpected error during save:", unexpectedErr);
        showToast(
          "error",
          "Something went wrong.",
          unexpectedErr instanceof Error
            ? unexpectedErr.message
            : "An unexpected error occurred. Please try again.",
        );
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
    setPhoneNumbers(
      initialData.phoneNumbers && initialData.phoneNumbers.length > 0
        ? initialData.phoneNumbers
        : initialData.phoneNumber
        ? [initialData.phoneNumber]
        : [""],
    );
    setEmails(initialData.emails ?? []);
    setInstagramUrl(initialData.instagramUrl ?? "");
    setFacebookUrl(initialData.facebookUrl ?? "");
    setAvatarUrl(initialData.avatarUrl ?? "");
    setLocalAvatarPreview("");
    setPendingAvatarFile(null);
  }

  const isSaving = isPending || avatarUploading;

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm p-4 sm:p-6 flex flex-col gap-6 w-full"
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

        {/* Basic Info Group: Full Name & Studio Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <Field label="Full Name">
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className={inputClass}
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
        </div>

        {/* Contact Numbers (Multiple) */}
        <Field
          label="Phone Numbers"
          subtitle="Add primary and secondary contact numbers (optional)"
        >
          <div className="flex flex-col gap-2.5">
            {phoneNumbers.map((phone, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Phone
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                  />
                  <input
                    id={`profile-phone-${idx}`}
                    type="tel"
                    value={phone}
                    onChange={(e) =>
                      handleUpdatePhoneNumber(idx, e.target.value)
                    }
                    placeholder={
                      idx === 0
                        ? "Primary 10-digit phone number (optional)"
                        : `Secondary phone number #${idx + 1}`
                    }
                    maxLength={10}
                    className={cn(inputClass, "pl-9")}
                  />
                </div>
                {phoneNumbers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhoneNumber(idx)}
                    className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all shrink-0"
                    title="Remove phone number"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddPhoneNumber}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-400 text-xs font-medium transition-colors w-full sm:w-auto self-start mt-0.5"
            >
              <Plus size={14} />
              <span>Add Phone Number</span>
            </button>
          </div>
        </Field>

        {/* Email Addresses (Multiple) */}
        <Field
          label="Email Addresses"
          subtitle="Primary account email & secondary contacts (optional)"
        >
          <div className="flex flex-col gap-2.5">
            {/* Account Primary Email — Locked */}
            <div className="relative">
              <Mail
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              />
              <input
                id="profile-email-primary"
                type="email"
                value={initialData.email}
                readOnly
                title="Primary account login email (cannot be changed)"
                className={cn(
                  inputClass,
                  "pl-9 pr-24 cursor-not-allowed opacity-60 select-none",
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md text-[10px] text-slate-300 uppercase tracking-wider font-semibold pointer-events-none">
                <Lock size={10} />
                <span>Primary</span>
              </div>
            </div>

            {/* Secondary Contact Emails */}
            {emails.map((em, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Mail
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                  />
                  <input
                    id={`profile-email-secondary-${idx}`}
                    type="email"
                    value={em}
                    onChange={(e) => handleUpdateEmail(idx, e.target.value)}
                    placeholder={`Secondary contact email #${idx + 1}`}
                    className={cn(inputClass, "pl-9")}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveEmail(idx)}
                  className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all shrink-0"
                  title="Remove secondary email"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddEmail}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-400 text-xs font-medium transition-colors w-full sm:w-auto self-start mt-0.5"
            >
              <Plus size={14} />
              <span>Add Secondary Email</span>
            </button>
          </div>
        </Field>

        {/* Social Media Links Section: Instagram & Facebook */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Instagram Link */}
          <Field
            label="Instagram Profile Link"
            subtitle="HTTPS only (optional, e.g. https://instagram.com/...)"
          >
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-400 pointer-events-none">
                <InstagramIcon />
              </div>
              <input
                id="profile-instagram-url"
                type="url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/yourhandle"
                className={cn(inputClass, "pl-9")}
              />
            </div>
          </Field>

          {/* Facebook Link */}
          <Field
            label="Facebook Profile Link"
            subtitle="HTTPS only (optional, e.g. https://facebook.com/...)"
          >
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none">
                <FacebookIcon />
              </div>
              <input
                id="profile-facebook-url"
                type="url"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/yourhandle"
                className={cn(inputClass, "pl-9")}
              />
            </div>
          </Field>
        </div>

        {/* Studio Location */}
        <Field label="Studio Location (Google Maps Link)">
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
              placeholder="https://maps.app.goo.gl/... (optional)"
              className={cn(inputClass, "pl-9")}
            />
          </div>
        </Field>

        {/* Studio Specializations Tags */}
        <Field label="Studio Specializations">
          <SpecializationTags
            value={specializations}
            onChange={setSpecializations}
          />
        </Field>

        {/* Specialization dropdown */}
        <Field label="Primary Specialization">
          <div className="relative">
            <button
              type="button"
              id="profile-specialization"
              onClick={() => setDropdownOpen((v) => !v)}
              className={cn(
                inputClass,
                "flex items-center justify-between text-left",
                !specialization && "text-slate-600",
              )}
            >
              <span>{specialization || "Select primary specialization"}</span>
              <ChevronDown
                size={15}
                className={cn(
                  "text-slate-500 transition-transform duration-200",
                  dropdownOpen && "rotate-180",
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
                        : "text-slate-300 hover:bg-white/5",
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="w-full sm:w-auto text-sm text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40 py-2 sm:py-0 text-center"
          >
            Cancel Changes
          </button>

          <button
            type="submit"
            disabled={isSaving}
            id="profile-save-btn"
            className={cn(
              "w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-black",
              "bg-cyan-400 hover:bg-cyan-300 shadow-glow hover:shadow-glow-lg",
              "transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed",
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
