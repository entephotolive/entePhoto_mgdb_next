"use client";

import { useState } from "react";
import { CreditCard, CalendarDays, ExternalLink, ShieldCheck } from "lucide-react";
import { InvoiceModal, InvoiceData } from "@/components/feature-specific/invoice/invoice-modal";
import { cn } from "@/lib/utils/cn";

interface PaymentHistoryProps {
  payments: any[];
  photographerName: string;
  photographerEmail: string;
}

export function PaymentHistory({
  payments,
  photographerName,
  photographerEmail,
}: PaymentHistoryProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const handleInvoiceClick = (payment: any) => {
    const invoiceData: InvoiceData = {
      invoiceNumber: payment.invoiceNumber,
      date: payment.createdAt,
      amount: payment.amount,
      currency: payment.currency || "INR",
      serviceType: payment.serviceType,
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      photographerName: photographerName,
      photographerEmail: photographerEmail,
      event: {
        title: payment.eventTitle,
        date: payment.createdAt, // approximation or actual event date if we populate it
        location: "EntePhoto Platform", // fallback or populate if stored
      },
    };
    setSelectedInvoice(invoiceData);
    setInvoiceModalOpen(true);
  };

  return (
    <>
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm p-6 flex flex-col gap-6 w-full xl:col-span-2">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <CreditCard size={16} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Payment & Billing History</h2>
              <p className="text-xs text-slate-500">Manage invoices and review transaction logs</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 uppercase">
            <ShieldCheck size={11} />
            Secure Razorpay integration
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
              <CalendarDays size={18} className="text-slate-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-400 mb-1">No payments logged</h3>
            <p className="text-xs text-slate-600 max-w-xs">
              Once you create events using premium packages, your invoices will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <th className="pb-3 pl-2">Date</th>
                  <th className="pb-3">Event Title</th>
                  <th className="pb-3">Service Tier</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Invoice ID</th>
                  <th className="pb-3 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {payments.map((payment) => {
                  const formattedDate = new Date(payment.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <tr
                      key={payment._id}
                      className="group hover:bg-white/[0.01] transition-colors text-sm"
                    >
                      <td className="py-3.5 pl-2 font-medium text-slate-400">
                        {formattedDate}
                      </td>
                      <td className="py-3.5 font-semibold text-slate-200">
                        {payment.eventTitle}
                      </td>
                      <td className="py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border",
                            payment.serviceType === "self"
                              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                              : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                          )}
                        >
                          {payment.serviceType === "self" ? "Self Service" : "Managed Service"}
                        </span>
                      </td>
                      <td className="py-3.5 font-bold text-slate-200">
                        ₹{payment.amount.toLocaleString("en-IN")}.00
                      </td>
                      <td className="py-3.5 font-mono text-xs text-slate-500">
                        {payment.invoiceNumber}
                      </td>
                      <td className="py-3.5 pr-2 text-right">
                        <button
                          onClick={() => handleInvoiceClick(payment)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all active:scale-95"
                        >
                          Invoice
                          <ExternalLink size={11} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InvoiceModal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        invoice={selectedInvoice}
      />
    </>
  );
}
