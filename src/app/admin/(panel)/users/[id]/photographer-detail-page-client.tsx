"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Camera,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  CheckCircle2,
  XCircle,
  ImageIcon,
  Globe2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { updateUserApproval } from "../actions";

interface Event {
  _id: string;
  title: string;
  date: string;
  photoCount: number;
  location: string;
}

interface Profile {
  bio: string;
  studioName: string;
  studioLocation: string;
  specializations: string[];
  joinedAt: string | null;
}

interface PhotographerDetailPageClientProps {
  user: {
    _id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    phoneNumber: string | null;
    isApproved: boolean;
    createdAt: string | null;
  };
  profile: Profile;
  events: Event[];
  totalPhotos: number;
}

export function PhotographerDetailPageClient({
  user,
  profile,
  events,
  totalPhotos,
}: PhotographerDetailPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isApproved, setIsApproved] = useState(user.isApproved);

  function handleApproval(approve: boolean) {
    startTransition(async () => {
      await updateUserApproval(user._id, approve);
      setIsApproved(approve);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8 pb-10">
      {/* ── Back + Header ──────────────────────────────────────────────── */}
      <div>
        <Link
          href="/admin/users"
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Photographers
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white/10 text-2xl">
              <AvatarImage src={user.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-emerald-500/10 text-emerald-400 text-xl font-bold">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {user.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                </span>
                {user.createdAt && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status + action */}
          <div className="flex items-center gap-3">
            <Badge
              variant="secondary"
              className={
                isApproved
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                  : "border-amber-400/20 bg-amber-400/10 text-amber-400"
              }
            >
              {isApproved ? "Approved" : "Pending"}
            </Badge>

            {!isApproved ? (
              <button
                onClick={() => handleApproval(true)}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </button>
            ) : (
              <button
                onClick={() => handleApproval(false)}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-400 transition hover:bg-rose-500/20 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Revoke Access
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total Photos",
            value: totalPhotos,
            icon: Camera,
            color: "text-cyan-400",
            bg: "bg-cyan-500/10",
          },
          {
            label: "Total Events",
            value: events.length,
            icon: Calendar,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Avg Photos / Event",
            value:
              events.length > 0
                ? Math.round(totalPhotos / events.length)
                : 0,
            icon: ImageIcon,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card
            key={label}
            variant="glass"
            className="flex flex-col items-center justify-center gap-2 border-white/5 bg-[#081b24]/50 p-6 text-center"
          >
            <div className={`rounded-xl p-3 ${bg}`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {label}
            </p>
          </Card>
        ))}
      </div>

      {/* ── Two-column grid ──────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Profile Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Studio Card */}
          <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-6 space-y-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
              <Briefcase className="h-4 w-4" />
              Studio Details
            </h2>

            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs text-slate-500">Studio Name</p>
                <p className="font-semibold text-cyan-400">
                  {profile.studioName || "—"}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-slate-500">Location</p>
                <div className="flex items-center gap-1.5 font-medium">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {profile.studioLocation || "Remote / Unspecified"}
                </div>
              </div>
              {user.phoneNumber && (
                <div>
                  <p className="mb-1 text-xs text-slate-500">Phone</p>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {user.phoneNumber}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Bio Card */}
          {(profile.bio || profile.specializations.length > 0) && (
            <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-6 space-y-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                <Globe2 className="h-4 w-4" />
                About
              </h2>
              {profile.bio && (
                <p className="text-sm leading-relaxed text-slate-300">
                  {profile.bio}
                </p>
              )}
              {profile.specializations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {profile.specializations.map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="border-white/10 bg-white/5 text-slate-400"
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right: Event History */}
        <div className="lg:col-span-3">
          <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-6">
            <h2 className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
              <Calendar className="h-4 w-4" />
              Event History ({events.length})
            </h2>

            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 py-16 text-center text-slate-500">
                <Calendar className="h-8 w-8 opacity-40" />
                <p>No events created yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event, i) => (
                  <div
                    key={event._id}
                    className="group flex items-start justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.05]"
                  >
                    {/* Index + details */}
                    <div className="flex items-start gap-3 overflow-hidden">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-bold text-slate-500">
                        {i + 1}
                      </span>
                      <div className="overflow-hidden">
                        <p className="truncate font-semibold text-white">
                          {event.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(event.date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="max-w-[160px] truncate">
                              {event.location}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Photo count */}
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold text-emerald-400">
                        {event.photoCount.toLocaleString()}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-slate-600">
                        Photos
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
