"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  AVATAR_TRANSFORM,
  PORTFOLIO_TRANSFORM,
} from "@/lib/cloudinary-config";
import { fetchProfileById, patchProfile } from "@/lib/services/profile.service";
import {
  fetchPortfolioByUser,
  insertPortfolioMoment,
  deletePortfolioMomentById,
} from "@/lib/services/portfolio.service";
import { getEventById } from "@/lib/services/event.service";
import { ProfileData, PortfolioMoment } from "@/types";

// ─── Zod schema ────────────────────────────────────────────────────────────
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
  studioName: z.string().max(100).optional(),
  studioLocation: z.string().max(120).optional(),
  specialization: z.string().optional(),
  specializations: z.array(z.string()).optional(),
  bio: z.string().max(600).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

// ─── Action return type ─────────────────────────────────────────────────────
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ─── getProfile ─────────────────────────────────────────────────────────────
export async function getProfile(userId: string): Promise<ProfileData | null> {
  return fetchProfileById(userId);
}

// ─── updateProfile ──────────────────────────────────────────────────────────
export async function updateProfile(
  userId: string,
  raw: {
    name: string;
    studioName?: string;
    studioLocation?: string;
    specialization?: string;
    specializations?: string[];
    bio?: string;
    avatarUrl?: string;
  }
): Promise<ActionResult<ProfileData>> {
  const parsed = profileSchema.safeParse(raw);

  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join(", ");
    return { ok: false, error: message };
  }

  try {
    const updated = await patchProfile(userId, parsed.data);
    if (!updated) return { ok: false, error: "User not found." };
    revalidatePath("/profile");
    return { ok: true, data: updated };
  } catch (err) {
    console.error("[updateProfile]", err);
    return { ok: false, error: "Failed to update profile. Please try again." };
  }
}

// ─── uploadProfileImage ─────────────────────────────────────────────────────
export async function uploadProfileImage(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const file = formData.get("file") as File | null;

  // Client compresses to ~150–700 KB before this action is called.
  // We still cap at 4 MB as a server-side safety net.
  if (!file || file.size === 0) return { ok: false, error: "No file provided." };
  if (file.size > 4 * 1024 * 1024)
    return { ok: false, error: "File must be smaller than 4 MB." };

  try {
    const result = await uploadToCloudinary(file, {
      folder: "photo-ceremony/avatars",
      transformation: AVATAR_TRANSFORM,
    });
    return { ok: true, data: { url: result.secure_url } };
  } catch (err) {
    console.error("[uploadProfileImage]", err);
    return { ok: false, error: "Image upload failed. Please try again." };
  }
}

// ─── getPortfolioMoments ────────────────────────────────────────────────────
export async function getPortfolioMoments(userId: string): Promise<PortfolioMoment[]> {
  return fetchPortfolioByUser(userId);
}

// ─── addPortfolioMoment ─────────────────────────────────────────────────────
// Uploads to Cloudinary → saves to MongoDB → returns saved moment
export async function addPortfolioMoment(
  userId: string,
  formData: FormData
): Promise<ActionResult<PortfolioMoment>> {
  const file = formData.get("file") as File | null;
  const caption = (formData.get("caption") as string) ?? "";

  // Client compresses to ~150–700 KB before this action is called.
  // We still cap at 4 MB as a server-side safety net.
  if (!file || file.size === 0) return { ok: false, error: "No file provided." };
  if (file.size > 4 * 1024 * 1024)
    return { ok: false, error: "File must be smaller than 4 MB." };

  try {
    const uploaded = await uploadToCloudinary(file, {
      folder: "photo-ceremony/portfolio",
      transformation: PORTFOLIO_TRANSFORM,
    });

    const saved = await insertPortfolioMoment(
      userId,
      uploaded.secure_url,
      uploaded.public_id,
      caption
    );

    revalidatePath("/profile");
    return { ok: true, data: saved };
  } catch (err) {
    console.error("[addPortfolioMoment]", err);
    return { ok: false, error: "Portfolio upload failed. Please try again." };
  }
}

// ─── deletePortfolioMoment ──────────────────────────────────────────────────
// Deletes from MongoDB (ownership-checked) → then removes from Cloudinary
export async function deletePortfolioMoment(
  momentId: string,
  userId: string
): Promise<ActionResult> {
  try {
    const deleted = await deletePortfolioMomentById(momentId, userId);

    if (!deleted) {
      return { ok: false, error: "Moment not found or not owned by you." };
    }

    // Best-effort Cloudinary delete — swallows errors internally
    await deleteFromCloudinary(deleted.publicId);

    revalidatePath("/profile");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("[deletePortfolioMoment]", err);
    return { ok: false, error: "Failed to delete moment. Please try again." };
  }
}

// ─── getStudioByEventId ─────────────────────────────────────────────────────
export async function getStudioByEventId(eventId: string) {
  try {
    const event = await getEventById(eventId);
    if (!event || !event.createdBy?.id) return null;

    const [profile, portfolio] = await Promise.all([
      fetchProfileById(event.createdBy.id),
      fetchPortfolioByUser(event.createdBy.id),
    ]);

    return { profile, portfolio };
  } catch (err) {
    console.error("[getStudioByEventId]", err);
    return null;
  }
}
