import { Bug, MessageSquare, CheckCircle2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { fetchReports } from "./actions";
import { ReportsClient } from "./reports-client";

export default async function AdminReportsPage() {
  const reports = await fetchReports();

  const totalBugs = reports.filter((r) => r.type === "bug").length;
  const totalFeedback = reports.filter((r) => r.type === "feedback").length;
  const openReports = reports.filter((r) => r.status === "open").length;
  const resolvedReports = reports.filter((r) => r.status === "resolved").length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Feedback</h1>
        <p className="mt-1 text-slate-400">
          Analyze user feedback and track bug reports submitted from the landing page.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
            <Bug className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Bugs</p>
            <p className="text-xl font-black text-white">{totalBugs}</p>
          </div>
        </Card>

        <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Feedback</p>
            <p className="text-xl font-black text-white">{totalFeedback}</p>
          </div>
        </Card>

        <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Open Reports</p>
            <p className="text-xl font-black text-white">{openReports}</p>
          </div>
        </Card>

        <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Resolved</p>
            <p className="text-xl font-black text-white">{resolvedReports}</p>
          </div>
        </Card>
      </div>

      {/* Interactive Client Component */}
      <ReportsClient initialReports={reports} />
    </div>
  );
}
