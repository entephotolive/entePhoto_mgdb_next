"use client";

import { Card } from "@/components/ui/card";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import type { DashboardStats } from "./dashboard-actions";

interface DashboardClientProps {
  stats: DashboardStats;
}

export function DashboardClient({ stats }: DashboardClientProps) {
  const COLORS = ["#f43f5e", "#3b82f6"]; // rose-500, blue-500

  // Custom Tooltip for Area Chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#081b24] border border-emerald-500/20 p-3 rounded-lg shadow-xl">
          <p className="text-slate-400 text-xs mb-1">{label}</p>
          <p className="text-emerald-400 font-bold text-sm">
            ₹{payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-6 md:grid-cols-3 mt-8">
      {/* Revenue Chart (Takes up 2/3 width on md screens) */}
      <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-6 md:col-span-2">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white">Revenue Overview</h2>
          <p className="text-sm text-slate-400">Total revenue generated over the last 30 days.</p>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={stats.revenueByDay}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                minTickGap={30}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Reports Breakdown (Takes up 1/3 width on md screens) */}
      <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white">Reports Breakdown</h2>
          <p className="text-sm text-slate-400">Distribution of bugs vs feedback.</p>
        </div>

        <div className="h-[300px] w-full flex items-center justify-center">
          {stats.reportsByType.every(r => r.count === 0) ? (
            <p className="text-slate-500 text-sm">No reports available.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.reportsByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {stats.reportsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: "#081b24", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                  itemStyle={{ color: "#fff", fontSize: "14px", fontWeight: "bold" }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}
