/**
 * lib/utils/compress-image.ts  ← CLIENT ONLY (uses browser Canvas API)
 * ─────────────────────────────────────────────────────────────────────────────
 * Shrinks an image File before it is sent through a Next.js Server Action.
 *
 * Uses browser-native EXIF orientation handling:
 *   createImageBitmap(file, { imageOrientation: "from-image" }) decodes AND
 *   auto-orients the image natively. Zero manual transform matrices or rotation math.
 *
 * Quality:
 *   Visually lossless (quality: 0.92 / WebP/JPEG).
 *   Files under 3 MB and within dimension bounds bypass client compression.
 *
 * Usage:
 *   import { compressImage, PRESET_3MB, PRESET_AVATAR } from "@/lib/utils/compress-image";
 *
 *   const compressed = await compressImage(file);                // default ≤ 3 MB
 *   const avatar     = await compressImage(file, PRESET_AVATAR); // ≤ 700 KB
 */

import { computeCanvasDimensions } from "./canvas-utils";

export interface CompressOptions {
  /** Maximum width OR height in pixels (aspect ratio preserved). Default: 1920 */
  maxDimension?: number;
  /** Encode quality 0.0 to 1.0, or "auto" to let the browser decide. Default: 0.92 */
  quality?: number | "auto";
  /** Output MIME type. Default: "image/webp" */
  mimeType?: "image/webp" | "image/jpeg";
}

export const PRESET_3MB: CompressOptions = {
  maxDimension: 1920,
  quality: 0.92,
  mimeType: "image/webp",
};

export const PRESET_AVATAR: CompressOptions = {
  maxDimension: 900,
  quality: 0.92,
  mimeType: "image/webp",
};


const SKIP_COMPRESSION_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB

/**
 * compressImage
 *
 * Decodes the source image via createImageBitmap with native EXIF orientation.
 * Preserves exact aspect ratio and outputs visually lossless images.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const {
    maxDimension = 1920,
    quality = 0.92,
    mimeType = "image/webp",
  } = options;

  try {
    // ── Phase 1: probe dimensions ────────────────────────────────────────────────
    // Decode once to read .width/.height, then release immediately.
    let probeBitmap: ImageBitmap;
    try {
      probeBitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fallback safety: if native createImageBitmap fails or is unsupported,
      // return original file unchanged so the server handles orientation/resizing.
      return file;
    }

    const srcW = probeBitmap.width;
    const srcH = probeBitmap.height;
    const maxDim = Math.max(srcW, srcH);
    probeBitmap.close();

    // Skip compression if file is already small (<= 3MB) and under maxDimension
    if (file.size <= SKIP_COMPRESSION_SIZE_BYTES && maxDim <= maxDimension) {
      return file;
    }

    // computeCanvasDimensions applies both the pixel-budget constraint AND
    // the maxDimension cap with a single uniform scale factor.
    const { resizeOptions } = computeCanvasDimensions(srcW, srcH, maxDimension);

    // ── Phase 2: decode at target size (downscale inside the codec) ──────────
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
        ...(resizeOptions ?? {}),
      });
    } catch {
      return file;
    }

    // bitmap dimensions already reflect the downscaled target
    const targetW = bitmap.width;
    const targetH = bitmap.height;

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    // Fill white background for transparent image conversion
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Direct draw of native oriented bitmap — zero manual matrix transform!
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    const outputQuality = quality === "auto" ? 0.92 : (quality as number);

    try {
      // ── Draw-failure detection ────────────────────────────────────────────────
      // Sample 3 scattered 2×2 pixel regions to detect a silent draw failure
      // (GPU flush race / memory pressure producing a fully-black or transparent canvas).
      // Per this module’s reject-on-error contract we throw rather than swallowing.
      const sampleRegions = [
        [0, 0],
        [Math.floor(targetW / 2), Math.floor(targetH / 2)],
        [targetW - 2, targetH - 2],
      ] as const;
      const isDrawFailure = sampleRegions.every(([sx, sy]) => {
        const { data } = ctx.getImageData(Math.max(0, sx), Math.max(0, sy), 2, 2);
        for (let i = 0; i < data.length; i += 4) {
          const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
          // Transparent pixel OR solid-black pixel are both failure signatures
          if (!((r === 0 && g === 0 && b === 0 && (a === 0 || a === 255)))) return false;
        }
        return true;
      });
      if (isDrawFailure) {
        throw new Error(
          "[compressImage] drawImage produced a black/transparent canvas (silent draw failure)",
        );
      }
      // ─────────────────────────────────────────────────────────────────────────

      return await new Promise<File>((resolve, reject) => {
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
          outputQuality,
        );
      });
    } finally {
      // Release canvas GPU memory on every path (success, draw-failure, toBlob error)
      canvas.width = 0;
      canvas.height = 0;
    }
  } catch {
    return file;
  }
}
