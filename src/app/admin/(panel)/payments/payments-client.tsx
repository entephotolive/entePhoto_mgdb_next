"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  CreditCard,
  Calendar,
  Camera,
  Download,
  Copy,
  Check,
  FileText,
  AlertCircle,
} from "lucide-react";
import { InvoiceModal, InvoiceData } from "@/components/feature-specific/invoice/invoice-modal";

interface PaymentsClientProps {
  payments: Array<{
    _id: string;
    orderId: string;
    paymentId: string;
    amount: number;
    currency: string;
    serviceType: "self" | "managed";
    eventTitle: string;
    eventId: string;
    invoiceNumber: string;
    createdAt: string;
    photographer: {
      name: string;
      email: string;
    };
  }>;
}

export function PaymentsClient({ payments }: PaymentsClientProps) {
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Invoice viewing state
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const filtered = payments.filter((p) => {
    const s = search.toLowerCase();
    return (
      p.invoiceNumber.toLowerCase().includes(s) ||
      p.photographer.name.toLowerCase().includes(s) ||
      p.photographer.email.toLowerCase().includes(s) ||
      p.eventTitle.toLowerCase().includes(s) ||
      p.paymentId.toLowerCase().includes(s)
    );
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleViewInvoice = (p: typeof payments[0]) => {
    setSelectedInvoice({
      invoiceNumber: p.invoiceNumber,
      date: p.createdAt,
      amount: p.amount,
      currency: p.currency,
      serviceType: p.serviceType,
      paymentId: p.paymentId,
      orderId: p.orderId,
      event: {
        title: p.eventTitle,
        date: p.createdAt, // fallback event date
        location: "EntePhoto Cloud Portal", // generic location
      },
    });
    setInvoiceOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Search Filter Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payments, photographers, events..."
            className="h-11 w-full rounded-xl border border-white/10 bg-[#081b24] pl-11 pr-4 text-sm text-white placeholder-slate-500 transition-focus outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing {filtered.length} of {payments.length} transactions
        </div>
      </div>

      {/* Ledger Table */}
      <Card variant="glass" className="overflow-hidden border-white/5 bg-[#081b24]/30 p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Photographer
                </th>
                <th className="px-6 py-4.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Event Title
                </th>
                <th className="px-6 py-4.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Receipt ID
                </th>
                <th className="px-6 py-4.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Plan &amp; Amount
                </th>
                <th className="px-6 py-4.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Payment Details
                </th>
                <th className="px-6 py-4.5 text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">
                  Invoice
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-6 w-6 text-slate-600" />
                      <span>No transactions found matching your criteria.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p._id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Photographer */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-white/10">
                          <AvatarFallback className="bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                            {p.photographer.name?.charAt(0) || "P"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm text-white">{p.photographer.name}</p>
                          <p className="text-xs text-slate-500">{p.photographer.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Event */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Camera className="h-4 w-4 text-cyan-400 shrink-0" />
                        <span className="font-medium truncate max-w-[180px]">{p.eventTitle}</span>
                      </div>
                    </td>

                    {/* Receipt ID */}
                    <td className="px-6 py-4 font-mono text-xs text-slate-300 font-bold">
                      {p.invoiceNumber}
                    </td>

                    {/* Plan & Amount */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-white">₹{p.amount.toLocaleString("en-IN")}</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase">{p.currency}</span>
                        </div>
                        <div>
                          <Badge
                            variant="secondary"
                            className={
                              p.serviceType === "managed"
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px]"
                                : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px]"
                            }
                          >
                            {p.serviceType === "managed" ? "Managed" : "Self Service"}
                          </Badge>
                        </div>
                      </div>
                    </td>

                    {/* Transaction Details */}
                    <td className="px-6 py-4 text-xs text-slate-400">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Payment:</span>
                          <span className="font-mono text-slate-300 truncate max-w-[100px]">{p.paymentId}</span>
                          <button
                            onClick={() => handleCopy(p.paymentId, p._id + "pay")}
                            className="text-slate-600 hover:text-white transition-colors"
                          >
                            {copiedId === p._id + "pay" ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(p.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}</span>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleViewInvoice(p)}
                        className="inline-flex items-center justify-center rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20 transition hover:bg-emerald-500/20"
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <InvoiceModal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        invoice={selectedInvoice}
      />
    </div>
  );
}
