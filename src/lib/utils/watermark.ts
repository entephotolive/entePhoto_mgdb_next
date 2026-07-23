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

const IOS_MAX_PIXELS = 16_000_000;

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
    let imgBitmap: ImageBitmap;
    try {
      imgBitmap = await createImageBitmap(originalFile, { imageOrientation: "from-image" });
    } catch {
      return originalFile;
    }

    const srcW = imgBitmap.width;
    const srcH = imgBitmap.height;
    const totalPixels = srcW * srcH;

    let scale = 1.0;
    if (totalPixels > IOS_MAX_PIXELS) {
      scale = Math.sqrt(IOS_MAX_PIXELS / totalPixels);
    }

    const aspectRatio = srcW / srcH;
    let canvasW = srcW;
    let canvasH = srcH;
    if (scale < 1.0) {
      canvasW = Math.round(srcW * scale);
      canvasH = Math.round(canvasW / aspectRatio);
    }

    // Load the watermark image
    const watermark = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => res(el);
      el.onerror = () => rej(new Error("Watermark load failed"));
      el.src = watermarkSrc;
    });

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      imgBitmap.close();
      return originalFile;
    }

    // Draw main image directly (already oriented natively!)
    ctx.drawImage(imgBitmap, 0, 0, canvasW, canvasH);
    imgBitmap.close();

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
  } catch (err) {
    console.warn("[applyWatermark] Falling back to original file:", err);
    return originalFile;
  }
}
