"use client";

import { Calendar, Filter, FolderPlus, ChevronDown, Smile, User, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { EventListItem } from "@/types";
import { useState } from "react";
import { FiSmile } from "react-icons/fi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createNewFolder } from "@/app/admin/(dashboard)/gallery/action";
import { EventSelectDropdown } from "@/components/shared/event-select-dropdown";

interface GalleryControlsProps {
  events: EventListItem[];
  selectedEventId?: string;
}

export function GalleryControls({ events, selectedEventId }: GalleryControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isFaceFilterEnabled] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const activeEvent = events.find((e) => e.id === selectedEventId) || events[0];
  const currentEventId = selectedEventId || events[0]?.id;

  const handleEventChange = (eventId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("eventId", eventId);
    router.push(`?${params.toString()}`);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim() || !currentEventId) return;

    setIsSubmitting(true);
    setErrorMsg("");

    const result = await createNewFolder(folderName, currentEventId);

    if (result.ok) {
      setIsModalOpen(false);
      setFolderName("");
    } else {
      setErrorMsg(result.error || "Failed to create folder");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-6">
      {/* Left Side: Breadcrumbs / Event Selection */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center h-[58px] px-4 py-2.5 bg-[#0A0A0C]/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              EVENTS
            </div>
           
            
          </div>
          <span className="text-slate-700 font-light text-3xl">/</span>
        </div>
        <EventSelectDropdown
          events={events}
          value={currentEventId}
          onChange={handleEventChange}
        />
      </div>

      {/* Right Side: Controls */}
      <div className="flex items-center gap-3">
        {/* Face Filter Toggle (Static Visual) */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
          <FiSmile size={16} className="text-sky-400" />
          <span className="text-xs font-semibold text-slate-300">Filter by Face</span>
          <button
            type="button"
            aria-label="Filter by Face (static)"
            disabled
            className={`relative w-8 h-4 cursor-not-allowed rounded-full opacity-80 transition-colors ${isFaceFilterEnabled ? 'bg-sky-400' : 'bg-slate-600'}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isFaceFilterEnabled ? 'translate-x-4' : ''}`} />
          </button>
        </div>

        {/* New Folder Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-[14px] text-xs font-semibold text-slate-300 hover:bg-white/10 transition-all">
              <FolderPlus size={14} />
              <span>New Folder</span>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-[#0a0a0b] border-white/10 text-white">
            <form onSubmit={handleCreateFolder}>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Add a new folder to organize photos for {activeEvent?.title}.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-6">
                <div className="grid gap-2">
                  <Input
                    id="name"
                    placeholder="e.g., Reception, Ceremony"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white focus-visible:ring-sky-500"
                    autoFocus
                    disabled={isSubmitting}
                  />
                  {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
                </div>
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  className="bg-transparent border-white/10 hover:bg-white/5 hover:text-white"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={!folderName.trim() || isSubmitting}
                  className="bg-sky-500 hover:bg-sky-600 text-white border-0"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Create Folder
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
