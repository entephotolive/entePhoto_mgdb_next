"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import type { ProfileData, PortfolioMoment } from "@/types";

// ── Icons (inline SVGs — no extra dep) ──────────────────────────────────────
function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.67-1.616-.917-2.208-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.461c-1.852 0-3.664-.497-5.257-1.442l-.377-.225-3.906 1.024 1.042-3.808-.248-.394c-1.038-1.652-1.587-3.57-1.587-5.541 0-5.748 4.677-10.425 10.427-10.425 2.784 0 5.4 1.084 7.364 2.85 1.966 1.965 5.088 3.048 7.365 3.048 5.749 0 10.426-4.678 10.426-10.426 0z" />
    </svg>
  );
}

function PhoneIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function MailIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function MapPinIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ExternalLinkIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
interface StudioViewProps {
  profile: ProfileData;
  portfolio: PortfolioMoment[];
}

export function StudioView({ profile, portfolio }: StudioViewProps) {
  const [api, setApi] = useState<any>(null);

  useEffect(() => {
    if (!api) return;
    const interval = setInterval(() => api.scrollNext(), 2500);
    return () => clearInterval(interval);
  }, [api]);

  const studioName = profile.studioName || profile.name || "Photography Studio";
  const bio =
    profile.bio ||
    "Specializing in capturing your most precious moments with artistry and passion.";

  // ── Derived contact data ──────────────────────────────────────────
  // Show all phoneNumbers; fall back to single phoneNumber if array is absent
  const phones: string[] =
    profile.phoneNumbers && profile.phoneNumbers.length > 0
      ? profile.phoneNumbers.filter(Boolean)
      : profile.phoneNumber
      ? [profile.phoneNumber]
      : [];

  // Secondary emails only — never expose the primary login email
  const secondaryEmails: string[] = (profile.emails ?? []).filter(Boolean);

  const hasInsta = !!profile.instagramUrl;
  const hasFb = !!profile.facebookUrl;
  const hasLocation = !!profile.studioLocation;

  return (
    <Layout>
      <Navbar />

      {/* ── Hero section ──────────────────────────────────────────── */}
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 pt-28 md:grid-cols-2">

        {/* Left column — info */}
        <div>
          <Badge className="h-5 border-cyan-400/20 bg-cyan-400/10 px-2 py-0 text-[10px] tracking-widest text-cyan-400 uppercase">
            PREMIUM STUDIO
          </Badge>

          {/* Avatar + name row */}
          <div className="mt-5 flex items-center gap-4">
            {profile.avatarUrl ? (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 ring-cyan-400/40 ring-offset-2 ring-offset-black">
                <Image
                  src={profile.avatarUrl}
                  alt={studioName}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            ) : null}

            <div>
              <h1 className="text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
                {studioName}
              </h1>
              {profile.studioName && profile.name && (
                <p className="mt-0.5 text-sm text-white/50">by {profile.name}</p>
              )}
            </div>
          </div>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
            {bio}
          </p>

          {/* Specializations */}
          {profile.specializations && profile.specializations.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              {profile.specializations.map((spec, idx) => (
                <Card
                  key={idx}
                  className="h-auto w-auto min-w-[7rem] border-white/10 bg-white/5"
                >
                  <CardHeader className="gap-0 p-3">
                    <CardTitle className="text-xs font-semibold text-white">
                      {spec}
                    </CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}

          

          {/* ── Contact details panel ─────────────────────────────── */}
          {(phones.length > 0 || secondaryEmails.length > 0) && (
            <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 space-y-3">
              <p className="text-[10px] font-semibold tracking-widest text-white/40 uppercase mb-1">
                Contact Info
              </p>

              {/* Phone numbers */}
              {phones.map((ph, i) => (
                <a
                  key={i}
                  href={`tel:${ph}`}
                  className="flex items-center gap-2.5 text-sm text-white/80 hover:text-cyan-400 transition-colors group"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-400 group-hover:bg-cyan-400/20 transition-colors shrink-0">
                    <PhoneIcon />
                  </span>
                  <span className="font-medium">{ph}</span>
                </a>
              ))}

              {/* Secondary emails */}
              {secondaryEmails.map((em, i) => (
                <a
                  key={i}
                  href={`mailto:${em}`}
                  className="flex items-center gap-2.5 text-sm text-white/80 hover:text-cyan-400 transition-colors group"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-400/10 text-purple-400 group-hover:bg-purple-400/20 transition-colors shrink-0">
                    <MailIcon />
                  </span>
                  <span className="font-medium">{em}</span>
                </a>
              ))}
            </div>
          )}

          {/* ── Social + action buttons ───────────────────────────── */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {/* Instagram */}
            {hasInsta && (
              <a
                href={profile.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 inline-flex items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 transition-all duration-300 hover:scale-105 hover:brightness-110 hover:shadow-[0_0_20px_rgba(236,72,153,0.4)]"
              >
                <InstagramIcon />
                <span>Instagram</span>
                <ExternalLinkIcon />
              </a>
            )}

            {/* Facebook */}
            {hasFb && (
              <a
                href={profile.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 inline-flex items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white bg-[#1877F2] hover:bg-[#1565C0] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(24,119,242,0.4)]"
              >
                <FacebookIcon />
                <span>Facebook</span>
                <ExternalLinkIcon />
              </a>
            )}

            {/* Visit location button */}
            {hasLocation && (
              <button
                onClick={() => {
                  const loc = profile.studioLocation;
                  if (loc.startsWith("http")) {
                    window.open(loc, "_blank");
                  } else {
                    window.open(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`,
                      "_blank"
                    );
                  }
                }}
                className="h-11 inline-flex items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-black bg-gradient-to-r from-cyan-400 to-purple-400 transition-all duration-300 hover:scale-105 hover:brightness-110 hover:shadow-[0_0_20px_rgba(34,211,238,0.5)]"
              >
                <MapPinIcon />
                <span>Visit our location</span>
              </button>
            )}

            {/* Book Consultation (WhatsApp) */}
            {phones.length > 0 && (() => {
              const rawPhone = phones[0].replace(/\D/g, "");
              const waPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
              const waMsg = encodeURIComponent(`Hello, I would like to book a consultation with ${studioName}.`);
              return (
                <a
                  href={`https://wa.me/${waPhone}?text=${waMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 inline-flex items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-black bg-emerald-400 hover:bg-emerald-300 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                >
                  <WhatsAppIcon />
                  <span>Book Consultation</span>
                  <ExternalLinkIcon />
                </a>
              );
            })()}
          </div>
          {/* Stats section */}
          <div className="mt-8 flex gap-8">
            <div>
              <h3 className="text-lg font-semibold">500+</h3>
              <p className="text-xs text-white/60">Ceremonies</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-pink-400">1M+</h3>
              <p className="text-xs text-white/60">Memories Captured</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold">100%</h3>
              <p className="text-xs text-white/60">Elite Rating</p>
            </div>
          </div>
        </div>

        {/* Right column — portfolio carousel */}
        <div className="relative">
          {portfolio.length > 0 ? (
            <Carousel setApi={setApi} opts={{ loop: true }} className="w-full">
              <CarouselContent>
                {portfolio.map((moment) => (
                  <CarouselItem key={moment.id}>
                    <div className="relative mx-1 overflow-hidden rounded-3xl shadow-2xl">
                      <img
                        src={moment.url}
                        className="h-[500px] w-full object-cover"
                        alt={moment.caption || "Studio Work"}
                      />
                      <div className="absolute bottom-6 left-6 rounded-full border border-white/20 bg-black/50 px-4 py-2 text-sm backdrop-blur-xl">
                        <p className="font-medium text-white">
                          {moment.caption || studioName}
                        </p>
                        <span className="text-xs text-cyan-400">
                          {profile.specialization || "Signature Collection"}
                        </span>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          ) : (
            <div className="flex h-[500px] w-full items-center justify-center rounded-3xl border border-white/10 bg-white/5">
              <p className="text-white/40">No portfolio moments yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom spacing */}
      <div className="pb-16" />
    </Layout>
  );
}
