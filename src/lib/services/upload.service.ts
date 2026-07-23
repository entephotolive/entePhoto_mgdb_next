/**
 * lib/services/upload.service.ts
 * ─────────────────────────────────────────────────────────────────
 * Houses the pure logic for uploading files to Cloudinary and registering
 * them in the database. De-coupled from the React lifecycle so it can
 * run in the background via the Zustand store.
 */

import {
  registerXhr,
  unregisterXhr,
  useUploadStore,
  UploadContext,
  UploadQueueItem,
} from "@/store/upload-store";
import { api } from "@/app/api/api-client";
import { isAllowedFile } from "@/lib/utils/upload-constants";

const DUPLICATE_CHECK_BATCH_SIZE = 100;
const MOBILE_UPLOAD_CONCURRENCY = 2;
const DESKTOP_UPLOAD_CONCURRENCY = 6;

/**
 * Maximum safe canvas area (pixels).
 * 16 MP is safe on all modern browsers including iOS Safari on all device tiers.
 * iOS Safari 15 caps around 16–22 MP depending on available RAM; using 16 MP
 * as a hard ceiling is conservative and reliable.
 */
const SAFE_CANVAS_MAX_PIXELS = 16_000_000;

// ── Image dimension helpers ────────────────────────────────────────

/**
 * Parse the image width/height from the JPEG SOF (Start Of Frame) segment
 * found in the first 256 KB of the file — zero pixel-decoding cost.
 *
 * Returns null for non-JPEG files or if the SOF segment cannot be found;
 * the caller should fall back to a probe-bitmap strategy in that case.
 */
async function readJpegDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  try {
    const isJpeg =
      file.type.includes("jpeg") ||
      file.type.includes("jpg") ||
      /\.jpe?g$/i.test(file.name);
    if (!isJpeg) return null;

    // 256 KB is sufficient to reach the SOF0 segment in virtually every JPEG.
    const buffer = await file.slice(0, 262144).arrayBuffer();
    const view = new DataView(buffer);
    if (view.getUint16(0) !== 0xffd8) return null; // not a JPEG

    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset);
      offset += 2;

      // SOF0 (0xFFC0), SOF1 (0xFFC1), SOF2 (0xFFC2 – progressive JPEG)
      if (marker >= 0xffc0 && marker <= 0xffc3) {
        // SOF payload layout: segLen(2) precision(1) height(2) width(2) …
        if (offset + 7 <= view.byteLength) {
          return {
            height: view.getUint16(offset + 3),
            width: view.getUint16(offset + 5),
          };
        }
        return null;
      }

      // All other segments: skip by the embedded length field.
      if (offset + 2 > view.byteLength) break;
      const segLen = view.getUint16(offset);
      if (segLen < 2) break; // guard against malformed data
      offset += segLen;
    }
  } catch {
    /* silently ignored */
  }
  return null;
}

/** Read EXIF orientation tag from a JPEG/HEIC file (returns 1–8, defaults to 1) */
async function readExifOrientation(file: File): Promise<number> {
  try {
    const isJpeg = file.type.includes("jpeg") || file.type.includes("jpg") || /\.jpe?g$/i.test(file.name);
    if (!isJpeg) return 1;
    const buffer = await file.slice(0, 65536).arrayBuffer();
    const view = new DataView(buffer);
    if (view.getUint16(0) !== 0xffd8) return 1;
    let offset = 2;
    while (offset + 4 < view.byteLength) {
      const marker = view.getUint16(offset); offset += 2;
      if (marker === 0xffe1) {
        if (view.getUint32(offset + 2) !== 0x45786966) return 1;
        const tiffBase = offset + 8;
        const le = view.getUint16(tiffBase) === 0x4949;
        const ifdOffset = view.getUint32(tiffBase + 4, le);
        const ifdStart = tiffBase + ifdOffset;
        if (ifdStart + 2 > view.byteLength) return 1;
        const entries = view.getUint16(ifdStart, le);
        for (let i = 0; i < entries; i++) {
          const e = ifdStart + 2 + i * 12;
          if (e + 12 > view.byteLength) break;
          if (view.getUint16(e, le) === 0x0112) {
            return view.getUint16(e + 8, le);
          }
        }
        return 1;
      } else if ((marker & 0xff00) !== 0xff00) {
        break;
      } else {
        if (offset + 2 > view.byteLength) break;
        offset += view.getUint16(offset);
      }
    }
  } catch { /* silently ignored */ }
  return 1;
}

/**
 * Resize & compress a user-uploaded image using createImageBitmap + Canvas.
 *
 * Key design decisions vs. the old HTMLImageElement approach:
 *
 *  1. createImageBitmap(file, { resizeWidth, resizeHeight }) decodes AND
 *     downscales in a single browser-native step, without ever materialising
 *     the full-resolution pixel buffer in JS/canvas memory.  This is the fix
 *     for the iOS Safari canvas pixel-count limit: a 42 MP source image would
 *     previously cause a silent partial-draw (blank/black region) when decoded
 *     through HTMLImageElement because iOS truncates the decoded bitmap at its
 *     memory ceiling without throwing any error.
 *
 *  2. EXIF orientation correction is applied to the already-downscaled bitmap
 *     via canvas transforms — all matrix maths operates on small numbers
 *     (≤ SAFE_CANVAS_MAX_PIXELS) rather than the original megapixel dimensions.
 *
 *  3. If createImageBitmap throws (very old browser without the API, or device
 *     genuinely OOM), the catch block returns the original file unchanged so
 *     the upload still proceeds — the server-side pipeline handles orientation
 *     correctly for unprocessed files.
 */
async function compressImage(file: File, maxSizePx = Infinity, quality = 0.92): Promise<File> {
  if (!isAllowedFile(file)) return file;

  try {
    const orientation = await readExifOrientation(file);
    const isRotated90 = orientation >= 5 && orientation <= 8;

    // ── Step 1: Determine source pixel dimensions from the file header ────────
    // For JPEG we parse the SOF segment (zero pixel-decode cost).
    // For other formats (PNG, WebP, HEIC) a probe bitmap gives us the dims.
    let srcW: number;
    let srcH: number;

    const jpegDims = await readJpegDimensions(file);
    if (jpegDims) {
      srcW = jpegDims.width;
      srcH = jpegDims.height;
    } else {
      // Non-JPEG: decode at full size just to read dimensions, then close.
      // These formats are rarely > 20 MP so the full decode is generally safe;
      // the outer catch handles the rare case where even this fails.
      const probeBitmap = await createImageBitmap(file);
      srcW = probeBitmap.width;
      srcH = probeBitmap.height;
      probeBitmap.close();
    }

    // ── Step 2: Calculate scale factor ────────────────────────────────────────
    // logicW/logicH represent the post-rotation (visually correct) dimensions.
    const logicW = isRotated90 ? srcH : srcW;
    const logicH = isRotated90 ? srcW : srcH;

    const maxDimScale = Number.isFinite(maxSizePx)
      ? Math.min(1, maxSizePx / Math.max(logicW, logicH))
      : 1;
    const pixelScale = Math.min(
      1,
      Math.sqrt(SAFE_CANVAS_MAX_PIXELS / (logicW * logicH)),
    );
    const scale = Math.min(maxDimScale, pixelScale);

    // Canvas dimensions = post-rotation (logical) dimensions.
    const canvasW = Math.round(logicW * scale);
    const canvasH = Math.round(logicH * scale);

    // Bitmap dimensions = raw file orientation (pre-rotation).
    const bitmapW = Math.round(srcW * scale);
    const bitmapH = Math.round(srcH * scale);

    // ── Step 3: Decode + downscale in one native browser operation ────────────
    // createImageBitmap with resize options decodes the source image at the
    // target resolution internally — it never needs to allocate the full
    // megapixel buffer that a canvas draw from an HTMLImageElement requires.
    const bitmap = await createImageBitmap(file, {
      resizeWidth: bitmapW,
      resizeHeight: bitmapH,
      resizeQuality: "high",
    });

    // ── Step 4: Draw onto canvas with EXIF orientation correction ─────────────
    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    // White background prevents transparent-PNG pixels appearing black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Apply EXIF orientation correction.
    //
    // IMPORTANT: no separate ctx.scale() is used because the bitmap is already
    // at the target dimensions (bitmapW × bitmapH).  All translation constants
    // therefore reference the FINAL CANVAS values, not pre-scale values.
    //
    // For the two cases that were previously broken (6 and 8) — the old code
    // applied ctx.scale() AFTER the rotation transform, causing the combined
    // matrix to have a translation of canvasH where canvasW was needed (case 6)
    // and canvasW where canvasH was needed (case 8), shifting the image off the
    // canvas edge and producing a blank region equal to the difference.
    //
    // Verified transform math (for rotated cases, canvasW = srcH*s = bitmapH,
    //                                                 canvasH = srcW*s = bitmapW):
    //   case 6 (90° CW):   (bx,by) → (canvasW-by, bx)   → transform(0,1,-1,0,canvasW,0)
    //   case 8 (270° CW):  (bx,by) → (by, canvasH-bx)   → transform(0,-1,1,0,0,canvasH)
    switch (orientation) {
      case 2: ctx.transform(-1,  0,  0,  1, canvasW,  0);       break;
      case 3: ctx.transform(-1,  0,  0, -1, canvasW,  canvasH); break;
      case 4: ctx.transform( 1,  0,  0, -1, 0,        canvasH); break;
      case 5: ctx.transform( 0,  1,  1,  0, 0,        0);       break;
      case 6: ctx.transform( 0,  1, -1,  0, canvasW,  0);       break; // ← was canvasH (FIXED)
      case 7: ctx.transform( 0, -1, -1,  0, canvasW,  canvasH); break;
      case 8: ctx.transform( 0, -1,  1,  0, 0,        canvasH); break; // ← was canvasW (FIXED)
      // case 1: identity — no transform needed
    }

    ctx.drawImage(bitmap, 0, 0, bitmapW, bitmapH);
    bitmap.close();

    const outputMime = "image/jpeg";
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, outputMime, quality),
    );

    // Release the canvas backing store immediately.
    canvas.width = 0;
    canvas.height = 0;

    if (!blob) return file;

    const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: outputMime, lastModified: file.lastModified });
  } catch {
    // Any failure (OOM, unsupported API, decode error) → upload original file.
    // The server-side pipeline handles orientation and resizing correctly for
    // unprocessed source files, so the upload is never blocked.
    return file;
  }
}

function getUploadConcurrency() {
  if (typeof window === "undefined") return DESKTOP_UPLOAD_CONCURRENCY;

  const browserNavigator = navigator as Navigator & { deviceMemory?: number };
  const deviceMemory = browserNavigator.deviceMemory ?? Infinity;
  const hardwareConcurrency = browserNavigator.hardwareConcurrency ?? Infinity;
  const isSmallScreen = window.innerWidth < 768;
  const isTouchDevice =
    window.matchMedia?.("(pointer: coarse)").matches ??
    "ontouchstart" in window;

  if (isSmallScreen || isTouchDevice || deviceMemory <= 4 || hardwareConcurrency <= 4) {
    return MOBILE_UPLOAD_CONCURRENCY;
  }

  return DESKTOP_UPLOAD_CONCURRENCY;
}

async function checkDuplicates(eventId: string, filenames: string[]) {
  const duplicateSet = new Set<string>();

  for (let index = 0; index < filenames.length; index += DUPLICATE_CHECK_BATCH_SIZE) {
    const batch = filenames.slice(index, index + DUPLICATE_CHECK_BATCH_SIZE);
    const dupRes = await fetch("/api/photos/check-duplicate", {
      method: "POST",
      body: JSON.stringify({ eventId, filenames: batch }),
      headers: { "Content-Type": "application/json" },
    });

    if (!dupRes.ok) {
      throw new Error(`Duplicate check failed with status ${dupRes.status}`);
    }

    const { duplicates } = await dupRes.json();
    if (Array.isArray(duplicates)) {
      duplicates.forEach((name) => duplicateSet.add(name));
    }
  }

  return duplicateSet;
}

async function uploadSingleItem(item: UploadQueueItem, context: UploadContext) {
  useUploadStore.getState()._setCurrentFileName(item.file.name);
  useUploadStore.getState()._updateItem(item.id, { status: "uploading", progress: 0, error: undefined });

  const maxAttempts = 3;
  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxAttempts) {
    attempt++;
    const itemController = new AbortController();
    registerXhr(item.id, { abort: () => itemController.abort() } as any);

    try {
      const fileToUpload = await compressImage(item.file);

      const formData = new FormData();
      formData.append("event_id", String(context.eventId));
      formData.append("images", fileToUpload);
      if (context.uploadedBy) {
        formData.append("uploadedBy", String(context.uploadedBy));
      }
      if (context.folderId) {
        formData.append("folder_id", context.folderId);
      }

      const response = await api.post("api/upload-images/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        signal: itemController.signal,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.lengthComputable && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            useUploadStore.getState()._updateItem(item.id, { progress });
          }
        },
      });

      const responseData = response.data;
      if (responseData && responseData.images_not_uploaded > 0) {
        const expectedName = item.file.name.replace(/\.[^/.]+$/, "") + ".jpg";
        const reasonObj =
          responseData.reason_why_not_uploaded?.find((r: any) => r.filename === expectedName) ||
          responseData.reason_why_not_uploaded?.[0];
        throw new Error(reasonObj?.reason || "Image not uploaded");
      }

      useUploadStore.getState()._updateItem(item.id, { status: "completed", progress: 100 });
      return { ok: true as const };
    } catch (error: any) {
      lastError = error;
      console.error(`Upload Attempt ${attempt}/${maxAttempts} Error for ${item.file.name}:`, error);
      const isCancelled = error?.name === "CanceledError" || error?.message === "canceled";

      if (isCancelled) {
        useUploadStore.getState()._updateItem(item.id, {
          status: "failed",
          progress: 0,
          error: "Cancelled",
        });
        return { ok: false as const, cancelled: true as const };
      }

      if (attempt < maxAttempts) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise((res) => setTimeout(res, backoffMs));
      }
    } finally {
      unregisterXhr(item.id);
    }
  }

  useUploadStore.getState()._updateItem(item.id, {
    status: "failed",
    progress: 0,
    error: lastError?.response?.data?.detail || lastError?.message || "Upload failed after retries",
  });
  return { ok: false as const, cancelled: false as const };
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  let currentIndex = 0;

  async function runWorker() {
    while (currentIndex < items.length) {
      const item = items[currentIndex];
      currentIndex += 1;
      await worker(item);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()),
  );
}

export async function processUploadQueue(context: UploadContext) {
  const store = useUploadStore.getState();
  if (store.isUploading || store.items.length === 0) return;

  const toUpload = store.items.filter(
    (i) => i.status === "queued" || i.status === "failed",
  );
  if (toUpload.length === 0) return;

  store._setUploading(true);
  store._setStatus("uploading");
  store.setWidgetVisible(true);

  try {
    const filenames = toUpload.map((i) => i.file.name.replace(/\.[^/.]+$/, "") + ".jpg");
    const duplicateSet = await checkDuplicates(context.eventId, filenames);

    if (duplicateSet.size > 0) {
      toUpload.forEach((item) => {
        const expectedName = item.file.name.replace(/\.[^/.]+$/, "") + ".jpg";
        if (duplicateSet.has(expectedName)) {
          useUploadStore.getState()._updateItem(item.id, {
            status: "duplicate",
            error: "File already exists",
            progress: 0,
          });
        }
      });
    }
  } catch (err) {
    console.error("Duplicate check failed", err);
  }

  const finalToUpload = toUpload.filter((item) => {
    const stateItem = useUploadStore.getState().items.find((i) => i.id === item.id);
    return stateItem && stateItem.status !== "duplicate";
  });

  if (finalToUpload.length === 0) {
    const finalStore = useUploadStore.getState();
    finalStore._setUploading(false);
    finalStore._setCurrentFileName("");
    if (
      finalStore.items.filter(
        (i) => i.status === "queued" || i.status === "uploading",
      ).length === 0
    ) {
      finalStore._setStatus("success");
    } else {
      finalStore._setStatus("idle");
    }
    return;
  }

  let hasFailures = false;
  const concurrency = getUploadConcurrency();

  await runWithConcurrency(finalToUpload, concurrency, async (item) => {
    const result = await uploadSingleItem(item, context);
    if (!result.ok && !result.cancelled) {
      hasFailures = true;
    }
  });

  const finalStore = useUploadStore.getState();
  finalStore._setUploading(false);
  finalStore._setCurrentFileName("");

  if (
    finalStore.items.filter(
      (i) => i.status === "queued" || i.status === "uploading",
    ).length === 0
  ) {
    finalStore._setStatus(hasFailures ? "partial" : "success");
  } else {
    finalStore._setStatus("idle");
  }
}
