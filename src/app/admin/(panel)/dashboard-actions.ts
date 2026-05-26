"use server";

import { connectToDatabase } from "@/lib/db/mongodb";
import { UserModel } from "@/models/User";
import { PaymentModel } from "@/models/Payment";
import ReportModel from "@/models/Report";

export interface DashboardStats {
  totalPhotographers: number;
  totalRevenue: number;
  openReports: number;
  revenueByDay: { date: string; amount: number }[];
  reportsByType: { type: string; count: number }[];
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  await connectToDatabase();

  // 1. Total Photographers

  
  const totalPhotographers = await UserModel.countDocuments();

  // 2. Total Revenue
  const payments = await PaymentModel.find({}, "amount createdAt").lean();
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // 3. Open Reports
  const openReports = await ReportModel.countDocuments({ status: "open" });

  // 4. Revenue By Day (Last 30 Days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentPayments = await PaymentModel.find({
    createdAt: { $gte: thirtyDaysAgo }
  }).lean();

  const revenueMap: Record<string, number> = {};
  
  // Initialize last 30 days with 0
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    revenueMap[dateStr] = 0;
  }

  recentPayments.forEach((p) => {
    if (!p.createdAt) return;
    const dateStr = new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (revenueMap[dateStr] !== undefined) {
      revenueMap[dateStr] += p.amount || 0;
    }
  });

  const revenueByDay = Object.entries(revenueMap).map(([date, amount]) => ({
    date,
    amount
  }));

  // 5. Reports By Type
  const bugs = await ReportModel.countDocuments({ type: "bug" });
  const feedback = await ReportModel.countDocuments({ type: "feedback" });

  const reportsByType = [
    { type: "Bug", count: bugs },
    { type: "Feedback", count: feedback }
  ];

  return {
    totalPhotographers,
    totalRevenue,
    openReports,
    revenueByDay,
    reportsByType
  };
}
