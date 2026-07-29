/**
 * lib/utils/watermark.ts — cross-platform watermark utility
 *
 * Reworked to use browser-native EXIF handling:
 *  1. createImageBitmap(originalFile, { imageOrientation: "from-image" }) decodes AND
 *     auto-orients the image natively according to its EXIF tag.
 *  2. Zero hand-rolled matrix calculations or manual canvas rotation calls.
 *  3. Preserves aspect ratio exactly when scaling down for canvas limits.
 *  4. Fallback safety: If createImageBitmap fails, returns original file.
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

/**
 * Applies a watermark to an image File and returns a new File.
 *
 * @param originalFile  The original image file
 * @param watermarkSrc  Absolute URL or public path to the watermark PNG
 * @returns             Promise<File> – resolves with watermarked image or falls back to original
 */
export async function applyWatermark(
  originalFile: File,
  watermarkSrc: string,
): Promise<File> {
  try {
    const nativeOrientation = await supportsImageOrientation();

    // ── Phase 1: probe dimensions ────────────────────────────────────────────────
    let probeBitmap: ImageBitmap;
    let exifOrientation = 1;

    try {
      if (nativeOrientation) {
        probeBitmap = await createImageBitmap(originalFile, { imageOrientation: "from-image" });
      } else {
        probeBitmap = await createImageBitmap(originalFile);
        exifOrientation = await readJpegExifOrientation(originalFile);
      }
    } catch {
      return originalFile;
    }

    const srcW = probeBitmap.width;
    const srcH = probeBitmap.height;
    probeBitmap.close();

    // Compute uniform scale so the canvas never exceeds SAFE_CANVAS_MAX_PIXELS,
    // regardless of megapixel count or aspect ratio.
    const { targetW, targetH, resizeOptions } = computeCanvasDimensions(srcW, srcH);

    // Load the watermark image
    const watermark = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => res(el);
      el.onerror = () => rej(new Error("Watermark load failed"));
      el.src = watermarkSrc;
    });

    // ── Phase 2: decode at target size (downscale inside the codec) ───────────
    let imgBitmap: ImageBitmap;
    try {
      if (nativeOrientation) {
        imgBitmap = await createImageBitmap(originalFile, {
          imageOrientation: "from-image",
          ...(resizeOptions ?? {}),
        });
      } else {
        imgBitmap = await createImageBitmap(originalFile, { ...(resizeOptions ?? {}) });
      }
    } catch {
      return originalFile;
    }

    const drawW = imgBitmap.width;
    const drawH = imgBitmap.height;

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
      imgBitmap.close();
      return originalFile;
    }

    // White background for PNG transparency support (must come before drawImage)
    fillCanvasWhite(ctx, canvasW, canvasH);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (applyOrientationTransform) {
      ctx.save();
      applyOrientationTransform(ctx);
      ctx.drawImage(imgBitmap, 0, 0, drawW, drawH);
      ctx.restore();
    } else {
      ctx.drawImage(imgBitmap, 0, 0, canvasW, canvasH);
    }
    imgBitmap.close();

    try {
      if (isCanvasDrawFailure(ctx, canvasW, canvasH)) {
        console.warn("[applyWatermark] drawImage produced a black/transparent canvas – returning original file");
        return originalFile;
      }
      // ─────────────────────────────────────────────────────────────────────────

      // Draw watermark (top-right, 30% of canvas width)
      const wmW = canvasW * 0.30;
      const wmH = (watermark.naturalHeight / watermark.naturalWidth) * wmW;
      const padding = canvasH * 0.05;
      const wmX = canvasW - wmW - padding;
      const wmY = padding;

      ctx.globalAlpha = 1.0;
      ctx.drawImage(watermark, wmX, wmY, wmW, wmH);

      const outputMime = "image/jpeg";
      const outputName = originalFile.name.replace(/\.[^.]+$/, "") + ".jpg";

      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(
          (b) => (b ? res(b) : rej(new Error("toBlob returned null"))),
          outputMime,
          0.92,
        ),
      );

      return new File([blob], outputName, {
        type: outputMime,
        lastModified: Date.now(),
      });
    } finally {
      // Release canvas GPU memory on every path (success, draw-failure, toBlob error)
      canvas.width = 0;
      canvas.height = 0;
    }
  } catch (err) {
    console.warn("[applyWatermark] Falling back to original file:", err);
    return originalFile;
  }
}
