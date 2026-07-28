"use server";

import { requireSession } from "@/lib/services/auth.service";
import { connectToDatabase } from "@/lib/db/mongodb";
import { PhotoModel } from "@/models/Photo";
import { revalidatePath } from "next/cache";
import { listPhotosByFolder } from "@/lib/services/photo.service";

export async function updatePhotoStatus(
  photoId: string,
  status: "approved" | "rejected" | "pending",
) {
  try {
    await requireSession();
    await connectToDatabase();
    await PhotoModel.findByIdAndUpdate(photoId, { status });
    revalidatePath("/photographer/gallery");
    return { ok: true };
  } catch (error) {
    console.error("[updatePhotoStatus]", error);
    return { ok: false, error: "Failed to update status" };
  }
}

export async function deletePhotoAction(photoId: string) {
  try {
    await requireSession();
    const conn = await connectToDatabase();
    
    // Convert string ID to ObjectId if possible
    let objectId;
    try {
      // Import Types from mongoose at the top or use mongoose.Types
      const { Types } = await import("mongoose");
      objectId = new Types.ObjectId(photoId);
    } catch {
      objectId = null;
    }

    if (objectId) {
      const db = conn.connection.db;
      if (db) {
        // The photo could be in 'photos' or 'image_with_face'
        await Promise.all([
          db.collection("photos").deleteOne({ _id: objectId }),
          db.collection("image_with_face").deleteOne({ _id: objectId }),
        ]);
      } else {
        await PhotoModel.findByIdAndDelete(photoId);
      }
    } else {
      // Fallback for non-ObjectId
      const db = conn.connection.db;
      if (db) {
        await Promise.all([
          db.collection("photos").deleteOne({ id: Number(photoId) }),
          db.collection("image_with_face").deleteOne({ id: Number(photoId) }),
          db.collection("image_with_face").deleteOne({ image_id: Number(photoId) }),
        ]);
      }
    }

    revalidatePath("/photographer/gallery");
    return { ok: true, message: "Photo deleted successfully" };
  } catch (error) {
    console.error("[deletePhotoAction]", error);
    return { ok: false, error: "Failed to delete photo" };
  }
}

export async function getFolderPhotosPage(
  folderId: string,
  eventId: string,
  cursor?: string | null,
) {
  try {
    await requireSession();
    return await listPhotosByFolder(folderId, eventId, cursor ? { cursor, limit: 40 } : { limit: 40 });
  } catch (error) {
    console.error("[getFolderPhotosPage]", error);
    return { photos: [], nextCursor: null };
  }
}


