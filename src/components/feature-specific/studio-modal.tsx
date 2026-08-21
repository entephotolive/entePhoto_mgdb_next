"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, ChevronDown, MapPin, Phone, MessageCircle, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProfileData } from "@/types";

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

interface StudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ProfileData | null;
  eventId: string;
}

export function StudioModal({ isOpen, onClose, profile, eventId }: StudioModalProps) {
  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const studioName = profile?.studioName || profile?.name || "Grand Events";
  const specialization = profile?.specialization || "Wedding Company";
  
  // Specializations dot-separated list
  const specList =
    profile?.specializations && profile.specializations.length > 0
      ? profile.specializations.join(" • ")
      : "Wedding • Corporate • Events • Fashion • Interior";

  // Contact phones
  const phones =
    profile?.phoneNumbers && profile.phoneNumbers.length > 0
      ? profile.phoneNumbers.filter(Boolean)
      : profile?.phoneNumber
      ? [profile.phoneNumber]
      : ["", ""];

  const location = profile?.studioLocation || "Kerala, India";

  // Extract instagram handle or display text
  let instaHandle = "@grand_events_";
  let instaFullUrl = "instagram.com/grandevents_production";
  if (profile?.instagramUrl) {
    try {
      const cleanUrl = profile.instagramUrl.replace(/^https?:\/\/(www\.)?/, "");
      const parts = cleanUrl.split("/").filter(Boolean);
      if (parts.length > 1) {
        instaHandle = `@${parts[1]}`;
      } else if (parts.length === 1) {
        instaHandle = `@${parts[0]}`;
      }
      instaFullUrl = cleanUrl;
    } catch {
      instaFullUrl = profile.instagramUrl;
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
        {/* Backdrop Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Bottom Sheet / Modal Container */}
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#0c0d1b] p-6 shadow-2xl backdrop-blur-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Grabber handle bar */}
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-all hover:bg-white/20 hover:text-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* ── Studio Header Row ── */}
          <div className="flex items-center gap-4 pt-1">
            {/* Avatar / Logo with glowing purple ring */}
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full p-1 bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-pink-500 shadow-[0_0_25px_rgba(168,85,247,0.5)]">
              <div className="relative h-full w-full overflow-hidden rounded-full bg-black">
                {profile?.avatarUrl ? (
                  <Image
                    src={profile.avatarUrl}
                    alt={studioName}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-900 to-black font-bold text-white text-xl">
                    {studioName.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Studio info text */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                {studioName}
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 font-medium mt-0.5 truncate">
                {specialization}
              </p>
              <p className="text-[11px] sm:text-xs text-gray-400 mt-1.5 font-normal leading-relaxed break-words">
                {specList}
              </p>
            </div>
          </div>

          {/* Thin Divider */}
          <div className="my-5 h-px w-full bg-white/10" />

          {/* ── Contact Details List ── */}
          <div className="space-y-3.5 text-xs sm:text-sm">
            {/* Location */}
            {location && (
              <div className="flex items-center gap-3.5 text-gray-200">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">
                  <MapPin size={16} />
                </span>
                <span className="truncate">{location}</span>
              </div>
            )}

            {/* Phone 1 */}
            {phones[0] && (
              <a
                href={`tel:${phones[0]}`}
                className="flex items-center gap-3.5 text-gray-200 hover:text-cyan-300 transition-colors"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">
                  <Phone size={16} />
                </span>
                <span>{phones[0]}</span>
              </a>
            )}

            {/* Phone 2 / WhatsApp */}
            {phones[1] && (
              <a
                href={`https://wa.me/${phones[1].replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 text-gray-200 hover:text-emerald-300 transition-colors"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">
                  <MessageCircle size={16} />
                </span>
                <span>{phones[1]}</span>
              </a>
            )}

            {/* Instagram Handle */}
            {profile?.instagramUrl && (
              <a
                href={profile.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 text-gray-200 hover:text-pink-300 transition-colors"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">
                  <InstagramIcon size={16} />
                </span>
                <span className="truncate">{instaHandle}</span>
              </a>
            )}

            {/* Instagram Full URL / Link */}
            {profile?.instagramUrl && (
              <a
                href={profile.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 text-gray-200 hover:text-cyan-300 transition-colors"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">
                  <Link2 size={16} />
                </span>
                <span className="truncate">{instaFullUrl}</span>
              </a>
            )}
          </div>

          {/* Thin Divider */}
          <div className="my-5 h-px w-full bg-white/10" />

          {/* ── Show More Button ── */}
          <Link
            href={`/event/${eventId}/studio`}
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/50 bg-cyan-400/5 py-3.5 text-sm font-semibold text-cyan-300 shadow-glow transition-all hover:bg-cyan-400/15 hover:border-cyan-400 hover:text-white"
          >
            <span>Show More</span>
            <ChevronDown size={18} />
          </Link>

          {/* ── Footer ── */}
          <p className="mt-4 text-center text-xs font-medium text-cyan-400/80">
            Powered by <span className="font-semibold text-cyan-400">EntePhoto</span>
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
