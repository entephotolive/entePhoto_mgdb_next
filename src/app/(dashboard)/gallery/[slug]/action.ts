"use server";

import { requireSession } from "@/lib/services/auth.service";
import { connectToDatabase } from "@/lib/db/mongodb";
import { PhotoModel } from "@/models/Photo";
import { revalidatePath } from "next/cache";


export async function updatePhotoStatus(
  photoId: string,
  status: "approved" | "rejected" | "pending",
) {
  try {
    await requireSession();
    await connectToDatabase();
    await PhotoModel.findByIdAndUpdate(photoId, { status });
    revalidatePath("/gallery");
    return { ok: true };
  } catch (error) {
    console.error("[updatePhotoStatus]", error);
    return { ok: false, error: "Failed to update status" };
  }
}
