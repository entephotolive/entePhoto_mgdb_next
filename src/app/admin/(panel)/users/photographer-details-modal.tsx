"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Camera, 
  Calendar, 
  MapPin, 
  Loader2, 
  Mail,
  Briefcase,
  History,
  User as UserIcon,
  Phone
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPhotographerFullDetails } from "./actions";

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

interface PhotographerDetailsModalProps {
  user: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PhotographerDetailsModal({
  user,
  isOpen,
  onClose,
}: PhotographerDetailsModalProps) {
  const [data, setData] = useState<{ events: Event[]; profile: Profile } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user?._id) {
      setIsLoading(true);
      getPhotographerFullDetails(user._id)
        .then(setData)
        .catch((err) => console.error("Failed to fetch details", err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, user?._id]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl border-white/5 bg-[#081b24] text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
             <Avatar className="h-10 w-10 border border-white/10">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback>{user?.name?.charAt(0) || "P"}</AvatarFallback>
             </Avatar>
             Full Photographer Profile
          </DialogTitle>
          <DialogDescription className="text-slate-400">
             Complete history and information for {user?.name}.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
        ) : data ? (
          <div className="grid gap-6 py-4 md:grid-cols-5">
            {/* Left Column: Profile Info */}
            <div className="md:col-span-2 space-y-6">
              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Studio Information
                </h3>
                <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-3">
                   <div>
                      <p className="text-xs text-slate-500">Studio Name</p>
                      <p className="font-medium text-cyan-400">{data.profile.studioName || "Not specified"}</p>
                   </div>
                   <div>
                      <p className="text-xs text-slate-500">Location</p>
                      <div className="flex items-center gap-1.5 font-medium">
                         <MapPin className="h-3.5 w-3.5 text-slate-400" />
                         {data.profile.studioLocation || "Remote / Unspecified"}
                      </div>
                   </div>
                   {user?.phoneNumber && (
                     <div>
                        <p className="text-xs text-slate-500">Contact</p>
                        <div className="flex items-center gap-1.5 font-medium">
                           <Phone className="h-3.5 w-3.5 text-slate-400" />
                           {user.phoneNumber}
                        </div>
                     </div>
                   )}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  About & Specializations
                </h3>
                <div className="space-y-3">
                  <p className="text-sm text-slate-300 leading-relaxed italic">
                     "{data.profile.bio || "No bio provided."}"
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {data.profile.specializations.map((spec) => (
                      <Badge key={spec} variant="secondary" className="bg-white/5 border-white/10 text-slate-400">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                 <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail className="h-3 w-3" />
                    {user?.email}
                 </div>
                 <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="h-3 w-3" />
                    Joined {data.profile.joinedAt ? new Date(data.profile.joinedAt).toLocaleDateString() : "Unknown"}
                 </div>
              </section>
            </div>

            {/* Right Column: Event History */}
            <div className="md:col-span-3 space-y-4">
               <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Complete Event History
               </h3>
               
               <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                  {data.events.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-slate-500">
                       No events found.
                    </div>
                  ) : (
                    data.events.map((event) => (
                      <Card key={event._id} variant="glass" className="p-4 border-white/5 bg-white/[0.02] hover:bg-white/5 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="font-bold text-white leading-tight">{event.title}</h4>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(event.date).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                             <div className="text-lg font-bold text-emerald-400">{event.photoCount}</div>
                             <div className="text-[10px] uppercase tracking-tighter text-slate-500">Photos</div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
               </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
