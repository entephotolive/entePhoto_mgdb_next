"use server";

import { connectToDatabase } from "@/lib/db/mongodb";
import { CouponModel } from "@/models/Coupon";
import { revalidatePath } from "next/cache";

export interface CouponItem {
  _id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxUses: number | null;
  usesCount: number;
  expiryDate: string | null;
  active: boolean;
  createdAt: string | null;
}

export async function fetchCoupons(): Promise<CouponItem[]> {
  await connectToDatabase();
  const coupons = await CouponModel.find().sort({ createdAt: -1 }).lean();
  
  return coupons.map((c) => ({
    _id: String(c._id),
    code: c.code,
    discountType: c.discountType as "percentage" | "fixed",
    discountValue: c.discountValue,
    maxUses: c.maxUses ?? null,
    usesCount: c.usesCount ?? 0,
    expiryDate: c.expiryDate ? new Date(c.expiryDate).toISOString() : null,
    active: c.active ?? true,
    createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : null,
  }));
}

export async function createCoupon(data: {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxUses?: number;
  expiryDate?: string;
}) {
  try {
    await connectToDatabase();
    
    const codeUpper = data.code.trim().toUpperCase();
    if (!codeUpper) {
      throw new Error("Coupon code is required");
    }
    
    const existing = await CouponModel.findOne({ code: codeUpper });
    if (existing) {
      throw new Error("A coupon with this code already exists");
    }

    if (data.discountValue <= 0) {
      throw new Error("Discount value must be greater than 0");
    }

    if (data.discountType === "percentage" && data.discountValue > 100) {
      throw new Error("Percentage discount cannot exceed 100%");
    }

    await CouponModel.create({
      code: codeUpper,
      discountType: data.discountType,
      discountValue: data.discountValue,
      maxUses: data.maxUses || undefined,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      active: true,
    });

    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create coupon" };
  }
}

export async function toggleCouponActive(couponId: string, currentStatus: boolean) {
  try {
    await connectToDatabase();
    await CouponModel.findByIdAndUpdate(couponId, { active: !currentStatus });
    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to toggle status" };
  }
}

export async function deleteCoupon(couponId: string) {
  try {
    await connectToDatabase();
    await CouponModel.findByIdAndDelete(couponId);
    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete coupon" };
  }
}
