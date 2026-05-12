"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Mail, 
  MapPin, 
  Camera, 
  Calendar,
  MoreVertical,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InfiniteScroll } from "@/components/shared/infinite-scroll";
import { fetchUsersPage } from "./actions";

export function UsersClient({ initialUsers }: { initialUsers: any[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialUsers.length >= 20);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    
    try {
      const nextPage = page + 1;
      const newUsers = await fetchUsersPage(nextPage, 20);
      
      if (newUsers.length < 20) {
        setHasMore(false);
      }
      
      setUsers((prev) => [...prev, ...newUsers]);
      setPage(nextPage);
    } catch (error) {
      console.error("Failed to load more users", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, isLoading, hasMore]);

  return (
    <div className="grid gap-6">
      <Card variant="glass" className="overflow-hidden border-white/5 bg-[#081b24]/50 p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Photographer</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Studio Details</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Specialization</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Joined</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user._id.toString()} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-white/10">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback className="bg-emerald-500/10 text-emerald-400">
                          {user.name?.charAt(0) || "P"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name || "Photographer"}</p>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-white">
                        <Camera className="h-3.5 w-3.5 text-cyan-400" />
                        {user.studioName || "No Studio Name"}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" />
                        {user.studioLocation || "Remote"}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {user.specializations && user.specializations.length > 0 ? (
                        user.specializations.map((spec: string) => (
                          <Badge key={spec} variant="secondary" className="bg-emerald-500/10 text-[10px] text-emerald-200 border-emerald-500/20">
                            {spec}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">Not specified</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="secondary" className="bg-emerald-400/10 text-emerald-400 border-emerald-400/20">
                      Active
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="rounded-lg p-2 hover:bg-white/5 transition-colors">
                      <MoreVertical className="h-5 w-5 text-slate-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <InfiniteScroll 
            hasMore={hasMore} 
            isLoading={isLoading} 
            onLoadMore={loadMore} 
          />
        </div>
      </Card>
    </div>
  );
}
