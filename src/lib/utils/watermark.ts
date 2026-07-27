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
import { computeCanvasDimensions } from "./canvas-utils";

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
    // ── Phase 1: probe dimensions ────────────────────────────────────────────────
    // Decode once (no resize) to get post-EXIF-orientation dimensions only;
    // the bitmap is released immediately after reading .width/.height.
    let probeBitmap: ImageBitmap;
    try {
      probeBitmap = await createImageBitmap(originalFile, { imageOrientation: "from-image" });
    } catch {
      return originalFile;
    }

    const srcW = probeBitmap.width;
    const srcH = probeBitmap.height;
    probeBitmap.close();

    // Compute uniform scale so the canvas never exceeds SAFE_CANVAS_MAX_PIXELS,
    // regardless of megapixel count or aspect ratio.
    const { targetW, targetH, resizeOptions } = computeCanvasDimensions(srcW, srcH);
    const canvasW = targetW;
    const canvasH = targetH;

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
      imgBitmap = await createImageBitmap(originalFile, {
        imageOrientation: "from-image",
        ...(resizeOptions ?? {}),
      });
    } catch {
      return originalFile;
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
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Draw main image directly (already oriented natively!)
    ctx.drawImage(imgBitmap, 0, 0, canvasW, canvasH);
    imgBitmap.close();

    try {
      // ── Draw-failure detection ────────────────────────────────────────────────
      // Sample 3 scattered 2×2 regions. A draw failure (GPU flush race, memory
      // pressure) leaves the entire canvas black or transparent — even though
      // fillRect ran, a failed drawImage overwrites it with zeros.
      const sampleRegions = [
        [0, 0],
        [Math.floor(canvasW / 2), Math.floor(canvasH / 2)],
        [canvasW - 2, canvasH - 2],
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
