/**
 * lib/utils/canvas-utils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared canvas pixel-budget utilities used by:
 *   upload.service.ts  · watermark.ts  · compress-image.ts
 *
 * Single source of truth for the maximum safe canvas pixel count and for the
 * dimension-computation logic that keeps every image pipeline within that
 * budget, regardless of megapixel count or aspect ratio.
 */

/**
 * Maximum safe canvas area in pixels.
 *
 * 16 MP is the conservative safe limit that works on:
 *  - iOS Safari on all device tiers (including low-memory iPhone SE)
 *  - Android WebView on mid-range and budget devices
 *  - All desktop browsers
 *
 * Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#maximum_canvas_size
 */
export const SAFE_CANVAS_MAX_PIXELS = 16_000_000;

export interface CanvasDimensions {
  /** Target canvas width (pixels), already rounded to integer */
  targetW: number;
  /** Target canvas height (pixels), already rounded to integer */
  targetH: number;
  /**
   * Ready-to-spread into createImageBitmap options when downscaling is needed,
   * or null when the source already fits within the budget.
   *
   * When non-null, pass as:
   *   createImageBitmap(file, { imageOrientation: "from-image", ...resizeOptions })
   *
   * The browser will downscale *during decode* so the full-resolution buffer is
   * never materialised in memory.
   */
  resizeOptions: Pick<ImageBitmapOptions, "resizeWidth" | "resizeHeight" | "resizeQuality"> | null;
}

/**
 * computeCanvasDimensions
 *
 * Given source dimensions (already post-EXIF-orientation, as reported by an
 * initial createImageBitmap probe) and an optional per-axis max-dimension cap,
 * computes:
 *
 *  1. A single uniform scale factor that satisfies BOTH the pixel-budget
 *     constraint (SAFE_CANVAS_MAX_PIXELS) AND the optional maxSizePx cap.
 *     Scale is always applied identically to both axes — never independently —
 *     so aspect ratio is preserved to floating-point precision.
 *
 *  2. Rounded integer target dimensions.
 *
 *  3. `resizeOptions` suitable for spreading into createImageBitmap so the
 *     browser downscales during decode (a 200 MP raw buffer is never fully
 *     materialised in memory).
 *
 * Returns resizeOptions: null when no downscaling is needed (source already
 * fits within both constraints), so callers can skip the extra decode step.
 *
 * @param srcW      Source image width  (post-EXIF-orientation)
 * @param srcH      Source image height (post-EXIF-orientation)
 * @param maxSizePx Optional maximum of max(width, height) in pixels, e.g. 1920
 */
export function computeCanvasDimensions(
  srcW: number,
  srcH: number,
  maxSizePx = Infinity,
): CanvasDimensions {
  const maxDim = Math.max(srcW, srcH);
  const totalPixels = srcW * srcH;

  // Start at scale = 1.0 (no downscaling) and take the smallest factor that
  // satisfies BOTH constraints simultaneously.
  let scale = 1.0;

  if (Number.isFinite(maxSizePx) && maxDim > maxSizePx) {
    scale = Math.min(scale, maxSizePx / maxDim);
  }

  if (totalPixels > SAFE_CANVAS_MAX_PIXELS) {
    // sqrt() keeps the scale uniform across both axes so AR is preserved exactly.
    scale = Math.min(scale, Math.sqrt(SAFE_CANVAS_MAX_PIXELS / totalPixels));
  }

  if (scale >= 1.0) {
    // Image already fits within budget — no downscaling needed.
    return { targetW: srcW, targetH: srcH, resizeOptions: null };
  }

  // Compute target dimensions.
  // targetH is derived from targetW via the exact aspect ratio (not rounded
  // independently) to avoid a second rounding error accumulating on height.
  const aspectRatio = srcW / srcH;
  let targetW = Math.round(srcW * scale);
  let targetH = Math.round(targetW / aspectRatio);

  // Math.round can cause slight rounding overshoot above SAFE_CANVAS_MAX_PIXELS.
  // Guard against overshoot by clamping targetW down until targetW * targetH <= SAFE_CANVAS_MAX_PIXELS.
  while (targetW * targetH > SAFE_CANVAS_MAX_PIXELS && targetW > 1) {
    targetW--;
    targetH = Math.round(targetW / aspectRatio);
  }

  return {
    targetW,
    targetH,
    resizeOptions: {
      resizeWidth: targetW,
      resizeHeight: targetH,
      resizeQuality: "high",
    },
  };
}

export type AnyCanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Fills the canvas with a solid white background (#ffffff).
 * Must be called before drawImage to support transparent PNG conversion
 * and guard against transparent canvas rendering artifacts.
 */
export function fillCanvasWhite(
  ctx: AnyCanvasContext,
  width: number,
  height: number,
): void {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
}

/**
 * Samples 3 scattered 2×2 pixel regions (top-left, center, bottom-right) to detect
 * silent drawImage failures caused by GPU flush races or memory pressure.
 * Returns true if all sampled pixels are fully transparent (0,0,0,0) or solid black (0,0,0,255).
 */
export function isCanvasDrawFailure(
  ctx: AnyCanvasContext,
  width: number,
  height: number,
): boolean {
  const sampleRegions = [
    [0, 0],
    [Math.floor(width / 2), Math.floor(height / 2)],
    [Math.max(0, width - 2), Math.max(0, height - 2)],
  ] as const;

  return sampleRegions.every(([sx, sy]) => {
    const { data } = ctx.getImageData(Math.max(0, sx), Math.max(0, sy), 2, 2);
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      // Transparent pixel OR solid-black pixel are both failure signatures
      if (!((r === 0 && g === 0 && b === 0 && (a === 0 || a === 255)))) return false;
    }
    return true;
  });
}

