import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { connectToDatabase } from "@/lib/db/mongodb";
import { CouponModel } from "@/models/Coupon";

const BASE_PRICES: Record<string, number> = {
  self: 2499,
  managed: 3499,
};

export async function POST(request: Request) {
  try {
    const { serviceType, couponCode } = await request.json();

    if (!serviceType || !["self", "managed"].includes(serviceType)) {
      return NextResponse.json(
        { error: "Invalid service type selected" },
        { status: 400 }
      );
    }

    const basePrice = BASE_PRICES[serviceType]; // in rupees
    let finalPrice = basePrice;
    let appliedCoupon: string | null = null;
    let discountAmount = 0;

    // Securely resolve coupon discount on the server — never trust the client
    if (couponCode) {
      await connectToDatabase();
      const coupon = await CouponModel.findOne({
        code: couponCode.trim().toUpperCase(),
        active: true,
      });

      if (coupon) {
        const notExpired = !coupon.expiryDate || new Date(coupon.expiryDate) >= new Date();
        const hasUsesLeft = coupon.maxUses == null || coupon.usesCount < coupon.maxUses;

        if (notExpired && hasUsesLeft) {
          if (coupon.discountType === "percentage") {
            // Allow 100% — results in finalPrice = 0 (handled below)
            discountAmount = Math.round((basePrice * coupon.discountValue) / 100);
          } else {
            // Fixed: clamp so it can reach 0 but not go negative
            discountAmount = Math.min(coupon.discountValue, basePrice);
          }
          finalPrice = Math.max(basePrice - discountAmount, 0);
          appliedCoupon = coupon.code;
        }
      }
    }

    // ── FREE CHECKOUT ─────────────────────────────────────────────────────────
    // If the coupon makes it entirely free, skip Razorpay (minimum is ₹1).
    // Return a flag so the frontend calls /api/free-checkout directly instead.
    if (finalPrice === 0) {
      return NextResponse.json({
        free: true,
        serviceType,
        appliedCoupon,
        originalPrice: basePrice,
        finalPrice: 0,
        discountAmount,
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    const amountInPaise = finalPrice * 100; // guaranteed > 0 here

    const instance = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID as string,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });

    const order = await instance.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    });

    return NextResponse.json({
      free: false,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      serviceType,
      appliedCoupon,
      originalPrice: basePrice,
      finalPrice,
      discountAmount,
    });
  } catch (error: any) {
    console.error("Razorpay order creation error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
