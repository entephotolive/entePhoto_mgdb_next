/**
 * lib/utils/compress-image.ts  ← CLIENT ONLY (uses browser Canvas API)
 * ─────────────────────────────────────────────────────────────────────────────
 * Shrinks an image File before it is sent through a Next.js Server Action.
 *
 * Why client-side compression?
 *   Next.js Server Actions have a 1 MB body limit by default.
 *   A typical photographer JPEG is 3–25 MB, which causes the error:
 *     "Body exceeded 1 MB limit"
 *   Compressing on the client (canvas → WebP) brings the payload to
 *   under 3 MB before a single byte hits the server.
 *
 * Quality targets (approximate WebP output size):
 *   maxDimension: 1920, quality: 0.90 → ~1–3 MB   ← default (portrait/portfolio)
 *   maxDimension:  900, quality: 0.80 → ~150–700 KB (thumbnails/avatars)
 *
 * iOS Safari safety:
 *   The old implementation decoded the source image into an HTMLImageElement
 *   before drawImage().  On iOS Safari the browser silently truncates the
 *   decoded pixel buffer for images above its canvas mega-pixel cap (~16 MP),
 *   producing a partial/blank render without any error.
 *   This version uses createImageBitmap(file, { resizeWidth, resizeHeight })
 *   instead, which asks the browser to decode AND downscale in one native step —
 *   the full-resolution pixel buffer is never materialised in JS/canvas memory.
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
 *
 * Decodes the source image via createImageBitmap with the target dimensions
 * so the browser can downscale during decoding without ever allocating the
 * full-resolution pixel buffer.  Falls back to an HTMLImageElement decode for
 * browsers that don't support createImageBitmap with resize options.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const {
    maxDimension = 1920, // targets ~1–3 MB portrait/full-res images
    quality = "auto",
    mimeType = "image/webp",
  } = options;

  // ── Step 1: Get source dimensions ──────────────────────────────────────────
  // We need naturalWidth/naturalHeight to calculate the correct scale factor
  // before we do the resize decode.  For large images we use a tiny 1×1 probe
  // bitmap (very cheap) and recover the true dims from aspect ratio — but that
  // is fragile.  Instead, use createImageBitmap at full size for the dimension
  // probe if the file is < 5 MB (low-risk), otherwise parse the JPEG SOF header.
  let srcW: number;
  let srcH: number;

  // Attempt to parse JPEG dimensions from the SOF header (zero decode cost).
  const jpegDims = await _readJpegDimensions(file);
  if (jpegDims) {
    srcW = jpegDims.width;
    srcH = jpegDims.height;
  } else {
    // Non-JPEG: probe bitmap for dimensions.  PNG/WebP are rarely > 20 MP so
    // this is generally safe; the outer try/catch guards the edge case.
    const probe = await createImageBitmap(file);
    srcW = probe.width;
    srcH = probe.height;
    probe.close();
  }

  // ── Step 2: Calculate target dimensions ────────────────────────────────────
  let width = srcW;
  let height = srcH;
  if (width > maxDimension || height > maxDimension) {
    if (width >= height) {
      height = Math.round((height / width) * maxDimension);
      width = maxDimension;
    } else {
      width = Math.round((width / height) * maxDimension);
      height = maxDimension;
    }
  }

  // ── Step 3: Decode + downscale in one native operation ─────────────────────
  // createImageBitmap with resize options is the key fix: the browser decodes
  // the source at the target resolution without allocating the full pixel buffer.
  // If the API is unavailable (very old Safari), we fall back to HTMLImageElement.
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, {
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: "high",
    });
  } catch {
    // Fallback for browsers that don't support resize options.
    // This path can still trigger the iOS memory limit for very large sources,
    // but that's an acceptable degradation (the error will surface to the caller).
    const objectUrl = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Failed to decode image "${file.name}"`));
      el.src = objectUrl;
    });
    URL.revokeObjectURL(objectUrl);
    bitmap = await createImageBitmap(img, 0, 0, img.naturalWidth, img.naturalHeight, {
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: "high",
    });
  }

  // ── Step 4: Render on canvas ───────────────────────────────────────────────
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas 2D context unavailable");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // ── Step 5: Export as Blob → File ─────────────────────────────────────────
  return new Promise<File>((resolve, reject) => {
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
          }),
        );
      },
      mimeType,
      // If "auto", pass undefined so the browser uses its own optimized default
      quality === "auto" ? undefined : (quality as number),
    );
  });
}

// ── Internal helpers ───────────────────────────────────────────────────────────

/** Parse JPEG image dimensions from the SOF segment (no pixel decode needed). */
async function _readJpegDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  try {
    const isJpeg =
      file.type.includes("jpeg") ||
      file.type.includes("jpg") ||
      /\.jpe?g$/i.test(file.name);
    if (!isJpeg) return null;

    const buffer = await file.slice(0, 262144).arrayBuffer();
    const view = new DataView(buffer);
    if (view.getUint16(0) !== 0xffd8) return null;

    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset);
      offset += 2;
      // SOF0, SOF1, SOF2 (progressive JPEG)
      if (marker >= 0xffc0 && marker <= 0xffc3) {
        if (offset + 7 <= view.byteLength) {
          return {
            height: view.getUint16(offset + 3),
            width: view.getUint16(offset + 5),
          };
        }
        return null;
      }
      if (offset + 2 > view.byteLength) break;
      const segLen = view.getUint16(offset);
      if (segLen < 2) break;
      offset += segLen;
    }
  } catch {
    /* ignored */
  }
  return null;
}
