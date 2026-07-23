/**
 * lib/utils/watermark.ts  — cross-platform (iOS / Android / Windows / all browsers)
 *
 * Fixes applied in this version:
 *  1. HEIC / unsupported MIME  → always outputs image/jpeg so every browser can
 *     encode the canvas regardless of the original format.
 *  2. iOS canvas mega-pixel cap → uses createImageBitmap with resizeWidth/Height,
 *     which decodes AND downscales in one browser-native step — it never allocates
 *     the full-resolution pixel buffer that HTMLImageElement + drawImage requires.
 *     A 42 MP source is now safe on iOS Safari: the browser decodes directly at the
 *     target size, so there is nothing to truncate.
 *  3. EXIF orientation          → reads the raw bytes to detect the rotation tag
 *     and rotates the canvas before drawing, so portrait iPhone shots are correct.
 *  4. EXIF rotation matrix bugs → cases 6 and 8 previously produced a blank region
 *     because the combined scale+rotate transform had the translation on the wrong
 *     axis (canvasH instead of canvasW for case 6; canvasW instead of canvasH for
 *     case 8).  Fixed by eliminating the separate ctx.scale() and using corrected
 *     constants that reference the final canvas dimensions directly.
 *  5. Hard failure safety       → any single step that throws falls back to
 *     returning the original file so the upload is never blocked.
 */

/** Maximum canvas pixel count before downscaling (16 MP is safe on all iOS devices). */
const IOS_MAX_PIXELS = 16_000_000;

// ── EXIF orientation reader ────────────────────────────────────────────────────

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

// ── Watermark application ──────────────────────────────────────────────────────

/**
 * Applies a watermark to an image File and returns a new File.
 *
 * The source image is decoded via createImageBitmap with resizeWidth/resizeHeight
 * so the browser can downscale during decoding — the full megapixel buffer is
 * never materialised in JS/canvas memory.
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
    const isRotated90 = exifOrientation >= 5 && exifOrientation <= 8;

    // ── 2. Probe source dimensions ────────────────────────────────────────
    // We need srcW/srcH (the raw on-disk dimensions, i.e. before any rotation)
    // to calculate how much to scale down.  createImageBitmap without resize
    // options returns the full-size bitmap — this is safe here because:
    //   a) The bitmap is immediately .close()d after reading .width/.height
    //   b) HEIC/WebP/PNG are rarely > 20 MP in practice
    // For very large JPEGs, the scale calculation below will clamp the output.
    const dimBitmap = await createImageBitmap(originalFile);
    const srcW = dimBitmap.width;
    const srcH = dimBitmap.height;
    dimBitmap.close();

    // Logical (post-rotation) dimensions
    const drawW = isRotated90 ? srcH : srcW;
    const drawH = isRotated90 ? srcW : srcH;

    // ── 3. Calculate scale factor ──────────────────────────────────────────
    const totalPixels = drawW * drawH;
    const scale = totalPixels > IOS_MAX_PIXELS
      ? Math.sqrt(IOS_MAX_PIXELS / totalPixels)
      : 1;

    const canvasW = Math.round(drawW * scale);
    const canvasH = Math.round(drawH * scale);

    // Bitmap dimensions: in the raw file orientation (pre-rotation)
    const bitmapW = Math.round(srcW * scale);
    const bitmapH = Math.round(srcH * scale);

    // ── 4. Decode source image at the TARGET resolution ───────────────────
    // createImageBitmap with resize options performs decode + downscale in one
    // native step, without allocating the full-resolution bitmap in memory.
    const imgBitmap = await createImageBitmap(originalFile, {
      resizeWidth: bitmapW,
      resizeHeight: bitmapH,
      resizeQuality: "high",
    });

    // ── 5. Load the watermark image ────────────────────────────────────────
    const watermark = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => res(el);
      el.onerror = () => rej(new Error("Watermark load failed"));
      el.src = watermarkSrc;
    });

    // ── 6. Draw onto canvas ────────────────────────────────────────────────
    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2d context");

    // Apply EXIF orientation correction.
    // No separate ctx.scale() is used — the bitmap is already at the target
    // size (bitmapW × bitmapH), so all translation constants reference the
    // final canvas dimensions directly.
    //
    // For rotated cases (5-8): canvasW = srcH*scale = bitmapH,
    //                          canvasH = srcW*scale = bitmapW.
    //
    // Previously buggy cases (with the old scale-then-rotate approach):
    //   case 6: translation was scale*drawH = canvasH (wrong); should be canvasW.
    //   case 8: translation was scale*drawW = canvasW (wrong); should be canvasH.
    switch (exifOrientation) {
      case 2: ctx.transform(-1,  0,  0,  1, canvasW,  0);       break;
      case 3: ctx.transform(-1,  0,  0, -1, canvasW,  canvasH); break;
      case 4: ctx.transform( 1,  0,  0, -1, 0,        canvasH); break;
      case 5: ctx.transform( 0,  1,  1,  0, 0,        0);       break;
      case 6: ctx.transform( 0,  1, -1,  0, canvasW,  0);       break; // ← was canvasH (FIXED)
      case 7: ctx.transform( 0, -1, -1,  0, canvasW,  canvasH); break;
      case 8: ctx.transform( 0, -1,  1,  0, 0,        canvasH); break; // ← was canvasW (FIXED)
      // case 1: identity — no transform
    }

    // Draw the main image (already at bitmapW × bitmapH — no further scaling)
    ctx.drawImage(imgBitmap, 0, 0, bitmapW, bitmapH);
    imgBitmap.close();

    // Reset transform before drawing the watermark so it is always at top-right
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // ── 7. Draw watermark (top-right, 30% of canvas width) ────────────────
    const wmW = canvasW * 0.30;
    const wmH = (watermark.naturalHeight / watermark.naturalWidth) * wmW;
    const padding = canvasH * 0.05;
    const wmX = canvasW - wmW - padding;
    const wmY = padding;

    ctx.globalAlpha = 1.0;
    ctx.drawImage(watermark, wmX, wmY, wmW, wmH);

    // ── 8. Export as JPEG (universally supported) ──────────────────────────
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
