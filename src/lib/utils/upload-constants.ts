/**
 * lib/utils/upload-constants.ts
 * ─────────────────────────────────────────────────────────────────
 * Single source of truth for upload-related limits and time windows.
 * Import this file in both client code (store, UI labels) and server
 * code (event.service, photo.service) so the values can never drift.
 */

// ── File size ─────────────────────────────────────────────────────
/**
 * Maximum file size accepted by the client-side validator.
 * Modern phone photos (ProRAW, HEIF at full resolution) can exceed 15 MB,
 * so 50 MB gives ample headroom while still blocking absurdly large files.
 * THE SERVER ENDPOINT MUST ENFORCE THE SAME LIMIT.
 */
export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_UPLOAD_SIZE_MB = 50;

// ── Accepted MIME types ───────────────────────────────────────────
/**
 * Whitelist of MIME types accepted by the upload store and file input.
 * image/heic and image/heif are listed for Android/desktop Chrome;
 * Safari on iOS auto-converts HEIC → JPEG before the File API sees it.
 */
export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
] as const;

export const ALLOWED_FILE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".heic",
  ".heif",
] as const;

export type AllowedUploadType = (typeof ALLOWED_UPLOAD_TYPES)[number];

/**
 * Validates a file against allowed MIME types and file extension fallbacks
 * (handling iOS Safari/Share sheet edge cases where file.type is empty or generic).
 */
export function isAllowedFile(file: File): boolean {
  if (ALLOWED_UPLOAD_TYPES.includes(file.type as any)) {
    return true;
  }
  const name = file.name.toLowerCase();
  return ALLOWED_FILE_EXTENSIONS.some((ext) => name.endsWith(ext));
}


// ── Event upload window ───────────────────────────────────────────
/**
 * The strict upload window for an event.
 *
 * Uploads are ONLY allowed during this exact window:
 *   [event start time, event start time + EVENT_UPLOAD_WINDOW_MS]
 *
 * Both bounds are enforced:
 *  • Before event starts  → blocked (event not started yet)
 *  • After window closes  → blocked (upload window closed)
 *
 * This constant is used by:
 *  • upload-workspace.tsx  — client-side isEventActive() guard
 *  • photo.service.ts      — server-side createPhoto() guard
 *
 * Keep both in sync by always importing from this file.
 */
export const EVENT_UPLOAD_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/** @deprecated Use EVENT_UPLOAD_WINDOW_MS. Kept temporarily to avoid missing imports. */
export const EVENT_UPLOAD_GRACE_PERIOD_MS = EVENT_UPLOAD_WINDOW_MS;
