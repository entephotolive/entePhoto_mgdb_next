import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { EventModel } from "@/models/Event";
import { PaymentModel } from "@/models/Payment";
import { CouponModel } from "@/models/Coupon";
import { createFolder } from "@/lib/services/folder.service";

const BASE_PRICES: Record<string, number> = {
  self: 2499,
  managed: 3499,
};

export async function POST(request: Request) {
  try {
    const { serviceType, couponCode, eventDetails } = await request.json();

    // 1. Basic validation
    if (
      !serviceType ||
      !couponCode ||
      !eventDetails?.title ||
      !eventDetails?.date ||
      !eventDetails?.location ||
      !eventDetails?.createdBy
    ) {
      return NextResponse.json(
        { error: "Missing required fields for free checkout" },
        { status: 400 }
      );
    }

    if (!["self", "managed"].includes(serviceType)) {
      return NextResponse.json(
        { error: "Invalid service type" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 2. Server-side re-verification: confirm the coupon really results in ₹0
    const coupon = await CouponModel.findOne({
      code: (couponCode as string).trim().toUpperCase(),
      active: true,
    });

    if (!coupon) {
      return NextResponse.json(
        { error: "Coupon is not valid or no longer active" },
        { status: 400 }
      );
    }

    const notExpired = !coupon.expiryDate || new Date(coupon.expiryDate) >= new Date();
    const hasUsesLeft = coupon.maxUses == null || coupon.usesCount < coupon.maxUses;

    if (!notExpired || !hasUsesLeft) {
      return NextResponse.json(
        { error: "Coupon has expired or reached its usage limit" },
        { status: 400 }
      );
    }

    const basePrice = BASE_PRICES[serviceType as string] || 2499;
    let discountAmount = 0;

    if (coupon.discountType === "percentage") {
      discountAmount = Math.round((basePrice * coupon.discountValue) / 100);
    } else {
      discountAmount = Math.min(coupon.discountValue, basePrice);
    }

    const finalPrice = Math.max(basePrice - discountAmount, 0);

    // 3. Security gate — reject if the coupon doesn't actually make it free
    if (finalPrice !== 0) {
      return NextResponse.json(
        { error: "This coupon does not result in a free order. Use the standard checkout." },
        { status: 400 }
      );
    }

    // 4. Create Event
    const event = await EventModel.create({
      title: eventDetails.title,
      date: new Date(eventDetails.date),
      location: eventDetails.location,
      createdBy: eventDetails.createdBy,
    });

    // Automatically create Cover Photo folder
    await createFolder("Cover Photo", event._id.toString(), eventDetails.createdBy);

    // 5. Generate Invoice Number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `EP-${dateStr}-${randomSuffix}`;

    // 6. Create Payment record (amount = 0, no Razorpay IDs)
    const payment = await PaymentModel.create({
      orderId: `free_${Date.now()}`,
      paymentId: `free_${invoiceNumber}`,
      signature: "FREE_COUPON_CHECKOUT",
      amount: 0,
      currency: "INR",
      serviceType,
      createdBy: eventDetails.createdBy,
      eventTitle: eventDetails.title,
      eventId: event._id,
      invoiceNumber,
    });

    // 7. Increment coupon usage
    await CouponModel.findByIdAndUpdate(coupon._id, {
      $inc: { usesCount: 1 },
    });

    // 8. Return invoice details
    return NextResponse.json({
      success: true,
      message: "Free event created successfully via coupon.",
      invoice: {
        invoiceNumber: payment.invoiceNumber,
        date: payment.createdAt,
        amount: 0,
        currency: "INR",
        serviceType,
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
    console.error("Free checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process free checkout" },
      { status: 500 }
    );
  }
}
