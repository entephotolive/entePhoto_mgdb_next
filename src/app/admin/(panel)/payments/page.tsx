import { connectToDatabase } from "@/lib/db/mongodb";
import { PaymentModel } from "@/models/Payment";
import { UserModel } from "@/models/User";
import { CreditCard, TrendingUp, Camera, Banknote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PaymentsClient } from "./payments-client";

async function fetchAllPayments() {
  await connectToDatabase();

  const payments = await PaymentModel.find()
    .sort({ createdAt: -1 })
    .lean();

  const enriched = await Promise.all(
    payments.map(async (p) => {
      let photographer = { name: "Unknown", email: "—" };
      try {
        const user = await UserModel.findById(p.createdBy).select("name email").lean();
        if (user) {
          photographer = {
            name: (user.name as string) || "Unknown",
            email: (user.email as string) || "—",
          };
        }
      } catch {}

      return {
        _id: String(p._id),
        orderId: p.orderId,
        paymentId: p.paymentId,
        amount: p.amount,
        currency: p.currency ?? "INR",
        serviceType: p.serviceType as "self" | "managed",
        eventTitle: p.eventTitle,
        eventId: String(p.eventId),
        invoiceNumber: p.invoiceNumber,
        createdAt: p.createdAt ? new Date(p.createdAt as unknown as string).toISOString() : new Date().toISOString(),
        photographer,
      };
    })
  );

  return enriched;
}

export default async function AdminPaymentsPage() {
  const payments = await fetchAllPayments();

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const managedCount = payments.filter((p) => p.serviceType === "managed").length;
  const selfCount = payments.filter((p) => p.serviceType === "self").length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Ledger</h1>
        <p className="mt-1 text-slate-400">
          Full transaction history across all photographer accounts.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Revenue</p>
            <p className="text-xl font-black text-white">₹{totalRevenue.toLocaleString("en-IN")}</p>
          </div>
        </Card>

        {/* Total Transactions */}
        <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Transactions</p>
            <p className="text-xl font-black text-white">{payments.length}</p>
          </div>
        </Card>

        {/* Managed Service */}
        <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Managed Plans</p>
            <p className="text-xl font-black text-white">{managedCount}</p>
          </div>
        </Card>

        {/* Self Service */}
        <Card variant="glass" className="border-white/5 bg-[#081b24]/50 p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Self-Service Plans</p>
            <p className="text-xl font-black text-white">{selfCount}</p>
          </div>
        </Card>
      </div>

      {/* Full Ledger Table */}
      <PaymentsClient payments={payments} />
    </div>
  );
}
