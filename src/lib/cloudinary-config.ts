/**
 * lib/cloudinary-config.ts  ← SERVER ONLY
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source-of-truth for the Cloudinary v2 SDK.
 *
 * Why a shared module?
 *   • Avoids repeating cloudinary.config() in every server action / API route.
 *   • Centralises transform presets so every upload is consistent.
 *   • The "server-only" guard prevents this from accidentally landing in the
 *     client bundle (which would expose CLOUDINARY_API_SECRET).
 *
 * Usage in any Server Action or API Route:
 *   import { cloudinary, uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary-config";
 */

import "server-only";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

// ── One-time SDK configuration ────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

export { cloudinary };

// ── Transform presets ─────────────────────────────────────────────────────────

/** Avatar: 400×400 face-crop, auto format & quality. */
export const AVATAR_TRANSFORM = [
  { width: 400, height: 400, crop: "fill" as const, gravity: "face" as const },
  { quality: "auto" as const, fetch_format: "auto" as const },
];

/** Portfolio moment: max 1200px wide, auto quality + format. */
export const PORTFOLIO_TRANSFORM = [
  { width: 1200, crop: "limit" as const, quality: "auto:best" as const },
  { fetch_format: "auto" as const },
];

/**
 * Event photo — used in the signed-upload flow (use-file-upload.ts).
 * Applied server-side as an incoming transformation string.
 */
export const EVENT_TRANSFORM_STRING = "w_1920,c_limit,q_auto,f_webp";

// ── Shared helpers ────────────────────────────────────────────────────────────

interface UploadOptions {
  folder: string;
  transformation?: object[];
}

/**
 * uploadToCloudinary
 * Reads a File (from FormData), encodes it as a base64 data URI, and uploads
 * it to Cloudinary.  Returns the full UploadApiResponse so callers can access
 * `secure_url`, `public_id`, dimensions, etc.
 *
 * Compression notes:
 *   • The client already shrinks images via compress-image.ts before sending.
 *   • Cloudinary's `transformation` further optimises on their CDN edge.
 *   • Together these ensure both the Server Action body and the stored asset
 *     are small even if the photographer uploads a 20 MB RAW export.
 */
export async function uploadToCloudinary(
  file: File,
  options: UploadOptions
): Promise<UploadApiResponse> {
  const buffer = Buffer.from(await file.arrayBuffer()).toString("base64");
  const dataUri = `data:${file.type};base64,${buffer}`;

  return cloudinary.uploader.upload(dataUri, {
    folder: options.folder,
    transformation: options.transformation,
  });
}

/**
 * deleteFromCloudinary
 * Best-effort asset removal.  Swallows errors and logs a warning so callers
 * can safely use fire-and-forget patterns without crashing the request.
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn("[cloudinary-config] destroy() failed for", publicId, err);
  }
}

/**
 * deleteEventFolderFromCloudinary
 * Deletes all resources in Cloudinary that match the event's prefix path.
 * This cleanly removes the entire gallery for an event in one API call.
 */
export async function deleteEventFolderFromCloudinary(eventId: string): Promise<void> {
  const prefix = `photo-ceremony/events/${eventId}`;
  try {
    await cloudinary.api.delete_resources_by_prefix(prefix);
  } catch (err) {
    console.warn("[cloudinary-config] deleteEventFolderFromCloudinary failed for prefix:", prefix, err);
  }
}
