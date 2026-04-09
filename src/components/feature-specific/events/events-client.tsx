"use client";

import { useRef, useState } from "react";
import { Plus, CalendarDays, MapPin, User2, Clock, Search, LayoutGrid, List, Trash2, Loader2, ChevronRight, X, Camera, Copy, Check, Download, ExternalLink } from "lucide-react";
import QRCode from "react-qr-code";
import { cn } from "@/lib/utils/cn";
import { EventListItem } from "@/types";
import { EventModal } from "./event-modal";
import { deleteEventAction } from "@/app/admin/(dashboard)/events/event.actions";

interface EventsClientProps {
  events: EventListItem[];
  isAdmin: boolean;
  userId: string;
}

type FilterTab = "all" | "active" | "completed" | "draft";

const STATUS_META: Record<string, { label: string; dot: string; badge: string }> = {
  active: {
    label: "Active",
    dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  completed: {
    label: "Completed",
    dot: "bg-blue-400",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  draft: {
    label: "Draft",
    dot: "bg-slate-400",
    badge: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
};

function getDefaultStatus(event: EventListItem): string {
  const now = Date.now();
  const eventTime = new Date(event.date).getTime();

  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  if (now < eventTime) {
    return "draft";
  }

  if (now >= eventTime && now <= eventTime + TWENTY_FOUR_HOURS) {
    return "active";
  }

  return "completed";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Event Card (Grid View) ─────────────────────────────────────────────────────
function EventCard({
  event,
  isAdmin,
  onDelete,
  onView,
  deleting,
}: {
  event: EventListItem;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onView: (event: EventListItem) => void;
  deleting: string | null;
}) {
  const status = getDefaultStatus(event);
  const meta = STATUS_META[status] ?? STATUS_META.active;
  const isDeleting = deleting === event.id;

  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-white/[0.07] bg-[#0f1117]",
        "hover:border-white/15 hover:bg-[#131621] transition-all duration-300",
        "flex flex-col overflow-hidden"
      )}
    >
      {/* Colored top accent */}
      <div
        className={cn(
          "h-[3px] w-full",
          status === "active" && "bg-gradient-to-r from-cyan-400 to-emerald-400",
          status === "completed" && "bg-gradient-to-r from-blue-400 to-purple-400",
          status === "draft" && "bg-gradient-to-r from-slate-600 to-slate-500",
        )}
      />

      {/* Card body */}
      <div className="flex flex-col gap-4 p-5 flex-1">
        {/* Status badge */}
        <div className="flex items-center justify-between">
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border", meta.badge)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
            {meta.label}
          </span>
          {/* Photo count pill */}
          {event.photoCount !== undefined && (
            <span className="text-[10px] font-medium text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
              {event.photoCount.toLocaleString()} photos
            </span>
          )}
        </div>

        {/* Title */}
        <div>
          <h3 className="text-base font-bold text-white leading-snug group-hover:text-cyan-300 transition-colors line-clamp-2">
            {event.title}
          </h3>
        </div>

        {/* Metadata */}
        <div className="space-y-2 mt-auto">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CalendarDays size={12} className="shrink-0 text-slate-600" />
            <span>{formatDate(event.date)}</span>
            <span className="text-slate-700">·</span>
            <Clock size={11} className="shrink-0 text-slate-600" />
            <span>{formatTime(event.date)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MapPin size={12} className="shrink-0 text-slate-600" />
            <span className="truncate">{event.location}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <User2 size={12} className="shrink-0 text-slate-600" />
            <span className="truncate">{event.createdBy.name}</span>
          </div>
        </div>
      </div>

      {/* Card footer */}
      <div className="px-5 pb-5 flex items-center justify-between gap-2">
        <button
          onClick={() => onView(event)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all",
            status === "active"
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20"
              : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
          )}
        >
          {status === "completed" ? "View Gallery" : "Open Event"}
          <ChevronRight size={12} />
        </button>

        {isAdmin && (
          <button
            onClick={() => onDelete(event.id)}
            disabled={isDeleting}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 border border-white/[0.06] transition-all"
            aria-label={`Delete ${event.title}`}
          >
            {isDeleting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Trash2 size={13} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Event Row (List View) ──────────────────────────────────────────────────────
function EventRow({
  event,
  isAdmin,
  onDelete,
  onView,
  deleting,
}: {
  event: EventListItem;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onView: (event: EventListItem) => void;
  deleting: string | null;
}) {
  const status = getDefaultStatus(event);
  const meta = STATUS_META[status] ?? STATUS_META.active;
  const isDeleting = deleting === event.id;

  return (
    <div
      onClick={() => onView(event)}
      className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1.8fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] transition-colors group cursor-pointer"
    >
      {/* Title + status */}
      <div className="flex items-center gap-3 min-w-0">
        <span className={cn("w-2 h-2 rounded-full shrink-0", meta.dot)} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
            {event.title}
          </p>
          <p className="text-[11px] text-slate-600 truncate">{event.location}</p>
        </div>
      </div>

      {/* Date — hidden on mobile */}
      <div className="hidden sm:block text-xs text-slate-500">
        <p>{formatDate(event.date)}</p>
        <p className="text-slate-600">{formatTime(event.date)}</p>
      </div>

      {/* Creator — hidden on mobile */}
      <div className="hidden sm:block text-xs text-slate-500 truncate">
        {event.createdBy.name}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end">
        <span className={cn("hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border", meta.badge)}>
          {meta.label}
        </span>
        {isAdmin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(event.id);
            }}
            disabled={isDeleting}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
            aria-label={`Delete ${event.title}`}
          >
            {isDeleting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Trash2 size={12} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── View Event Modal ───────────────────────────────────────────────────────────
function ViewEventModal({ event, onClose }: { event: EventListItem | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!event) return null;

  const status = getDefaultStatus(event);
  const meta = STATUS_META[status] ?? STATUS_META.active;

  const eventPath = `/event/${event.id}/gallery`;
  const eventUrl = typeof window !== "undefined"
    ? `${window.location.origin}${eventPath}`
    : eventPath;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const blob = new Blob([clone.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${event.title.toLowerCase().replace(/\s+/g, "-")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative w-full max-w-2xl rounded-2xl border border-white/[0.08] bg-[#0d0f14] shadow-2xl pointer-events-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-7 pt-6 pb-5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", meta.dot)} />
              <h2 className="text-[15px] font-semibold text-white truncate lowercase tracking-tight">
                {event.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white transition-colors shrink-0"
            >
              <X size={17} />
            </button>
          </div>

          {/* ── Body: 2-column grid ── */}
          <div className="grid grid-cols-[1fr_auto] gap-6 px-7 pb-5">

            {/* Left — event details */}
            <div className="flex flex-col justify-center space-y-4">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <CalendarDays size={15} className="text-slate-500 shrink-0" />
                <span>{formatDate(event.date)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <Clock size={15} className="text-slate-500 shrink-0" />
                <span>{formatTime(event.date)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <MapPin size={15} className="text-slate-500 shrink-0" />
                <span>{event.location}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <User2 size={15} className="text-slate-500 shrink-0" />
                <span>Created by {event.createdBy.name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <Camera size={15} className="text-slate-500 shrink-0" />
                <span>{event.photoCount?.toLocaleString() ?? 0} Photos</span>
              </div>
            </div>

            {/* Right — QR code */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div ref={qrRef} className="bg-white rounded-2xl p-4 shadow-xl">
                <QRCode
                  value={eventUrl}
                  size={168}
                  bgColor="#ffffff"
                  fgColor="#020617"
                  level="H"
                  style={{ display: "block" }}
                />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Scan to open gallery
              </p>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="mx-7 border-t border-white/[0.06]" />

          {/* ── Footer: URL pill + download ── */}
          <div className="px-7 py-5 space-y-3">
            {/* URL pill */}
            <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.07] px-4 py-2.5">
              <code className="flex-1 text-[12px] text-slate-300 truncate font-mono">
                {eventPath}
              </code>
              <button
                onClick={handleCopy}
                title="Copy link"
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-all",
                  copied ? "text-emerald-400" : "text-slate-500 hover:text-white hover:bg-white/10"
                )}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
              <a
                href={eventUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in new tab"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-500 hover:text-white hover:bg-white/10 transition-all"
              >
                <ExternalLink size={13} />
              </a>
            </div>

            {/* Download button */}
            <button
              onClick={handleDownload}
              className="flex w-full items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1a2a2a] border border-cyan-500/20 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/10 transition-all"
            >
              <Download size={14} />
              Download QR Code
            </button>
          </div>

        </div>
      </div>
    </>
  );
}



// ── Delete Confirmation Modal ──────────────────────────────────────────────────
function DeleteConfirmationModal({
  event,
  onClose,
  onConfirm,
  isDeleting,
}: {
  event: EventListItem | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  if (!event) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div className="relative w-full max-w-md rounded-2xl border border-rose-500/20 bg-[#0d0f14] shadow-[0_0_40px_rgba(244,63,94,0.15)] pointer-events-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6">
              <Trash2 size={24} className="text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Delete Event?</h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed text-center">
              Are you sure you want to delete <span className="text-slate-200 font-semibold italic">"{event.title}"</span>? <br />
              <span className="text-rose-400/90 font-medium">Warning: This will remove the entire photo gallery associated with this event.</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm font-semibold hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-black text-sm font-bold hover:bg-rose-400 transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Delete Event"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Client Component ──────────────────────────────────────────────────────
export function EventsClient({ events, isAdmin, userId }: EventsClientProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [viewEvent, setViewEvent] = useState<EventListItem | null>(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState<EventListItem | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [deleting, setDeleting] = useState<string | null>(null);

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    { key: "draft", label: "Draft" },
  ];

  const filtered = events.filter((e) => {
    const matchSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.location.toLowerCase().includes(search.toLowerCase());
    const status = getDefaultStatus(e);
    const matchFilter = filter === "all" || status === filter;
    return matchSearch && matchFilter;
  });

  function handleDeleteClick(event: EventListItem) {
    setConfirmDeleteEvent(event);
  }

  async function handleConfirmDelete() {
    if (!confirmDeleteEvent) return;
    const id = confirmDeleteEvent.id;

    setDeleting(id);
    const result = await deleteEventAction(id);
    if (result.success) {
      window.location.reload();
    } else {
      alert("error" in result ? result.error : "Failed to delete event.");
      setDeleting(null);
      setConfirmDeleteEvent(null);
    }
  }

  const counts = {
    all: events.length,
    active: events.filter((e) => getDefaultStatus(e) === "active").length,
    completed: events.filter((e) => getDefaultStatus(e) === "completed").length,
    draft: events.filter((e) => getDefaultStatus(e) === "draft").length,
  };

  return (
    <>
      {/* Modal */}
      <EventModal open={modalOpen} onClose={() => setModalOpen(false)} createdBy={userId} />
      <ViewEventModal event={viewEvent} onClose={() => setViewEvent(null)} />
      <DeleteConfirmationModal
        event={confirmDeleteEvent}
        onClose={() => setConfirmDeleteEvent(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={!!deleting}
      />

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-1.5">
            Event Management
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
            My Events
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your photography assignments and track event progress.
          </p>
        </div>

        {isAdmin && (
          <button
            id="add-event-btn"
            onClick={() => setModalOpen(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shrink-0",
              "bg-cyan-500 text-black hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20",
              "active:scale-95"
            )}
          >
            <Plus size={16} />
            Add New Event
          </button>
        )}
      </div>

      {/* ── Controls Row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            id="event-search"
            type="text"
            placeholder="Search events or locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-white/5 border border-white/[0.07]",
              "text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1",
              "focus:ring-cyan-500/50 focus:border-cyan-500/30 transition-all"
            )}
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/[0.07] shrink-0">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "flex items-center justify-center h-7 w-7 rounded-md transition-all",
              viewMode === "grid" ? "bg-white/10 text-white" : "text-slate-600 hover:text-slate-400"
            )}
            aria-label="Grid view"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center justify-center h-7 w-7 rounded-md transition-all",
              viewMode === "list" ? "bg-white/10 text-white" : "text-slate-600 hover:text-slate-400"
            )}
            aria-label="List view"
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-6 no-scrollbar">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0",
              filter === tab.key
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                filter === tab.key ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-slate-600"
              )}
            >
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Events Grid / List ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <CalendarDays size={24} className="text-slate-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-400 mb-1">
            {search ? "No matches found" : "No events yet"}
          </h3>
          <p className="text-sm text-slate-600 max-w-xs">
            {search
              ? "Try adjusting your search or filter criteria."
              : isAdmin
                ? "Click \"Add New Event\" to create your first photography event."
                : "Once an admin creates events, they will appear here."}
          </p>
          {isAdmin && !search && (
            <button
              onClick={() => setModalOpen(true)}
              className="mt-5 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
            >
              <Plus size={15} />
              Add New Event
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isAdmin={isAdmin}
              onDelete={() => handleDeleteClick(event)}
              onView={setViewEvent}
              deleting={deleting}
            />
          ))}

          {/* Create new event card — admin only */}
          {isAdmin && (
            <button
              onClick={() => setModalOpen(true)}
              className={cn(
                "group relative flex flex-col items-center justify-center gap-3",
                "rounded-2xl border border-dashed border-white/10 bg-white/[0.02]",
                "hover:border-cyan-500/30 hover:bg-cyan-500/[0.03] transition-all duration-300",
                "min-h-[200px] cursor-pointer"
              )}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 border border-white/10 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/20 transition-all">
                <Plus size={20} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 group-hover:text-cyan-400 transition-colors">
                  Create Event
                </p>
                <p className="text-xs text-slate-600 text-center">Register a new session</p>
              </div>
            </button>
          )}
        </div>
      ) : (
        /* List View */
        <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] overflow-hidden">
          {/* List header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1.8fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-white/[0.06]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Event</span>
            <span className="hidden sm:block text-[10px] font-bold uppercase tracking-widest text-slate-600">Date</span>
            <span className="hidden sm:block text-[10px] font-bold uppercase tracking-widest text-slate-600">Created by</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 text-right">Actions</span>
          </div>
          {filtered.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              isAdmin={isAdmin}
              onDelete={() => handleDeleteClick(event)}
              onView={setViewEvent}
              deleting={deleting}
            />
          ))}
        </div>
      )}
    </>
  );
}
