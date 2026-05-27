"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Ticket,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Percent,
  IndianRupee,
  Tag,
} from "lucide-react";
import {
  createCoupon,
  toggleCouponActive,
  deleteCoupon,
  type CouponItem,
} from "./actions";

interface CouponsClientProps {
  initialCoupons: CouponItem[];
}

export function CouponsClient({ initialCoupons }: CouponsClientProps) {
  const [coupons, setCoupons] = useState<CouponItem[]>(initialCoupons);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setCode("");
    setDiscountType("percentage");
    setDiscountValue("");
    setMaxUses("");
    setExpiryDate("");
    setFormError(null);
    setFormSuccess(null);
  };

  const handleCreate = () => {
    setFormError(null);
    setFormSuccess(null);

    const val = parseFloat(discountValue);
    if (!code.trim()) return setFormError("Coupon code is required.");
    if (!discountValue || isNaN(val) || val <= 0)
      return setFormError("Discount value must be a positive number.");
    if (discountType === "percentage" && val > 100)
      return setFormError("Percentage discount cannot exceed 100%.");

    startTransition(async () => {
      const result = await createCoupon({
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: val,
        maxUses: maxUses ? parseInt(maxUses) : undefined,
        expiryDate: expiryDate || undefined,
      });

      if (!result.success) {
        setFormError(result.error || "Failed to create coupon.");
      } else {
        setFormSuccess(`Coupon "${code.trim().toUpperCase()}" created successfully!`);
        resetForm();
        setTimeout(() => setShowForm(false), 1500);
        // Optimistically refresh — server revalidatePath handles the actual data sync
        window.location.reload();
      }
    });
  };

  const handleToggle = (couponId: string, currentStatus: boolean) => {
    startTransition(async () => {
      const result = await toggleCouponActive(couponId, currentStatus);
      if (result.success) {
        setCoupons((prev) =>
          prev.map((c) =>
            c._id === couponId ? { ...c, active: !currentStatus } : c
          )
        );
      }
    });
  };

  const handleDelete = (couponId: string, couponCode: string) => {
    if (!confirm(`Are you sure you want to permanently delete coupon "${couponCode}"?`)) return;
    startTransition(async () => {
      const result = await deleteCoupon(couponId);
      if (result.success) {
        setCoupons((prev) => prev.filter((c) => c._id !== couponId));
      }
    });
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {coupons.length} total coupon{coupons.length !== 1 ? "s" : ""} configured
        </p>
        <button
          onClick={() => { setShowForm((p) => !p); resetForm(); }}
          className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
        >
          <Plus className="h-4 w-4" />
          New Coupon
        </button>
      </div>

      {/* Create Form Panel */}
      {showForm && (
        <Card variant="glass" className="border-emerald-500/20 bg-[#081b24]/60 p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Ticket className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-white">Create Promo Code</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Code */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                <Tag className="h-3 w-3" /> Coupon Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME50"
                className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition font-mono tracking-wider"
              />
            </div>

            {/* Discount Type */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Discount Type
              </label>
              <div className="flex rounded-xl border border-white/10 overflow-hidden h-10">
                <button
                  onClick={() => setDiscountType("percentage")}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold transition-all ${
                    discountType === "percentage"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-white/[0.02] text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Percent className="h-3.5 w-3.5" /> Percentage
                </button>
                <button
                  onClick={() => setDiscountType("fixed")}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold transition-all border-l border-white/10 ${
                    discountType === "fixed"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-white/[0.02] text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <IndianRupee className="h-3.5 w-3.5" /> Fixed (₹)
                </button>
              </div>
            </div>

            {/* Discount Value */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                {discountType === "percentage" ? "Percentage (%)" : "Amount (₹)"}
              </label>
              <input
                type="number"
                min="1"
                max={discountType === "percentage" ? "100" : undefined}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percentage" ? "e.g. 20" : "e.g. 500"}
                className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition"
              />
            </div>

            {/* Max Uses */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Max Uses <span className="text-slate-600">(optional)</span>
              </label>
              <input
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
                className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition"
              />
            </div>

            {/* Expiry Date */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                <Calendar className="h-3 w-3" /> Expiry Date <span className="text-slate-600">(optional)</span>
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Feedback */}
          {formError && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {formSuccess}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.05]">
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              disabled={isPending}
              className="rounded-xl border border-white/10 px-5 py-2 text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isPending}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-bold text-black hover:bg-emerald-400 transition disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Coupon
            </button>
          </div>
        </Card>
      )}

      {/* Coupons Table */}
      <Card variant="glass" className="overflow-hidden border-white/5 bg-[#081b24]/30 p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Code</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Discount</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Usage</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Expires</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Ticket className="h-6 w-6 text-slate-600" />
                      <span>No coupons created yet. Click "New Coupon" to get started.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                coupons.map((c) => {
                  const expired = isExpired(c.expiryDate);
                  const maxed = c.maxUses != null && c.usesCount >= c.maxUses;
                  const effectivelyInactive = !c.active || expired || maxed;
                  return (
                    <tr key={c._id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Code */}
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-bold text-white tracking-widest">
                          {c.code}
                        </span>
                      </td>

                      {/* Discount */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {c.discountType === "percentage" ? (
                            <Percent className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <IndianRupee className="h-3.5 w-3.5 text-emerald-400" />
                          )}
                          <span className="text-sm font-bold text-white">
                            {c.discountType === "percentage"
                              ? `${c.discountValue}% off`
                              : `₹${c.discountValue} off`}
                          </span>
                        </div>
                      </td>

                      {/* Usage */}
                      <td className="px-6 py-4 text-sm text-slate-400">
                        <span className="font-semibold text-white">{c.usesCount}</span>
                        <span className="text-slate-600"> / </span>
                        <span>{c.maxUses ?? "∞"}</span>
                        {maxed && (
                          <Badge variant="secondary" className="ml-2 bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px]">
                            Maxed
                          </Badge>
                        )}
                      </td>

                      {/* Expiry */}
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {c.expiryDate ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span className={expired ? "text-rose-400 font-semibold" : ""}>
                              {new Date(c.expiryDate).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            {expired && <Badge variant="secondary" className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px]">Expired</Badge>}
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">No expiry</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {effectivelyInactive ? (
                          <Badge variant="secondary" className="bg-slate-500/10 text-slate-400 border-slate-500/20">
                            Inactive
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            Active
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleToggle(c._id, c.active)}
                            disabled={isPending}
                            title={c.active ? "Deactivate coupon" : "Activate coupon"}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition disabled:opacity-50 ${
                              c.active
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                            }`}
                          >
                            {c.active ? <ToggleLeft className="h-3.5 w-3.5" /> : <ToggleRight className="h-3.5 w-3.5" />}
                            {c.active ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={() => handleDelete(c._id, c.code)}
                            disabled={isPending}
                            title="Delete coupon"
                            className="flex items-center justify-center rounded-lg bg-rose-500/10 p-1.5 text-rose-400 border border-rose-500/20 transition hover:bg-rose-500/20 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
