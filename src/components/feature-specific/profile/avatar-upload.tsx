"use client";

import { useRef } from "react";
import { Camera } from "lucide-react";
import Image from "next/image";

interface AvatarUploadProps {
  currentUrl?: string;
  previewUrl?: string;
  name: string;
  onFileSelected: (file: File, localPreview: string) => void;
  uploading?: boolean;
}

export function AvatarUpload({
  currentUrl,
  previewUrl,
  name,
  onFileSelected,
  uploading = false,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayUrl = previewUrl || currentUrl;
  const initial = name ? name.charAt(0).toUpperCase() : "?";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const localUrl = ev.target?.result as string;
      onFileSelected(file, localUrl);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar ring */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative w-24 h-24 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        aria-label="Change profile photo"
      >
        {/* Glowing ring */}
        <span className="absolute inset-0 rounded-full border-2 border-cyan-500/60 group-hover:border-cyan-400 group-hover:shadow-glow transition-all duration-300" />

        {/* Avatar image or initial */}
        {displayUrl ? (
          <div className="w-full h-full rounded-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt={name}
              className="w-full h-full object-cover transition-opacity duration-300"
            />
          </div>
        ) : (
          <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-3xl font-bold text-cyan-400">
            {initial}
          </div>
        )}

        {/* Overlay on hover */}
        <span className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
          {uploading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Camera size={20} className="text-white" />
          )}
        </span>

        {/* Camera badge */}
        {!uploading && (
          <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-cyan-500 border-2 border-background flex items-center justify-center">
            <Camera size={12} className="text-black" />
          </span>
        )}
      </button>

      <span className="text-xs text-cyan-400 font-medium tracking-wide cursor-pointer hover:text-cyan-300 transition-colors" onClick={() => inputRef.current?.click()}>
        Change Photo
      </span>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
