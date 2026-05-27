/**
 * applyWatermark — cross-platform (iOS / Android / Windows / all browsers)
 *
 * Fixes applied:
 *  1. HEIC / unsupported MIME  → always outputs image/jpeg so every browser can
 *     encode the canvas regardless of the original format.
 *  2. iOS canvas mega-pixel cap → downscales the image to ≤ 4 MP before drawing,
 *     then re-scales the canvas back to the original aspect ratio for output.
 *  3. EXIF orientation          → reads the raw bytes to detect the rotation tag
 *     and rotates the canvas accordingly before drawing, so the image is never
 *     sideways on iPhones.
 *  4. Hard failure safety       → any single step that throws falls back to
 *     returning the original file so the upload is never blocked.
 */

/** Maximum canvas pixel count before downscaling (4 Megapixels is safe on iOS). */
const IOS_MAX_PIXELS = 4_000_000;

/** Read EXIF orientation from the raw bytes of a JPEG file (returns 1–8, or 1 if absent). */
async function readExifOrientation(file: File): Promise<number> {
  try {
    // Only JPEG files carry EXIF
    if (!file.type.includes("jpeg") && !file.type.includes("jpg")) return 1;

    const buffer = await file.slice(0, 65536).arrayBuffer(); // first 64 KB is enough
    const view = new DataView(buffer);

    if (view.getUint16(0) !== 0xffd8) return 1; // not a JPEG

    let offset = 2;
    while (offset < view.byteLength) {
      const marker = view.getUint16(offset);
      offset += 2;
      if (marker === 0xffe1) {
        // APP1 – EXIF block
        const len = view.getUint16(offset);
        const exifHeader = view.getUint32(offset + 2);
        if (exifHeader !== 0x45786966) return 1; // "Exif" magic not found

        const tiffOffset = offset + 8; // skip "Exif\0\0"
        const littleEndian = view.getUint16(tiffOffset) === 0x4949;
        const ifdOffset = view.getUint32(tiffOffset + 4, littleEndian);
        const ifdStart = tiffOffset + ifdOffset;
        const entries = view.getUint16(ifdStart, littleEndian);

        for (let i = 0; i < entries; i++) {
          const entryOffset = ifdStart + 2 + i * 12;
          const tag = view.getUint16(entryOffset, littleEndian);
          if (tag === 0x0112) {
            // Orientation tag
            return view.getUint16(entryOffset + 8, littleEndian);
          }
        }
        return 1; // No orientation tag found
      } else if ((marker & 0xff00) !== 0xff00) {
        break; // Not a valid marker
      } else {
        offset += view.getUint16(offset); // skip this segment
      }
    }
  } catch {
    // Silently ignore any parse errors
  }
  return 1;
}

/** Apply EXIF rotation to a canvas context before drawing the image. */
function applyExifRotationTransform(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  canvasWidth: number,
  canvasHeight: number,
) {
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, canvasWidth, 0); break;
    case 3: ctx.transform(-1, 0, 0, -1, canvasWidth, canvasHeight); break;
    case 4: ctx.transform(1, 0, 0, -1, 0, canvasHeight); break;
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
    case 6: ctx.transform(0, 1, -1, 0, canvasHeight, 0); break;
    case 7: ctx.transform(0, -1, -1, 0, canvasWidth, canvasHeight); break;
    case 8: ctx.transform(0, -1, 1, 0, 0, canvasWidth); break;
    default: break; // orientation === 1, no transform needed
  }
}

/**
 * Applies a watermark to an image File and returns a new File.
 *
 * @param originalFile  The original image file (any format the browser can decode)
 * @param watermarkSrc  Absolute URL or public path to the watermark PNG
 * @returns             Promise<File> – always resolves, falls back to original on error
 */
export async function applyWatermark(
  originalFile: File,
  watermarkSrc: string,
): Promise<File> {
  try {
    // ── 1. Read EXIF orientation before creating the blob URL ─────────────
    const exifOrientation = await readExifOrientation(originalFile);

    // ── 2. Load the original image ─────────────────────────────────────────
    const imgObjectUrl = URL.createObjectURL(originalFile);
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = () => rej(new Error("Image load failed"));
      el.src = imgObjectUrl;
    }).finally(() => URL.revokeObjectURL(imgObjectUrl));

    // ── 3. Load the watermark image ────────────────────────────────────────
    const watermark = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => res(el);
      el.onerror = () => rej(new Error("Watermark load failed"));
      el.src = watermarkSrc;
    });

    // ── 4. Calculate dimensions, clamped to iOS-safe pixel count ──────────
    let srcW = img.naturalWidth;
    let srcH = img.naturalHeight;

    // Swap dimensions for 90° / 270° orientations so the canvas is correct
    const isRotated90 = exifOrientation >= 5 && exifOrientation <= 8;
    const drawW = isRotated90 ? srcH : srcW;
    const drawH = isRotated90 ? srcW : srcH;

    // Downscale if the image is above the iOS-safe pixel ceiling
    const totalPixels = drawW * drawH;
    let scale = 1;
    if (totalPixels > IOS_MAX_PIXELS) {
      scale = Math.sqrt(IOS_MAX_PIXELS / totalPixels);
    }

    const canvasW = Math.round(drawW * scale);
    const canvasH = Math.round(drawH * scale);

    // ── 5. Draw onto canvas ────────────────────────────────────────────────
    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2d context");

    // Apply scale so everything fits inside the clamped canvas
    ctx.scale(scale, scale);
    applyExifRotationTransform(ctx, exifOrientation, drawW, drawH);

    // Draw the main image (srcW × srcH) into the transformed space
    ctx.drawImage(img, 0, 0, srcW, srcH);

    // Reset transform before drawing the watermark so it is always top-right
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // ── 6. Draw watermark (top-right, 30% of canvas width) ────────────────
    const wmW = canvasW * 0.30;
    const wmH = (watermark.naturalHeight / watermark.naturalWidth) * wmW;
    const padding = canvasH * 0.05;
    const wmX = canvasW - wmW - padding;
    const wmY = padding;

    ctx.globalAlpha = 1.0;
    ctx.drawImage(watermark, wmX, wmY, wmW, wmH);

    // ── 7. Export as JPEG (universally supported) ──────────────────────────
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
    // Safety net: any failure falls back to uploading the original file
    console.warn("[applyWatermark] Falling back to original file:", err);
    return originalFile;
  }
}
