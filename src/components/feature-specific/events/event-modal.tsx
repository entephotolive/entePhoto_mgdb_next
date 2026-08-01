"use client";

import { useRef, useState, useTransition } from "react";
import {
  X,
  Calendar,
  MapPin,
  Tag,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Download,
  PartyPopper,
  Ticket,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InvoiceModal, InvoiceData } from "@/components/feature-specific/invoice/invoice-modal";
import Script from "next/script";

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  createdBy: string;
}

const SERVICES = [
  {
    id: "self" as const,
    title: "Self Service",
    description: "Client uploads and manages photos themselves",
    price: 999,
    features: [
      "AI-Powered Face Search Integration",
      "Direct client portal & guest upload links",
      "Instant watermarked downloads & sharing",
      "Standard cloud storage for 48 hours",
    ],
  },
  {
    id: "managed" as const,
    title: "Managed Service",
    description: "EntePhoto operator handles uploads and management",
    price: 4999,
    features: [
      "Everything in Self Service, plus:",
      "Assigned EntePhoto operator support",
      "Professional upload & backup management",
      "Custom brand template configurations",
    ],
  },
];

interface CouponState {
  code: string;
  status: "idle" | "loading" | "valid" | "error";
  message: string | null;
  discountAmount: number;
  finalPrice: number;
}

export function EventModal({ open, onClose, createdBy }: EventModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<"details" | "plans" | "success">("details");
  const [selectedPlan, setSelectedPlan] = useState<"self" | "managed">("self");

  // Event details state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Invoice variables
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceData | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponState>({
    code: "",
    status: "idle",
    message: null,
    discountAmount: 0,
    finalPrice: 0,
  });

  const selectedService = SERVICES.find((s) => s.id === selectedPlan)!;
  const effectivePrice = coupon.status === "valid" ? coupon.finalPrice : selectedService.price;

  function handleClose() {
    if (isPending) return;
    setTitle("");
    setDate("");
    setLocation("");
    setStep("details");
    setSelectedPlan("self");
    setFeedback(null);
    setInvoiceDetails(null);
    setCouponInput("");
    setCoupon({ code: "", status: "idle", message: null, discountAmount: 0, finalPrice: 0 });
    onClose();
  }

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !date || !location) {
      setFeedback({ type: "error", message: "Please fill in all event details." });
      return;
    }
    setFeedback(null);
    setStep("plans");
  }

  // When the plan changes, re-run the coupon against the new plan price
  async function handlePlanChange(planId: "self" | "managed") {
    setSelectedPlan(planId);
    // Reset coupon to recalculate against new plan
    if (coupon.status === "valid") {
      setCoupon({ code: "", status: "idle", message: null, discountAmount: 0, finalPrice: 0 });
      setCouponInput("");
    }
  }

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;

    setCoupon((prev) => ({ ...prev, status: "loading", message: null }));

    try {
      const res = await fetch("/next-api/verify-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponInput.trim().toUpperCase(),
          serviceType: selectedPlan,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.valid) {
        setCoupon({
          code: couponInput.trim().toUpperCase(),
          status: "error",
          message: data.error || "Invalid coupon code",
          discountAmount: 0,
          finalPrice: selectedService.price,
        });
      } else {
        setCoupon({
          code: data.code,
          status: "valid",
          message: `"${data.code}" applied — you save ₹${data.discountAmount.toLocaleString("en-IN")}!`,
          discountAmount: data.discountAmount,
          finalPrice: data.finalPrice,
        });
      }
    } catch {
      setCoupon({
        code: couponInput.trim().toUpperCase(),
        status: "error",
        message: "Failed to verify coupon. Please try again.",
        discountAmount: 0,
        finalPrice: selectedService.price,
      });
    }
  }

  function handleRemoveCoupon() {
    setCouponInput("");
    setCoupon({ code: "", status: "idle", message: null, discountAmount: 0, finalPrice: 0 });
  }

  async function handlePaymentSubmit() {
    setFeedback(null);
    const isoDateString = new Date(date).toISOString();
    const appliedCouponCode = coupon.status === "valid" ? coupon.code : null;

    startTransition(async () => {
      try {
        // Step 1: Create order — server resolves coupon discount securely
        const orderRes = await fetch("/next-api/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceType: selectedPlan,
            couponCode: appliedCouponCode,
          }),
        });
        const orderData = await orderRes.json();

        if (!orderRes.ok) {
          throw new Error(orderData.error || "Failed to initialize payment");
        }

        // ── FREE CHECKOUT BRANCH ─────────────────────────────────────────────
        // When a coupon makes the total ₹0, skip Razorpay entirely
        if (orderData.free === true) {
          const freeRes = await fetch("/next-api/free-checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              serviceType: selectedPlan,
              couponCode: appliedCouponCode,
              eventDetails: {
                title,
                date: isoDateString,
                location,
                createdBy,
              },
            }),
          });

          const freeData = await freeRes.json();
          if (!freeRes.ok || !freeData.success) {
            setFeedback({ type: "error", message: freeData.error || "Free checkout failed" });
            return;
          }

          setInvoiceDetails(freeData.invoice);
          setStep("success");
          return;
        }
        // ────────────────────────────────────────────────────────────────────

        if (!orderData.order_id) {
          throw new Error(orderData.error || "Failed to initialize payment");
        }

        // Step 2: Open Razorpay Checkout Modal (only for paid orders)
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Ente Photo",
          description: `${selectedPlan === "self" ? "Self" : "Managed"} Service — Event Fee`,
          order_id: orderData.order_id,
          handler: async function (response: any) {
            try {
              // Step 3: Verify Payment & Create Event + Payment Record in DB
              const verifyRes = await fetch("/next-api/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  serviceType: selectedPlan,
                  couponCode: appliedCouponCode,
                  eventDetails: {
                    title,
                    date: isoDateString,
                    location,
                    createdBy,
                  },
                }),
              });

              const verifyData = await verifyRes.json();
              if (!verifyRes.ok || !verifyData.success) {
                setFeedback({ type: "error", message: verifyData.error || "Payment verification failed" });
                return;
              }

              setInvoiceDetails(verifyData.invoice);
              setStep("success");
            } catch (err: any) {
              setFeedback({ type: "error", message: err.message || "An error occurred during verification" });
            }
          },
          prefill: {
            name: "Photographer Member",
          },
          theme: {
            color: "#06b6d4",
          },
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.on("payment.failed", function () {
          setFeedback({ type: "error", message: "Payment failed. Please try again." });
        });
        razorpay.open();
      } catch (error: any) {
        setFeedback({ type: "error", message: error.message || "Something went wrong" });
      }
    });
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
        aria-hidden="true"
      />

      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Modal Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className={cn(
            "relative w-full max-w-lg rounded-3xl border border-white/[0.08]",
            "bg-[#090a0f] shadow-2xl shadow-cyan-950/20 pointer-events-auto overflow-hidden",
            "animate-in fade-in zoom-in-95 duration-200"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06] bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 shadow-glow">
                {step === "success" ? (
                  <PartyPopper size={16} className="text-cyan-400" />
                ) : (
                  <Plus size={16} className="text-cyan-400" />
                )}
              </div>
              <div>
                <h2 id="modal-title" className="text-base font-semibold text-white tracking-wide">
                  {step === "details" && "Add New Event"}
                  {step === "plans" && "Choose Service Plan"}
                  {step === "success" && "Order Confirmed!"}
                </h2>
                <p className="text-xs text-slate-500">
                  {step === "details" && "Configure event schedule and parameters"}
                  {step === "plans" && "Select a package tailored for your studio"}
                  {step === "success" && "Your premium event gallery is ready"}
                </p>
              </div>
            </div>
            {step !== "success" && (
              <button
                onClick={handleClose}
                disabled={isPending}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                aria-label="Close modal"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Stepper Progress Bar */}
          {step !== "success" && (
            <div className="w-full h-1 bg-white/[0.02] flex">
              <div
                className={cn(
                  "h-full bg-cyan-500 transition-all duration-300 shadow-[0_0_8px_#06b6d4]",
                  step === "details" ? "w-1/2" : "w-full"
                )}
              />
            </div>
          )}

          {/* STEP 1: Details Form */}
          {step === "details" && (
            <form onSubmit={handleNextStep} className="px-6 py-5 space-y-4">
              {/* Event Title */}
              <div className="space-y-1.5">
                <label
                  htmlFor="evt-title"
                  className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest"
                >
                  <Tag size={11} />
                  Event Title
                </label>
                <Input
                  id="evt-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Starlight Wedding Gala"
                  required
                  minLength={3}
                  disabled={isPending}
                  className="focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/40 bg-white/[0.03]"
                />
              </div>

              {/* Date & Time */}
              <div className="space-y-1.5">
                <label
                  htmlFor="evt-date"
                  className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest"
                >
                  <Calendar size={11} />
                  Date &amp; Time
                </label>
                <Input
                  id="evt-date"
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  disabled={isPending}
                  className="focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/40 bg-white/[0.03] [color-scheme:dark]"
                />
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label
                  htmlFor="evt-location"
                  className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest"
                >
                  <MapPin size={11} />
                  Location
                </label>
                <Input
                  id="evt-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Grand Ballroom, Mumbai"
                  required
                  minLength={2}
                  disabled={isPending}
                  className="focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/40 bg-white/[0.03]"
                />
              </div>

              {feedback && (
                <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs border bg-rose-500/10 border-rose-500/20 text-rose-400">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  {feedback.message}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.05]">
                <Button type="button" variant="ghost" onClick={handleClose} disabled={isPending}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-cyan-500 text-black hover:bg-cyan-400 font-semibold min-w-[120px]"
                >
                  Choose Plan
                  <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </form>
          )}

          {/* STEP 2: Choose Service Plan */}
          {step === "plans" && (
            <div className="px-6 py-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
              {/* Plans Options Stack */}
              <div className="grid grid-cols-1 gap-3">
                {SERVICES.map((srv) => {
                  const isSelected = selectedPlan === srv.id;
                  const discountedPrice =
                    coupon.status === "valid" && isSelected
                      ? coupon.finalPrice
                      : null;

                  return (
                    <div
                      key={srv.id}
                      onClick={() => handlePlanChange(srv.id)}
                      className={cn(
                        "relative rounded-2xl border p-4 cursor-pointer transition-all duration-300 flex flex-col gap-2.5 bg-white/[0.02]",
                        isSelected
                          ? "border-cyan-500/60 bg-cyan-500/[0.03] shadow-[0_0_18px_rgba(6,182,212,0.15)]"
                          : "border-white/[0.06] hover:border-white/15 hover:bg-white/[0.04]"
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-black font-bold shadow-glow shadow-cyan-500/30">
                          <CheckCircle2 size={12} />
                        </div>
                      )}

                      <div className="flex justify-between items-start pr-6">
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                            {srv.title}
                            {srv.id === "managed" && (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-gradient-to-r from-purple-500 to-indigo-500 text-white uppercase tracking-wider">
                                <Sparkles size={8} /> Popular
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-slate-500 leading-normal mt-0.5">{srv.description}</p>
                        </div>
                        <div className="text-right">
                          {discountedPrice != null ? (
                            <>
                              <span className="text-xs text-slate-500 line-through block">₹{srv.price}</span>
                              <span className="text-sm font-black text-emerald-400">₹{discountedPrice}</span>
                            </>
                          ) : (
                            <span className="text-sm font-black text-white">₹{srv.price}</span>
                          )}
                          <span className="text-[10px] text-slate-500 block">INR</span>
                        </div>
                      </div>

                      {/* Features */}
                      <ul className="text-[11px] text-slate-400 space-y-1 mt-1 border-t border-white/[0.03] pt-2.5">
                        {srv.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-cyan-400 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {/* ── Coupon Code Section ── */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-4 space-y-3">
                <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  <Ticket size={11} />
                  Promo / Coupon Code
                </label>

                {coupon.status !== "valid" ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        if (coupon.status === "error") {
                          setCoupon((prev) => ({ ...prev, status: "idle", message: null }));
                        }
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                      placeholder="Enter promo code"
                      className="flex-1 h-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition font-mono tracking-wider uppercase"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={!couponInput.trim() || coupon.status === "loading"}
                      className="flex items-center gap-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 px-4 text-sm font-semibold text-cyan-400 transition hover:bg-cyan-500/20 disabled:opacity-50"
                    >
                      {coupon.status === "loading" ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </button>
                  </div>
                ) : (
                  /* Applied coupon chip */
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span className="font-mono text-sm font-bold text-emerald-400 tracking-wider">
                        {coupon.code}
                      </span>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-slate-500 hover:text-white transition"
                      aria-label="Remove coupon"
                    >
                      <XCircle size={15} />
                    </button>
                  </div>
                )}

                {/* Coupon Feedback */}
                {coupon.status === "error" && coupon.message && (
                  <p className="flex items-center gap-1.5 text-xs text-rose-400">
                    <AlertCircle size={12} />
                    {coupon.message}
                  </p>
                )}
                {coupon.status === "valid" && coupon.message && (
                  <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle2 size={12} />
                    {coupon.message}
                  </p>
                )}
              </div>

              {/* Price Summary */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] px-4 py-3 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Plan Price</span>
                  <span>₹{selectedService.price.toLocaleString("en-IN")}</span>
                </div>
                {coupon.status === "valid" && (
                  <div className="flex justify-between text-emerald-400 text-xs mt-1">
                    <span>Discount ({coupon.code})</span>
                    <span>−₹{coupon.discountAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-white mt-2 pt-2 border-t border-white/[0.05]">
                  <span>Total Due</span>
                  <span className={coupon.status === "valid" ? "text-emerald-400" : ""}>
                    ₹{effectivePrice.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {feedback && (
                <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs border bg-rose-500/10 border-rose-500/20 text-rose-400">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  {feedback.message}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("details")}
                  disabled={isPending}
                  className="gap-1 pl-2"
                >
                  <ChevronLeft size={14} />
                  Back
                </Button>
                <Button
                  onClick={handlePaymentSubmit}
                  disabled={isPending}
                  className="bg-cyan-500 text-black hover:bg-cyan-400 font-semibold min-w-[140px] shadow-glow shadow-cyan-500/10"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin mr-1" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Pay ₹{effectivePrice.toLocaleString("en-IN")}
                      <ChevronRight size={14} className="ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Success Screen */}
          {step === "success" && (
            <div className="px-6 py-8 flex flex-col items-center text-center gap-6">
              {/* Animated Glowing Success Badge */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 size={32} className="text-emerald-400" />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white tracking-wide">Payment Confirmed!</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-sm">
                  Your event <span className="text-cyan-400 font-semibold">"{title}"</span> has been created successfully.
                </p>
              </div>

              {/* Receipt Summary Details Box */}
              {invoiceDetails && (
                <div className="w-full bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 text-left text-xs space-y-2">
                  <div className="flex justify-between border-b border-white/[0.04] pb-2">
                    <span className="text-slate-500">Invoice ID</span>
                    <span className="font-mono text-slate-300 font-bold">{invoiceDetails.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.04] pb-2">
                    <span className="text-slate-500">Service Plan</span>
                    <span className="font-semibold text-slate-300 uppercase">
                      {invoiceDetails.serviceType === "self" ? "Self Service" : "Managed Service"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Paid</span>
                    <span className="font-bold text-emerald-400">₹{invoiceDetails.amount.toLocaleString("en-IN")}.00</span>
                  </div>
                </div>
              )}

              {/* Success Screen Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full border-t border-white/[0.05] pt-5">
                <Button
                  onClick={() => setInvoiceOpen(true)}
                  variant="outline"
                  className="flex-1 border-white/10 text-slate-300 hover:bg-white/5 font-semibold py-2.5 rounded-xl gap-2"
                >
                  <Download size={14} />
                  Download Invoice
                </Button>
                <Button
                  onClick={() => {
                    handleClose();
                    window.location.reload();
                  }}
                  className="flex-1 bg-cyan-500 text-black hover:bg-cyan-400 font-bold py-2.5 rounded-xl"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <InvoiceModal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        invoice={invoiceDetails}
      />
    </>
  );
}
