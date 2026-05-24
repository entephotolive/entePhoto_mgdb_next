"use server";

import { connectToDatabase } from "@/lib/db/mongodb";
import ReportModel from "@/models/Report";
import { revalidatePath } from "next/cache";

export interface ReportItem {
  _id: string;
  type: "bug" | "feedback";
  name: string;
  email: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
}

export async function fetchReports(): Promise<ReportItem[]> {
  await connectToDatabase();
  const reports = await ReportModel.find().sort({ createdAt: -1 }).lean();
  
  return reports.map((r: any) => ({
    _id: String(r._id),
    type: r.type,
    name: r.name,
    email: r.email,
    message: r.message,
    status: r.status || "open",
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
  }));
}

export async function updateReportStatus(reportId: string, newStatus: "open" | "in_progress" | "resolved") {
  try {
    await connectToDatabase();
    await ReportModel.findByIdAndUpdate(reportId, { status: newStatus });
    revalidatePath("/admin/reports");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update status" };
  }
}

export async function deleteReport(reportId: string) {
  try {
    await connectToDatabase();
    await ReportModel.findByIdAndDelete(reportId);
    revalidatePath("/admin/reports");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete report" };
  }
}
