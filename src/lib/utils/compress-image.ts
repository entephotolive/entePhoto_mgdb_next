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

import {
  computeCanvasDimensions,
  fillCanvasWhite,
  isCanvasDrawFailure,
} from "./canvas-utils";
import {
  supportsImageOrientation,
  readJpegExifOrientation,
  getOrientationTransform,
} from "./exif-orientation";

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
    const nativeOrientation = await supportsImageOrientation();

    // ── Phase 1: probe dimensions ────────────────────────────────────────────────
    let probeBitmap: ImageBitmap;
    let exifOrientation = 1;

    try {
      if (nativeOrientation) {
        probeBitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      } else {
        probeBitmap = await createImageBitmap(file);
        exifOrientation = await readJpegExifOrientation(file);
      }
    } catch {
      return file;
    }

    const srcW = probeBitmap.width;
    const srcH = probeBitmap.height;
    const maxDim = Math.max(srcW, srcH);
    probeBitmap.close();

    // Skip compression if file is already small (<= 3MB), under maxDimension, and no EXIF rotation needed
    if (file.size <= SKIP_COMPRESSION_SIZE_BYTES && maxDim <= maxDimension && exifOrientation === 1) {
      return file;
    }

    // computeCanvasDimensions applies both the pixel-budget constraint AND
    // the maxDimension cap with a single uniform scale factor.
    const { resizeOptions } = computeCanvasDimensions(srcW, srcH, maxDimension);

    // ── Phase 2: decode at target size (downscale inside the codec) ──────────
    let bitmap: ImageBitmap;
    try {
      if (nativeOrientation) {
        bitmap = await createImageBitmap(file, {
          imageOrientation: "from-image",
          ...(resizeOptions ?? {}),
        });
      } else {
        bitmap = await createImageBitmap(file, { ...(resizeOptions ?? {}) });
      }
    } catch {
      return file;
    }

    const drawW = bitmap.width;
    const drawH = bitmap.height;

    // ── Canvas setup — orientation-aware ──────────────────────────────────────
    let canvasW: number;
    let canvasH: number;
    let applyOrientationTransform: ((ctx: CanvasRenderingContext2D) => void) | null = null;

    if (!nativeOrientation && exifOrientation !== 1) {
      const orientTransform = getOrientationTransform(exifOrientation, drawW, drawH);
      canvasW = orientTransform.canvasW;
      canvasH = orientTransform.canvasH;
      applyOrientationTransform = orientTransform.applyTransform;
    } else {
      canvasW = drawW;
      canvasH = drawH;
    }

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    // Fill white background for transparent image conversion
    fillCanvasWhite(ctx, canvasW, canvasH);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (applyOrientationTransform) {
      ctx.save();
      applyOrientationTransform(ctx);
      ctx.drawImage(bitmap, 0, 0, drawW, drawH);
      ctx.restore();
    } else {
      ctx.drawImage(bitmap, 0, 0, canvasW, canvasH);
    }
    bitmap.close();

    const outputQuality = quality === "auto" ? 0.92 : (quality as number);

    try {
      if (isCanvasDrawFailure(ctx, canvasW, canvasH)) {
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
