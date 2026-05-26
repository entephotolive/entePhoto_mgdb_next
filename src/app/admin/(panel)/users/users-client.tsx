"use client";

import { useState, useCallback, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Mail,
  MapPin,
  Camera,
  Calendar,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  ShieldCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InfiniteScroll } from "@/components/shared/infinite-scroll";
import { fetchUsersPage, updateUserApproval, type ApprovalFilter } from "./actions";
import { PhotographerOverviewModal } from "./photographer-overview-modal";
import { BarChart3 } from "lucide-react";

// ─── Filter tabs config ───────────────────────────────────────────────────────
const FILTERS: { label: string; value: ApprovalFilter; icon: React.ElementType; color: string }[] =
  [
    { label: "All", value: "all", icon: Users, color: "text-slate-400" },
    { label: "Approved", value: "approved", icon: ShieldCheck, color: "text-emerald-400" },
    { label: "Pending", value: "pending", icon: Clock, color: "text-amber-400" },
  ];

export function UsersClient({ initialUsers }: { initialUsers: any[] }) {
  const [filter, setFilter] = useState<ApprovalFilter>("all");
  const [users, setUsers] = useState(initialUsers);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialUsers.length >= 20);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ─── Modal state ──────────────────────────────────────────────────────────
  const [overviewUser, setOverviewUser] = useState<any | null>(null);

  // ─── Switch filter ──────────────────────────────────────────────────────────
  const handleFilterChange = useCallback((newFilter: ApprovalFilter) => {
    setFilter(newFilter);
    setPage(1);
    setIsLoading(true);
    startTransition(async () => {
      const fresh = await fetchUsersPage(1, 20, newFilter);
      setUsers(fresh);
      setHasMore(fresh.length >= 20);
      setIsLoading(false);
    });
  }, []);

  // ─── Infinite scroll ────────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const newUsers = await fetchUsersPage(nextPage, 20, filter);
      if (newUsers.length < 20) setHasMore(false);
      setUsers((prev) => [...prev, ...newUsers]);
      setPage(nextPage);
    } catch (error) {
      console.error("Failed to load more users", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, isLoading, hasMore, filter]);

  // ─── Approve / Reject ───────────────────────────────────────────────────────
  const handleApproval = useCallback(
    (userId: string, approve: boolean) => {
      startTransition(async () => {
        try {
          await updateUserApproval(userId, approve);
          // Update the local state immediately for snappy UI
          if (filter === "all") {
            setUsers((prev) =>
              prev.map((u) =>
                u._id === userId ? { ...u, isApproved: approve } : u
              )
            );
          } else {
            // Remove from filtered list since it no longer matches
            setUsers((prev) => prev.filter((u) => u._id !== userId));
          }
        } catch (err) {
          console.error("Failed to update approval status", err);
        }
      });
    },
    [filter]
  );

  return (
    <div className="grid gap-6">
      {/* ── Filter Tabs ── */}
      <div className="flex items-center gap-2">
        {FILTERS.map(({ label, value, icon: Icon, color }) => {
          const active = filter === value;
          return (
            <button
              key={value}
              onClick={() => handleFilterChange(value)}
              disabled={isPending}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 border ${
                active
                  ? "bg-white/10 border-white/20 text-white shadow-lg"
                  : "bg-transparent border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-300"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? color : ""}`} />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Table ── */}
      <Card variant="glass" className="overflow-hidden border-white/5 bg-[#081b24]/50 p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Photographer
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Studio Details
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Contact
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Joined
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    No photographers found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user._id}
                    className="group hover:bg-white/[0.04] transition-colors cursor-pointer"
                    onClick={() => setOverviewUser(user)}
                  >
                    {/* Photographer info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-white/10 group-hover:border-cyan-500/50 transition-colors">
                          <AvatarImage src={user.avatarUrl} />
                          <AvatarFallback className="bg-emerald-500/10 text-emerald-400">
                            {user.name?.charAt(0) || "P"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium group-hover:text-cyan-400 transition-colors">{user.name || "Photographer"}</p>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Studio */}
                    <td className="px-6 py-4 text-sm text-slate-300">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-medium text-white">
                          <Camera className="h-3.5 w-3.5 text-cyan-400" />
                          {user.studioName || "—"}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <MapPin className="h-3 w-3" />
                          {user.studioLocation || "Remote"}
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {user.phoneNumber ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-cyan-400" />
                          {user.phoneNumber}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600 italic">Not provided</span>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-4">
                      {user.isApproved ? (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-400/10 text-emerald-400 border-emerald-400/20"
                        >
                          Approved
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-amber-400/10 text-amber-400 border-amber-400/20"
                        >
                          Pending
                        </Badge>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="px-6 py-4 text-sm text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "—"}
                      </div>
                    </td>

                    {/* Approve / Reject */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOverviewUser(user)}
                          title="View Statistics"
                          className="flex items-center justify-center rounded-lg bg-white/5 p-2 text-slate-400 border border-white/5 transition hover:bg-white/10 hover:text-cyan-400"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </button>

                        {!user.isApproved ? (
                          <button
                            onClick={() => handleApproval(user._id, true)}
                            disabled={isPending}
                            title="Approve"
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20 transition hover:bg-emerald-500/20 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => handleApproval(user._id, false)}
                            disabled={isPending}
                            title="Revoke"
                            className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 border border-rose-500/20 transition hover:bg-rose-500/20 disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <InfiniteScroll
            hasMore={hasMore}
            isLoading={isLoading}
            onLoadMore={loadMore}
          />
        </div>
      </Card>

      {/* ── Overview Modal ── */}
      <PhotographerOverviewModal
        user={overviewUser}
        isOpen={!!overviewUser}
        onClose={() => setOverviewUser(null)}
      />
    </div>
  );
}
