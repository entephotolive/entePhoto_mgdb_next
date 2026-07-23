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
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fallback safety: if native createImageBitmap fails or is unsupported,
      // return original file unchanged so the server handles orientation/resizing.
      return file;
    }

    const srcW = bitmap.width;
    const srcH = bitmap.height;
    const maxDim = Math.max(srcW, srcH);

    // Skip compression if file is already small (<= 3MB) and under maxDimension
    if (file.size <= SKIP_COMPRESSION_SIZE_BYTES && maxDim <= maxDimension) {
      bitmap.close();
      return file;
    }

    let scale = 1.0;
    if (maxDim > maxDimension) {
      scale = maxDimension / maxDim;
    }

    const aspectRatio = srcW / srcH;
    let targetW = srcW;
    let targetH = srcH;
    if (scale < 1.0) {
      targetW = Math.round(srcW * scale);
      targetH = Math.round(targetW / aspectRatio);
    }

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
        outputQuality,
      );
    });
  } catch {
    return file;
  }
}
