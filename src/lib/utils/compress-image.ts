/**
 * lib/utils/compress-image.ts  ← CLIENT ONLY (uses browser Canvas API)
 * ─────────────────────────────────────────────────────────────────────────────
 * Shrinks an image File before it is sent through a Next.js Server Action.
 *
 * Why client-side compression?
 *   Next.js Server Actions have a 1 MB body limit by default.
 *   A typical photographer JPEG is 3–25 MB, which causes the error:
 *     “Body exceeded 1 MB limit”
 *   Compressing on the client (canvas → WebP) brings the payload to
 *   under 3 MB before a single byte hits the server.
 *
 * Quality targets (approximate WebP output size):
 *   maxDimension: 1920, quality: 0.90 → ~1–3 MB   ← default (portrait/portfolio)
 *   maxDimension:  900, quality: 0.80 → ~150–700 KB (thumbnails/avatars)
 *
 * This is complementary to Cloudinary’s server-side transformations:
 *   1. compress-image.ts   → small payload that fits through the Server Action
 *   2. PORTFOLIO_TRANSFORM  → high-quality CDN-optimised version stored in cloud
 *
 * Usage:
 *   import { compressImage, PRESET_3MB, PRESET_AVATAR } from "@/lib/utils/compress-image";
 *
 *   const compressed = await compressImage(file);                // default ≤ 3 MB
 *   const avatar     = await compressImage(file, PRESET_AVATAR); // ≤ 700 KB
 */

export interface CompressOptions {
  /** Maximum width OR height in pixels (aspect ratio preserved). Default: 1920 */
  maxDimension?: number;
  /** Encode quality 0.0 to 1.0, or "auto" to let the browser decide. Default: "auto" */
  quality?: number | "auto";
  /** Output MIME type. Default: "image/webp" */
  mimeType?: "image/webp" | "image/jpeg";
}

/**
 * Named presets — import and pass directly to compressImage().
 *
 * PRESET_3MB   → max 1920px, auto quality  → ~1–3 MB   (portfolio / full-res images)
 * PRESET_AVATAR → max  900px, auto quality  → ~150–700 KB (profile pictures)
 */
export const PRESET_3MB: CompressOptions = {
  maxDimension: 1920,
  quality: "auto",
  mimeType: "image/webp",
};

export const PRESET_AVATAR: CompressOptions = {
  maxDimension: 900,
  quality: "auto",
  mimeType: "image/webp",
};

/**
 * compressImage
 * Draws the source image onto an off-screen canvas at reduced dimensions,
 * then exports as a new File (WebP by default).
 */
export function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxDimension = 1920,   // targets ~1–3 MB portrait/full-res images
    quality = "auto",
    mimeType = "image/webp",
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // ── Scale down, keeping aspect ratio ──────────────────────────────────
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height / width) * maxDimension);
          width = maxDimension;
        } else {
          width = Math.round((width / height) * maxDimension);
          height = maxDimension;
        }
      }

      // ── Render on canvas ──────────────────────────────────────────────────
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      // ── Export as Blob → File ─────────────────────────────────────────────
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("canvas.toBlob() returned null"));
            return;
          }
          const ext = mimeType === "image/webp" ? "webp" : "jpg";
          const baseName = file.name.replace(/\.[^.]+$/, "");
          resolve(
            new File([blob], `${baseName}.${ext}`, {
              type: mimeType,
              lastModified: Date.now(),
            })
          );
        },
        mimeType,
        // If "auto", pass undefined so the browser uses its own optimized default
        quality === "auto" ? undefined : (quality as any)
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to decode image "${file.name}"`));
    };

    img.src = objectUrl;
  });
}
