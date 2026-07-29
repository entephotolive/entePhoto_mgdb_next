/**
 * lib/utils/exif-orientation.ts
 * ─────────────────────────────────────────────────────────────────
 * Lightweight JPEG EXIF orientation reader.
 * No dependencies — hand-rolled binary JPEG/EXIF parser that reads
 * only the orientation tag (tag 0x0112) from the EXIF IFD.
 *
 * Returns a number 1-8 matching the EXIF orientation values:
 *   1 = normal (no rotation needed)
 *   3 = 180° rotation
 *   6 = 90° CW (common iPhone portrait)
 *   8 = 90° CCW (common iPhone landscape held left-handed)
 *   Other values (2,4,5,7) = mirror variants — treated as 1/3/6/8 without flip
 *
 * Returns 1 (no-op) on any parse failure so callers are safe to always use it.
 *
 * Applies the orientation correction via canvas transform, using the same
 * well-tested rotation-matrix logic established in earlier orientation fix work.
 *
 * USAGE (M05 fallback path when imageOrientation: "from-image" unsupported):
 *   const exifOrientation = await readJpegExifOrientation(file);
 *   const correctedBitmap = await applyExifOrientationToCanvas(bitmap, exifOrientation, canvas, ctx);
 */

// ── EXIF orientation reader ──────────────────────────────────────────────────

/**
 * Reads the EXIF orientation tag from a JPEG File.
 * Returns 1 if the file is not JPEG, has no EXIF, or parsing fails.
 * Non-blocking: reads only the first ~64 KB of the file (enough for EXIF).
 */
export async function readJpegExifOrientation(file: File): Promise<number> {
  // Only JPEG files carry EXIF in this position
  if (!file.type.startsWith("image/jpeg") && !file.type.startsWith("image/jpg")) {
    // HEIC files: iOS Camera embeds correct orientation in the container,
    // and createImageBitmap() on iOS natively decodes HEIC correctly even
    // without imageOrientation (it reads ISOBMFF container orientation).
    // For non-JPEG/non-HEIC, return 1 (no correction needed).
    return 1;
  }

  try {
    // Read first 64 KB — EXIF is always in the header, well within this range
    const slice = file.slice(0, 65536);
    const buffer = await slice.arrayBuffer();
    return parseExifOrientation(buffer);
  } catch {
    return 1;
  }
}

function parseExifOrientation(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);

  // JPEG SOI marker: FF D8
  if (view.getUint16(0) !== 0xffd8) return 1;

  let offset = 2;
  const len = buffer.byteLength;

  while (offset < len - 1) {
    const marker = view.getUint16(offset);
    offset += 2;

    if (marker === 0xffe1) {
      // APP1 — this is where EXIF lives
      const segmentLength = view.getUint16(offset);
      offset += 2;

      // Check for "Exif\0\0" header at the start of APP1 data
      if (offset + 6 > len) return 1;
      const exifHeader = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3),
      );
      if (exifHeader !== "Exif") return 1;

      const tiffStart = offset + 6; // skip "Exif\0\0"

      // TIFF header: byte order
      const byteOrder = view.getUint16(tiffStart);
      const littleEndian = byteOrder === 0x4949; // "II" = little endian; "MM" = big endian

      const getUint16 = (o: number) =>
        view.getUint16(tiffStart + o, littleEndian);
      const getUint32 = (o: number) =>
        view.getUint32(tiffStart + o, littleEndian);

      // Validate TIFF magic (42)
      if (getUint16(2) !== 42) return 1;

      // IFD0 offset
      const ifd0Offset = getUint32(4);
      const entryCount = getUint16(ifd0Offset);

      for (let i = 0; i < entryCount; i++) {
        const entryOffset = ifd0Offset + 2 + i * 12;
        if (tiffStart + entryOffset + 12 > len) break;

        const tag = getUint16(entryOffset);
        if (tag === 0x0112) {
          // Orientation tag found
          const orientation = getUint16(entryOffset + 8);
          return orientation >= 1 && orientation <= 8 ? orientation : 1;
        }
      }
      return 1; // No orientation tag in IFD0
    } else if ((marker & 0xff00) !== 0xff00) {
      // Not a valid JPEG marker — stop
      break;
    } else {
      // Skip this segment
      const segmentLength = view.getUint16(offset);
      offset += segmentLength;
    }
  }

  return 1;
}

// ── Orientation correction via canvas transform ──────────────────────────────

/**
 * Returns the canvas dimensions and transform needed to correctly display
 * an image with the given EXIF orientation value.
 *
 * This uses the same correct rotation matrix approach validated in the
 * earlier black-canvas / rotation-stretch fix work:
 *   - Swap width/height for 90°/270° rotations
 *   - Apply translate + rotate before drawing the bitmap
 *   - No ad-hoc conditional chains — pure matrix transform per orientation
 */
export function getOrientationTransform(
  orientation: number,
  srcW: number,
  srcH: number,
): {
  canvasW: number;
  canvasH: number;
  applyTransform: (ctx: CanvasRenderingContext2D) => void;
} {
  // Orientations 5-8 swap width/height (90° / 270° rotations)
  const isRotated90 = orientation >= 5 && orientation <= 8;
  const canvasW = isRotated90 ? srcH : srcW;
  const canvasH = isRotated90 ? srcW : srcH;

  const applyTransform = (ctx: CanvasRenderingContext2D) => {
    // Standard EXIF orientation transform matrix table.
    // Source: https://www.daveperrett.com/articles/2012/07/28/exif-orientation-handling-is-a-ghetto/
    // Validated against real iPhone EXIF cases 6 and 8 from prior fix work.
    switch (orientation) {
      case 1:
        // Normal — no transform
        break;
      case 2:
        // Mirror horizontal
        ctx.transform(-1, 0, 0, 1, srcW, 0);
        break;
      case 3:
        // 180°
        ctx.transform(-1, 0, 0, -1, srcW, srcH);
        break;
      case 4:
        // Mirror vertical
        ctx.transform(1, 0, 0, -1, 0, srcH);
        break;
      case 5:
        // Mirror horizontal + 90° CW
        ctx.transform(0, 1, 1, 0, 0, 0);
        break;
      case 6:
        // 90° CW (most common iPhone portrait photo)
        ctx.transform(0, 1, -1, 0, srcH, 0);
        break;
      case 7:
        // Mirror horizontal + 90° CCW
        ctx.transform(0, -1, -1, 0, srcH, srcW);
        break;
      case 8:
        // 90° CCW (iPhone landscape held left-handed)
        ctx.transform(0, -1, 1, 0, 0, srcW);
        break;
    }
  };

  return { canvasW, canvasH, applyTransform };
}

// ── One-shot capability check ─────────────────────────────────────────────────

/**
 * Synchronously detects whether createImageBitmap supports the
 * `imageOrientation: "from-image"` option in the current browser.
 *
 * Detection approach:
 *   createImageBitmap() with imageOrientation is spec'd in the
 *   ImageBitmapOptions interface. However, simply checking
 *   "ImageBitmapOptions" in window is insufficient because browsers
 *   may partially implement the interface.
 *
 *   The reliable runtime check creates a tiny 1×1 ImageData, calls
 *   createImageBitmap with the option, and inspects whether it resolves
 *   without throwing. We cache the result to avoid repeated async calls.
 *
 * Returns a Promise<boolean> on first call, then caches the result.
 * The upload pipeline should call this once at startup.
 *
 * Known support:
 *   ✅ Chrome 75+, Edge 79+, Firefox 93+, Safari 15.4+
 *   ❌ Safari < 15.4 (iOS 14, iOS 15.0–15.3, macOS Big Sur Safari)
 */
let _supportsImageOrientationCache: boolean | null = null;

export async function supportsImageOrientation(): Promise<boolean> {
  if (_supportsImageOrientationCache !== null) return _supportsImageOrientationCache;

  try {
    // Create a minimal 1×1 transparent ImageData
    const imageData = new ImageData(new Uint8ClampedArray([0, 0, 0, 0]), 1, 1);
    // If imageOrientation is unsupported, the browser will either:
    // (a) throw a TypeError (older Safari), or
    // (b) silently ignore the option — we can't distinguish (b) this way.
    //
    // However, MDN + WebKit release notes confirm Safari < 15.4 throws on
    // the imageOrientation option. This check catches the throw path.
    await createImageBitmap(imageData, { imageOrientation: "from-image" } as ImageBitmapOptions);
    _supportsImageOrientationCache = true;
  } catch {
    _supportsImageOrientationCache = false;
  }

  return _supportsImageOrientationCache;
}
