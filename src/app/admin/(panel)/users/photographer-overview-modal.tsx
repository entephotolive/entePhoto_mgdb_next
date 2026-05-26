"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Calendar,
  ChevronRight,
  Loader2,
  MapPin,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPhotographerOverview } from "./actions";

interface Event {
  _id: string;
  title: string;
  date: string;
  photoCount: number;
  location: string;
}

interface Stats {
  totalPhotos: number;
  totalEvents: number;
  latestEvents: Event[];
}

interface PhotographerOverviewModalProps {
  user: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PhotographerOverviewModal({
  user,
  isOpen,
  onClose,
}: PhotographerOverviewModalProps) {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user?._id) {
      setIsLoading(true);
      setStats(null);
      getPhotographerOverview(user._id)
        .then(setStats)
        .catch((err) => console.error("Failed to fetch overview", err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, user?._id]);

  function goToDetails() {
    onClose();
    router.push(`/admin/users/${user._id}`);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md border-white/5 bg-[#081b24] text-white">
        <DialogHeader>
          {/* User header */}
          <div className="flex items-center gap-3 mb-1">
            <Avatar className="h-10 w-10 border border-white/10">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="bg-emerald-500/10 text-emerald-400 font-bold">
                {user?.name?.charAt(0) || "P"}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-lg font-bold leading-tight">
                {user?.name || "Photographer"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                {user?.email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-52 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
        ) : stats ? (
          <div className="space-y-5 mt-2">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 text-center">
                <Camera className="mx-auto mb-1.5 h-5 w-5 text-cyan-400" />
                <p className="text-2xl font-bold">{stats.totalPhotos.toLocaleString()}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
                  Total Photos
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 text-center">
                <Calendar className="mx-auto mb-1.5 h-5 w-5 text-emerald-400" />
                <p className="text-2xl font-bold">{stats.totalEvents.toLocaleString()}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
                  Total Events
                </p>
              </div>
            </div>

            {/* Recent Events */}
            <div>
              <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                Recent Events
              </h3>
              <div className="space-y-2">
                {stats.latestEvents.length === 0 ? (
                  <p className="py-4 text-center text-sm italic text-slate-600">
                    No events yet.
                  </p>
                ) : (
                  stats.latestEvents.map((event) => (
                    <div
                      key={event._id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{event.title}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                          <span>{new Date(event.date).toLocaleDateString()}</span>
                          <span className="h-1 w-1 rounded-full bg-slate-700" />
                          <span className="flex items-center gap-0.5 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className="shrink-0 bg-white/5 font-mono text-slate-400"
                      >
                        {event.photoCount}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* CTA */}
            <Button
              onClick={goToDetails}
              className="w-full gap-2 rounded-xl bg-emerald-500 py-5 font-semibold text-black hover:bg-emerald-400"
            >
              <ExternalLink className="h-4 w-4" />
              View Full Profile & History
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="py-10 text-center text-slate-500">
            No statistics available.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
