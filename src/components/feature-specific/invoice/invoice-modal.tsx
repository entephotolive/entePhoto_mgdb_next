"use client";

import { useRef, useState } from "react";
import { X, Download, Printer, CheckCircle } from "lucide-react";
import { toPng } from "html-to-image";
import { cn } from "@/lib/utils/cn";

export interface InvoiceData {
  invoiceNumber: string;
  date: string | Date;
  amount: number;
  currency: string;
  serviceType: "self" | "managed";
  paymentId: string;
  orderId: string;
  photographerName?: string;
  photographerEmail?: string;
  event: {
    title: string;
    date: string | Date;
    location: string;
  };
}

interface InvoiceModalProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceData | null;
}

export function InvoiceModal({ open, onClose, invoice }: InvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  if (!open || !invoice) return null;

  const formattedDate = new Date(invoice.date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const formattedEventDate = new Date(invoice.event.date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const serviceTitle =
    invoice.serviceType === "self"
      ? "Self Service - EntePhoto"
      : "Managed Service - EntePhoto";

  const serviceDesc =
    invoice.serviceType === "self"
      ? "Client uploads and manages photos themselves using advanced AI face scanner."
      : "Full operational handling and photo management by an assigned EntePhoto professional.";

  const downloadInvoice = async () => {
    if (!invoiceRef.current) return;
    try {
      setDownloading(true);
      // Wait for font loading/rendering
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      const dataUrl = await toPng(invoiceRef.current, {
        backgroundColor: "#ffffff",
        style: {
          color: "#000000",
          transform: "scale(1)",
        },
        quality: 0.95,
      });

      const link = document.createElement("a");
      link.download = `Invoice-${invoice.invoiceNumber}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to download invoice:", error);
      alert("Failed to download invoice image. Please try standard print (PDF) instead.");
    } finally {
      setDownloading(false);
    }
  };

  const printInvoice = () => {
    window.print();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Invoice CSS Overrides for print layout */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-invoice-section, #print-invoice-section * {
            visibility: visible;
          }
          #print-invoice-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 20px !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Modal Container */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border border-white/[0.08] bg-[#0c0d12] shadow-2xl shadow-cyan-950/20 pointer-events-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header Controls */}
          <div className="no-print flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-cyan-400" />
              <span className="text-sm font-semibold text-slate-200">EntePhoto Receipt</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={downloadInvoice}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300 transition-colors disabled:opacity-50"
              >
                <Download size={13} />
                {downloading ? "Saving..." : "Download"}
              </button>
              <button
                onClick={printInvoice}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 border border-white/10 hover:bg-white/5 transition-colors"
              >
                <Printer size={13} />
                Print / PDF
              </button>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                aria-label="Close modal"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Scrollable Modal Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0c0d12] text-slate-300 no-print">
            <p className="text-xs text-slate-500 mb-6 text-center">
              A preview of your invoice is loaded below. You can print, download, or save this receipt at any time.
            </p>

            {/* Printable Invoice Container */}
            <div
              id="print-invoice-section"
              ref={invoiceRef}
              className="w-full bg-white text-black p-6 md:p-10 rounded-2xl shadow-xl font-sans"
              style={{ color: "#000000", backgroundColor: "#ffffff" }}
            >
              {/* Top Row: Brand & Title */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-cyan-600">ENTEPHOTO</h1>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Premium Photography Galleries</p>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-bold text-slate-800">TAX INVOICE</h2>
                  <p className="text-xs text-slate-500 font-mono">{invoice.invoiceNumber}</p>
                </div>
              </div>

              {/* Grid: Invoice Details */}
              <div className="grid grid-cols-2 gap-6 text-xs mb-8">
                <div>
                  <p className="font-bold text-slate-800 mb-1">BILL FROM</p>
                  <p className="font-semibold text-slate-700">EntePhoto Technologies Pvt. Ltd.</p>
                  <p className="text-slate-500">Corporate HQ, Cyber City</p>
                  <p className="text-slate-500">Kerala, India</p>
                  <p className="text-slate-500">support@entephoto.co.in</p>
                </div>
                <div>
                  <p className="font-bold text-slate-800 mb-1">BILL TO</p>
                  <p className="font-semibold text-slate-700">{invoice.photographerName || "Premium Creator"}</p>
                  <p className="text-slate-500">{invoice.photographerEmail || "photographer@entephoto.co.in"}</p>
                  <p className="text-slate-500">Photographer Panel Member</p>
                </div>
              </div>

              {/* Metadata details row */}
              <div className="grid grid-cols-4 gap-4 text-xs border-y border-slate-100 py-4 mb-8 bg-slate-50 p-4 rounded-xl">
                <div>
                  <p className="text-slate-400 font-semibold mb-0.5">DATE OF ISSUE</p>
                  <p className="font-bold text-slate-800">{formattedDate}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold mb-0.5">PAYMENT METHOD</p>
                  <p className="font-bold text-slate-800">Razorpay standard</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold mb-0.5">TRANSACTION ID</p>
                  <p className="font-mono font-bold text-slate-800 break-all">{invoice.paymentId}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-semibold mb-0.5">STATUS</p>
                  <p className="font-bold text-emerald-600 uppercase">Paid</p>
                </div>
              </div>

              {/* Event specific billing box */}
              <div className="mb-8 border border-slate-200/60 rounded-xl p-4 bg-slate-50/50">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Event Schedule Log</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">Title</span>
                    <span className="font-semibold text-slate-800">{invoice.event.title}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Date</span>
                    <span className="font-semibold text-slate-800">{formattedEventDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Location</span>
                    <span className="font-semibold text-slate-800">{invoice.event.location}</span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-xs text-left mb-8 border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-slate-400 font-bold">
                    <th className="py-2 pl-1">DESCRIPTION</th>
                    <th className="py-2 text-right">QTY</th>
                    <th className="py-2 text-right pr-1">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-4 pl-1">
                      <p className="font-bold text-slate-800">{serviceTitle}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 max-w-sm leading-relaxed">{serviceDesc}</p>
                    </td>
                    <td className="py-4 text-right font-medium text-slate-700">1</td>
                    <td className="py-4 text-right font-bold text-slate-800 pr-1">₹{invoice.amount.toLocaleString("en-IN")}.00</td>
                  </tr>
                </tbody>
              </table>

              {/* Calculation Summary */}
              <div className="flex justify-end text-xs">
                <div className="w-64 space-y-2 border-t border-slate-200 pt-4">
                  <div className="flex justify-between font-medium text-slate-500">
                    <span>Subtotal</span>
                    <span>₹{invoice.amount.toLocaleString("en-IN")}.00</span>
                  </div>
                  <div className="flex justify-between font-medium text-slate-500">
                    <span>GST (0% Zero Rated)</span>
                    <span>₹0.00</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-sm text-slate-800">
                    <span>Grand Total</span>
                    <span>₹{invoice.amount.toLocaleString("en-IN")}.00</span>
                  </div>
                </div>
              </div>

              {/* Footer Terms */}
              <div className="border-t border-slate-100 pt-6 mt-10 text-[9px] text-slate-400 text-center leading-relaxed">
                <p className="font-semibold text-slate-500 mb-1">Thank you for choosing EntePhoto!</p>
                <p>This is a system generated e-invoice. No signature is required. For full terms of service and billing inquiries, visit our support portal.</p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
