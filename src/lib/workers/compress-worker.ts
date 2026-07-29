/**
 * src/lib/workers/compress-worker.ts
 * ─────────────────────────────────────────────────────────────────
 * Module Web Worker for M13: off-main-thread image compression using
 * OffscreenCanvas + createImageBitmap.
 *
 * WHY A MODULE WORKER (not a plain script in /public):
 *   The plain-script version (public/compress-worker.js) hand-copied the
 *   pixel-budget logic from canvas-utils.ts and had NO EXIF orientation
 *   fallback at all — meaning browsers where imageOrientation is unsupported
 *   received silently mis-oriented photos via the worker path.
 *
 *   By importing the real shared TypeScript modules here, this worker:
 *     1. Shares one source of truth for computeCanvasDimensions (no drift risk)
 *     2. Shares one source of truth for supportsImageOrientation (no drift risk)
 *     3. Applies the full M05 EXIF orientation fallback via readJpegExifOrientation
 *        + getOrientationTransform — the exact gap that existed in the plain script
 *     4. Shares the same capability-check caching mechanism
 *
 * BUNDLING:
 *   Loaded via: new Worker(new URL('./compress-worker.ts', import.meta.url), { type: 'module' })
 *   Next.js/Turbopack bundles this file as a separate chunk automatically.
 *
 * BROWSER SUPPORT:
 *   ✅ Chrome 80+, Edge 80+, Firefox 114+ — OffscreenCanvas + module workers
 *   ❌ Safari (all versions as of 2025-07) — OffscreenCanvas not supported in workers
 *   Safari falls back to the main-thread path via compressImageWithWorker() in upload.service.ts.
 *
 * PROTOCOL:
 *   → { id: string, file: File, maxSizePx: number, quality: number }
 *   ← { id: string, blob: Blob | null }
 *   ← { id: string, blob: null, error: string }   (on unexpected throw)
 *
 * blob === null signals the main thread to fall back to main-thread compression.
 */

import {
  computeCanvasDimensions,
  fillCanvasWhite,
  isCanvasDrawFailure,
} from "@/lib/utils/canvas-utils";
import {
  supportsImageOrientation,
  readJpegExifOrientation,
  getOrientationTransform,
} from "@/lib/utils/exif-orientation";

const SKIP_COMPRESSION_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB — matches upload.service.ts

/**
 * Core compression function running entirely inside the worker context.
 *
 * Mirrors the main-thread compressImage() in upload.service.ts exactly,
 * including the M05 EXIF orientation fallback:
 *
 *   Primary path:   createImageBitmap(file, { imageOrientation: "from-image" })
 *   Fallback (M05): createImageBitmap(file) + readJpegExifOrientation() + getOrientationTransform()
 *
 * Returns null to signal the main thread to use its own compression path.
 * Never throws — all errors are caught and translated to null.
 */
async function compressInWorker(
  file: File,
  maxSizePx: number,
  quality: number,
): Promise<Blob | null> {
  // ── Capability check (shared, cached) ─────────────────────────────────────
  // supportsImageOrientation() is imported from the real exif-orientation.ts.
  // It caches its result after the first call, so subsequent calls are instant.
  const nativeOrientation = await supportsImageOrientation();

  // ── Phase 1: probe dimensions ──────────────────────────────────────────────
  let probeBitmap: ImageBitmap;
  let exifOrientation = 1; // default: no correction needed

  try {
    if (nativeOrientation) {
      probeBitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } else {
      // M05 Fallback: decode without imageOrientation, read EXIF tag separately
      probeBitmap = await createImageBitmap(file);
      // readJpegExifOrientation imported from exif-orientation.ts — not hand-copied
      exifOrientation = await readJpegExifOrientation(file);
    }
  } catch {
    return null; // Unsupported format or decode failure — main thread handles it
  }

  const srcW = probeBitmap.width;
  const srcH = probeBitmap.height;
  probeBitmap.close(); // release immediately — we only needed the dimensions

  const exceedsFileSize = file.size > SKIP_COMPRESSION_SIZE_BYTES;

  // computeCanvasDimensions imported from canvas-utils.ts — not hand-copied
  const { resizeOptions } = computeCanvasDimensions(srcW, srcH, maxSizePx);

  // Skip if nothing to do (within budget, no orientation correction needed)
  if (resizeOptions === null && !exceedsFileSize && exifOrientation === 1) {
    return null; // Signal: no-op, main thread already has the original file
  }

  // ── Phase 2: decode at target size ────────────────────────────────────────
  let bitmap: ImageBitmap;
  try {
    if (nativeOrientation) {
      bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
        ...(resizeOptions ?? {}),
      });
    } else {
      // M05 Fallback: decode without imageOrientation
      bitmap = await createImageBitmap(file, { ...(resizeOptions ?? {}) });
    }
  } catch {
    return null;
  }

  const drawW = bitmap.width;
  const drawH = bitmap.height;

  // ── Canvas setup — orientation-aware ─────────────────────────────────────
  // getOrientationTransform imported from exif-orientation.ts — not hand-copied
  let canvasW: number;
  let canvasH: number;
  let applyOrientationTransform: ((ctx: OffscreenCanvasRenderingContext2D) => void) | null = null;

  if (!nativeOrientation && exifOrientation !== 1) {
    // M05 Fallback: compute canvas dimensions and transform for this orientation
    const orientTransform = getOrientationTransform(exifOrientation, drawW, drawH);
    canvasW = orientTransform.canvasW;
    canvasH = orientTransform.canvasH;
    // getOrientationTransform returns applyTransform typed for CanvasRenderingContext2D.
    // OffscreenCanvasRenderingContext2D is structurally identical for transform/fillRect/drawImage.
    applyOrientationTransform = orientTransform.applyTransform as unknown as (
      ctx: OffscreenCanvasRenderingContext2D,
    ) => void;
  } else {
    // Primary path: bitmap is already correctly oriented
    canvasW = drawW;
    canvasH = drawH;
  }

  // ── OffscreenCanvas ────────────────────────────────────────────────────────
  let canvas: OffscreenCanvas;
  try {
    canvas = new OffscreenCanvas(canvasW, canvasH);
  } catch {
    bitmap.close();
    return null; // OffscreenCanvas not supported — main thread handles it
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return null;
  }

  // ── White fill (black-canvas fix — shared guard) ─────────────────────────
  fillCanvasWhite(ctx, canvasW, canvasH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (applyOrientationTransform) {
    // M05 Fallback: apply the EXIF rotation matrix before drawing
    (ctx as any).save();
    applyOrientationTransform(ctx);
    ctx.drawImage(bitmap, 0, 0, drawW, drawH);
    (ctx as any).restore();
  } else {
    // Primary path: draw native-oriented bitmap directly
    ctx.drawImage(bitmap, 0, 0, canvasW, canvasH);
  }
  bitmap.close();

  // ── Draw-failure detection (black-canvas detection fix) ───────────────────
  if (isCanvasDrawFailure(ctx, canvasW, canvasH)) {
    return null; // Main thread will use original file
  }

  try {
    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
    return blob ?? null;
  } catch {
    return null;
  }
}

// ── Message handler ───────────────────────────────────────────────────────────
self.onmessage = async (event: MessageEvent) => {
  const { id, file, maxSizePx, quality } = event.data as {
    id: string;
    file: File;
    maxSizePx: number;
    quality: number;
  };

  try {
    const blob = await compressInWorker(file, maxSizePx ?? Infinity, quality ?? 0.92);
    (self as unknown as Worker).postMessage({ id, blob }); // blob may be null — main thread falls back
  } catch (err: any) {
    (self as unknown as Worker).postMessage({
      id,
      blob: null,
      error: err?.message ?? "Worker compression failed",
    });
  }
};
