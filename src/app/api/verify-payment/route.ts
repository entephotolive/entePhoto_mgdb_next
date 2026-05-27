import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db/mongodb";
import { EventModel } from "@/models/Event";
import { PaymentModel } from "@/models/Payment";
import { CouponModel } from "@/models/Coupon";

const BASE_PRICES: Record<string, number> = {
  self: 2499,
  managed: 3499,
};

export async function POST(request: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      serviceType,
      eventDetails,
      couponCode,
    } = await request.json();

    // 1. Validation
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !serviceType ||
      !eventDetails ||
      !eventDetails.title ||
      !eventDetails.date ||
      !eventDetails.location ||
      !eventDetails.createdBy
    ) {
      return NextResponse.json(
        { error: "Missing required fields or event details" },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // 2. Cryptographic Signature Verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return NextResponse.json(
        { error: "Invalid payment signature verification failed" },
        { status: 400 }
      );
    }

    // 3. Database Connection
    await connectToDatabase();

    // 4. Securely recalculate the actual amount paid (including coupon)
    const basePrice = BASE_PRICES[serviceType as string] || 2499;
    let finalAmount = basePrice;
    let couponDoc: (typeof CouponModel.prototype) | null = null;

    if (couponCode) {
      couponDoc = await CouponModel.findOne({
        code: (couponCode as string).trim().toUpperCase(),
        active: true,
      });

      if (couponDoc) {
        const notExpired = !couponDoc.expiryDate || new Date(couponDoc.expiryDate) >= new Date();
        const hasUsesLeft = couponDoc.maxUses == null || couponDoc.usesCount < couponDoc.maxUses;

        if (notExpired && hasUsesLeft) {
          let discountAmount = 0;
          if (couponDoc.discountType === "percentage") {
            discountAmount = Math.round((basePrice * couponDoc.discountValue) / 100);
          } else {
            discountAmount = Math.min(couponDoc.discountValue, basePrice - 1);
          }
          finalAmount = basePrice - discountAmount;
        }
      }
    }

    // 5. Create Event Document in MongoDB
    const event = await EventModel.create({
      title: eventDetails.title,
      date: new Date(eventDetails.date),
      location: eventDetails.location,
      createdBy: eventDetails.createdBy,
    });

    // 6. Generate Unique Invoice Number (Format: EP-YYYYMMDD-XXXX)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `EP-${dateStr}-${randomSuffix}`;

    // 7. Create Mongoose Payment Record
    const payment = await PaymentModel.create({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      amount: finalAmount,
      currency: "INR",
      serviceType: serviceType,
      createdBy: eventDetails.createdBy,
      eventTitle: eventDetails.title,
      eventId: event._id,
      invoiceNumber: invoiceNumber,
    });

    // 8. Increment coupon usage count (after successful payment)
    if (couponDoc) {
      await CouponModel.findByIdAndUpdate(couponDoc._id, {
        $inc: { usesCount: 1 },
      });
    }

    // 9. Return detailed billing/invoice details
    return NextResponse.json({
      success: true,
      message: "Payment verified, event and receipt created successfully.",
      invoice: {
        invoiceNumber: payment.invoiceNumber,
        date: payment.createdAt,
        amount: payment.amount,
        currency: payment.currency,
        serviceType: payment.serviceType,
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        event: {
          id: event._id.toString(),
          title: event.title,
          date: event.date,
          location: event.location,
        },
      },
    });
  } catch (error: any) {
    console.error("Payment verification and DB logging error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process payment verification" },
      { status: 500 }
    );
  }
}
