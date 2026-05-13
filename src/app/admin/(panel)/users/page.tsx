import { Search } from "lucide-react";
import { fetchUsersPage } from "./actions";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const initialUsers = await fetchUsersPage(1, 20, "all");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Photographers</h1>
          <p className="text-slate-400">
            Manage and monitor all registered photographers. Approve or revoke access.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search photographers..."
            className="h-10 w-full rounded-full border border-white/10 bg-[#081b24] pl-10 pr-4 text-sm transition-focus outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 md:w-64"
          />
        </div>
      </div>

      <UsersClient initialUsers={initialUsers} />
    </div>
  );
}
