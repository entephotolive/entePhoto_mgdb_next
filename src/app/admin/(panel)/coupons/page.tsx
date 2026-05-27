import { Ticket, Percent, IndianRupee, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { fetchCoupons } from "./actions";
import { CouponsClient } from "./coupons-client";

export default async function AdminCouponsPage() {
  const coupons = await fetchCoupons();

  const activeCoupons = coupons.filter(
    (c) =>
      c.active &&
      (!c.expiryDate || new Date(c.expiryDate) > new Date()) &&
      (c.maxUses == null || c.usesCount < c.maxUses)
  );
  const totalUses = coupons.reduce((sum, c) => sum + c.usesCount, 0);
  const percentageCoupons = coupons.filter((c) => c.discountType === "percentage").length;
  const fixedCoupons = coupons.filter((c) => c.discountType === "fixed").length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Coupon Manager</h1>
        <p className="mt-1 text-slate-400">
          Create, customize, and control promotional discount codes for photographers.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Active Codes</p>
            <p className="text-xl font-black text-white">{activeCoupons.length}</p>
          </div>
        </Card>

        <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Coupons</p>
            <p className="text-xl font-black text-white">{coupons.length}</p>
          </div>
        </Card>

        <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
            <Percent className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">% Coupons</p>
            <p className="text-xl font-black text-white">{percentageCoupons}</p>
          </div>
        </Card>

        <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            <IndianRupee className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Redemptions</p>
            <p className="text-xl font-black text-white">{totalUses}</p>
          </div>
        </Card>
      </div>

      {/* Coupon Manager */}
      <CouponsClient initialCoupons={coupons} />
    </div>
  );
}
