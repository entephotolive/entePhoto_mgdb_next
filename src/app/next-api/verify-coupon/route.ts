import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { CouponModel } from "@/models/Coupon";

const BASE_PRICES: Record<string, number> = {
  self: 2499,
  managed: 3499,
};

export async function POST(request: Request) {
  try {
    const { code, serviceType } = await request.json();

    if (!code || !serviceType) {
      return NextResponse.json(
        { error: "Coupon code and service type are required" },
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

    const coupon = await CouponModel.findOne({
      code: code.trim().toUpperCase(),
    });

    if (!coupon) {
      return NextResponse.json(
        { error: "Coupon code not found" },
        { status: 404 }
      );
    }

    if (!coupon.active) {
      return NextResponse.json(
        { error: "This coupon code is no longer active" },
        { status: 400 }
      );
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return NextResponse.json(
        { error: "This coupon code has expired" },
        { status: 400 }
      );
    }

    if (coupon.maxUses != null && coupon.usesCount >= coupon.maxUses) {
      return NextResponse.json(
        { error: "This coupon code has reached its usage limit" },
        { status: 400 }
      );
    }

    const basePrice = BASE_PRICES[serviceType];

    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = Math.round((basePrice * coupon.discountValue) / 100);
    } else {
      discountAmount = Math.min(coupon.discountValue, basePrice - 1); // never go to 0 or negative
    }

    const finalPrice = basePrice - discountAmount;

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      originalPrice: basePrice,
      finalPrice,
    });
  } catch (error: any) {
    console.error("Coupon verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify coupon" },
      { status: 500 }
    );
  }
}
