"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bug,
  MessageSquare,
  Trash2,
  Loader2,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Clock,
  Mail,
  User
} from "lucide-react";
import {
  updateReportStatus,
  deleteReport,
  type ReportItem,
} from "./actions";

interface ReportsClientProps {
  initialReports: ReportItem[];
}

export function ReportsClient({ initialReports }: ReportsClientProps) {
  const [reports, setReports] = useState<ReportItem[]>(initialReports);
  const [isPending, startTransition] = useTransition();
  const [filterType, setFilterType] = useState<"all" | "bug" | "feedback">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "in_progress" | "resolved">("all");

  const filteredReports = reports.filter((r) => {
    if (filterType !== "all" && r.type !== filterType) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    return true;
  });

  const handleStatusChange = (reportId: string, newStatus: "open" | "in_progress" | "resolved") => {
    startTransition(async () => {
      const result = await updateReportStatus(reportId, newStatus);
      if (result.success) {
        setReports((prev) =>
          prev.map((r) =>
            r._id === reportId ? { ...r, status: newStatus } : r
          )
        );
      }
    });
  };

  const handleDelete = (reportId: string) => {
    if (!confirm(`Are you sure you want to permanently delete this report?`)) return;
    startTransition(async () => {
      const result = await deleteReport(reportId);
      if (result.success) {
        setReports((prev) => prev.filter((r) => r._id !== reportId));
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"><CheckCircle2 className="h-3 w-3 mr-1" /> Resolved</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20"><Clock className="h-3 w-3 mr-1" /> In Progress</Badge>;
      default:
        return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20"><AlertCircle className="h-3 w-3 mr-1" /> Open</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="h-10 rounded-xl border border-white/10 bg-[#081b24] px-4 text-sm text-white outline-none focus:border-emerald-500/50"
          >
            <option value="all">All Types</option>
            <option value="bug">Bugs Only</option>
            <option value="feedback">Feedback Only</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="h-10 rounded-xl border border-white/10 bg-[#081b24] px-4 text-sm text-white outline-none focus:border-emerald-500/50"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <p className="text-sm text-slate-400">
          Showing {filteredReports.length} report{filteredReports.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Reports List */}
      <div className="grid gap-4">
        {filteredReports.length === 0 ? (
          <Card variant="glass" className="border-white/5 bg-[#081b24]/30 p-16 text-center text-slate-500">
            <div className="flex flex-col items-center gap-2">
              <MessageSquare className="h-6 w-6 text-slate-600" />
              <span>No reports found matching your criteria.</span>
            </div>
          </Card>
        ) : (
          filteredReports.map((r) => (
            <Card key={r._id} variant="glass" className="border-white/5 bg-[#081b24]/30 p-5 flex flex-col md:flex-row gap-6 hover:bg-white/[0.02] transition">
              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${r.type === 'bug' ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      {r.type === 'bug' ? <Bug className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        {r.type === 'bug' ? 'Bug Report' : 'User Feedback'}
                        {getStatusBadge(r.status)}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {r.name}</span>
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> <a href={`mailto:${r.email}`} className="hover:text-emerald-400 transition">{r.email}</a></span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-black/20 rounded-xl p-4 border border-white/5 text-sm text-slate-300 whitespace-pre-wrap">
                  {r.message}
                </div>
              </div>

              <div className="flex md:flex-col items-end justify-between md:justify-start gap-2 min-w-[140px] border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                <select
                  disabled={isPending}
                  value={r.status}
                  onChange={(e) => handleStatusChange(r._id, e.target.value as any)}
                  className="w-full h-9 rounded-lg border border-white/10 bg-[#081b24] px-3 text-xs font-medium text-white outline-none focus:border-emerald-500/50 disabled:opacity-50"
                >
                  <option value="open">Mark Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
                <button
                  onClick={() => handleDelete(r._id)}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400 border border-rose-500/20 transition hover:bg-rose-500/20 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
