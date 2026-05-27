import { redirect } from "next/navigation";
import { ShieldCheck, Users, IndianRupee, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentAdminSession } from "@/lib/services/auth.service";
import { fetchDashboardStats } from "./dashboard-actions";
import { DashboardClient } from "./dashboard-client";

export default async function AdminPage() {
  const session = await getCurrentAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const stats = await fetchDashboardStats();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <Badge variant="secondary" className="border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
          Authenticated admin session
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight">Welcome back, {session.name}</h1>
        <p className="max-w-2xl text-slate-400">
          This is your central command center for managing the Photo Ceremony platform. 
          Use the analytics below to track revenue, photographers, and system health.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-5 flex items-center gap-4 transition-all hover:border-emerald-500/20">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <IndianRupee className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Revenue</p>
            <p className="text-2xl font-black text-white">₹{stats.totalRevenue.toLocaleString()}</p>
          </div>
        </Card>
        
        <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-5 flex items-center gap-4 transition-all hover:border-blue-500/20">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Photographers</p>
            <p className="text-2xl font-black text-white">{stats.totalPhotographers.toLocaleString()}</p>
          </div>
        </Card>

        <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-5 flex items-center gap-4 transition-all hover:border-rose-500/20">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Open Reports</p>
            <p className="text-2xl font-black text-white">{stats.openReports.toLocaleString()}</p>
          </div>
        </Card>

        <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-5 flex items-center gap-4 transition-all hover:border-purple-500/20">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">System Health</p>
            <p className="text-2xl font-black text-emerald-400">Optimal</p>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <DashboardClient stats={stats} />
    </div>
  );
}
