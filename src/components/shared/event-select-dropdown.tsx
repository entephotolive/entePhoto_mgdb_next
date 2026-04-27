"use client";

import {
  ChevronDown,
  Search,
  CalendarDays,
  Check
} from "lucide-react";
import { useRef, useState, useEffect, useMemo } from "react";
import { EventListItem } from "@/types";

interface EventSelectDropdownProps {
  events: EventListItem[];
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
}

export function EventSelectDropdown({
  events,
  value,
  onChange,
  isLoading = false
}: EventSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (a.date && b.date) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return 0;
    });
  }, [events]);

  const filteredEvents = sortedEvents.filter((e) =>
    e.title?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedEvent = sortedEvents.find((e) => e.id === value);

  if (isLoading) {
    return (
      <div className="w-full md:w-[320px] h-[58px] animate-pulse bg-white/5 border border-white/10 rounded-2xl" />
    );
  }

  return (
    <div className="relative w-full md:w-[320px]" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 
          bg-[#0A0A0C]/80 backdrop-blur-md border rounded-2xl shadow-sm
          transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50
          ${isOpen 
            ? 'border-cyan-500/50 bg-cyan-500/[0.02]' 
            : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
          }
        `}
      >
        <div className="flex flex-col items-start overflow-hidden text-left w-full">
          {selectedEvent ? (
            <>
              <span className="text-sm font-semibold text-slate-100 truncate w-full">
                {selectedEvent.title}
              </span>
              <span className="text-[11px] text-cyan-400 font-medium tracking-wide truncate w-full mt-0.5">
                {selectedEvent.date ? new Date(selectedEvent.date).toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric', year: 'numeric'
                }) : 'No Date Set'}
              </span>
            </>
          ) : (
            <span className="text-sm font-medium text-slate-400 py-2">
              Select an event...
            </span>
          )}
        </div>
        <div className={`p-1.5 rounded-lg transition-colors ${isOpen ? 'bg-cyan-500/10' : 'bg-white/5'}`}>
          <ChevronDown 
            className={`w-4 h-4 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-cyan-400' : 'text-slate-400'}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 top-[calc(100%+8px)] right-0 w-full md:w-[360px] 
          bg-[#121214]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl 
          overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          
          <div className="p-3 border-b border-white/5 bg-white/[0.02]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search events..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-black/40 border border-white/10 focus:border-cyan-500/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-all ring-0"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto p-2 space-y-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
            {filteredEvents.length === 0 ? (
              <div className="py-8 px-4 text-center flex flex-col items-center gap-2">
                <CalendarDays className="w-8 h-8 text-slate-600 mb-1" />
                <p className="text-sm font-medium text-slate-300">No events found</p>
                <p className="text-xs text-slate-500">Try a different search term</p>
              </div>
            ) : (
              filteredEvents.map((event, index) => {
                const isSelected = event.id === value;
                const isLatest = index === 0 && search === "";

                return (
                  <button
                    key={event.id}
                    onClick={() => {
                      onChange(event.id);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 text-left group
                      ${isSelected 
                        ? 'bg-cyan-500/10 border border-cyan-500/20 shadow-[inset_0_0_20px_rgba(6,182,212,0.05)]' 
                        : 'border border-transparent hover:bg-white/[0.04]'
                      }
                    `}
                  >
                    <div className="flex flex-col gap-1 overflow-hidden pr-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold truncate transition-colors ${isSelected ? 'text-cyan-400' : 'text-slate-200 group-hover:text-white'}`}>
                          {event.title}
                        </span>
                        {isLatest && (
                          <span className="px-1.5 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-[9px] font-bold uppercase tracking-wider shrink-0">
                            New
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <CalendarDays className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-500/50' : ''}`} />
                        <span className="text-[11px] font-medium">
                          {event.date ? new Date(event.date).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric', year: 'numeric'
                          }) : 'Unknown date'}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
